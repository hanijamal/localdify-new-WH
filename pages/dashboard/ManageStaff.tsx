import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from '../../hooks/useBusiness';
import { useLanguage } from '../../hooks/useLanguage';
import Spinner from '../../components/ui/Spinner';
import Card, { CardContent, CardHeader, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Dropdown, { DropdownItem } from '../../components/ui/Dropdown';
import StaffModal from '../../components/StaffModal';
import { StaffMember } from '../../types';
import { deleteStaffMember } from '../../services/supabaseService';
import { useAuth } from '../../hooks/useAuth';

const ManageStaff: React.FC = () => {
    const { user } = useAuth();
    const { allStaff, services, loading, deleteStaffContext, plans } = useBusiness();
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
    const [editingStaffMember, setEditingStaffMember] = useState<StaffMember | null>(null);

    const serviceMap = useMemo(() => new Map(services.map(s => [s.id, s.name])), [services]);

    const filteredStaff = useMemo(() => {
        return allStaff.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [allStaff, searchTerm]);
    
    const currentPlan = useMemo(() => {
        if (!user?.subscriptionPlan) return null;
        return plans.find(p => p.name === user.subscriptionPlan);
    }, [plans, user]);

    const staffLimit = currentPlan?.staff_limit;
    const limitReached = useMemo(() => {
        if (staffLimit === undefined || staffLimit === null) return false;
        // 999 is used as a proxy for "unlimited" in some plans
        if (staffLimit >= 999) return false;
        return allStaff.length >= staffLimit;
    }, [allStaff.length, staffLimit]);


    const handleAddStaff = () => {
        if (limitReached) return;
        setEditingStaffMember(null);
        setIsStaffModalOpen(true);
    };

    const handleEditStaff = (staffMember: StaffMember) => {
        setEditingStaffMember(staffMember);
        setIsStaffModalOpen(true);
    };

    const handleDeleteStaff = async (staffId: string) => {
        if (window.confirm(t('deleteStaffConfirm'))) {
            try {
                await deleteStaffMember(staffId);
                deleteStaffContext(staffId);
            } catch (error: any) {
                console.error("Failed to delete staff member:", error.message);
                alert(error.message);
            }
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }
    
    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="w-full sm:w-auto">
                            <Input
                                type="search"
                                placeholder={t('searchStaffPlaceholder')}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <Button onClick={handleAddStaff} disabled={limitReached} className="flex-shrink-0 w-full sm:w-auto">{t('addStaffMember')}</Button>
                    </div>
                </CardHeader>
                 {limitReached && (
                    <div className="p-4 border-b border-border bg-yellow-50 dark:bg-yellow-500/10 text-center">
                        <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">{t('limitReachedTitle', { item: t('staffMembers') })}</h3>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">{t('limitReachedDesc', { limit: staffLimit, item: t('staffMembers').toLowerCase() })}</p>
                        <Link to="/dashboard/billing">
                            <Button size="sm" className="mt-2">{t('upgradePlan')}</Button>
                        </Link>
                    </div>
                )}
                <CardContent className="p-0">
                    {/* Desktop Table View */}
                    <div className="overflow-x-auto hidden md:block">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">{t('staffHeader')}</th>
                                    <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">{t('servicesProvidedLabel')}</th>
                                    <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase">{t('workingHours')}</th>
                                    <th className="px-6 py-3 text-end text-xs font-medium text-muted-foreground uppercase">{t('actionsHeader')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {filteredStaff.length > 0 ? filteredStaff.map(member => (
                                    <tr key={member.id} className="hover:bg-accent transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                <img src={member.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} alt={member.name} className="w-10 h-10 object-cover rounded-full"/>
                                                <div>
                                                    <div className="text-sm font-medium text-foreground">{member.name}</div>
                                                    <div className="text-xs text-muted-foreground">{member.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-normal max-w-sm">
                                            <div className="flex flex-wrap gap-1">
                                                {(member.serviceIds && member.serviceIds.length > 0) ? member.serviceIds.map(id => (
                                                    <span key={id} className="px-2 py-0.5 text-xs bg-accent text-accent-foreground rounded-full">
                                                        {serviceMap.get(id) || '...'}
                                                    </span>
                                                )) : <span className="text-xs text-muted-foreground italic">{t('noServicesAssigned')}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {member.workingHours?.start} - {member.workingHours?.end}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                                            <Dropdown trigger={<Button variant="ghost" size="sm" className="p-2 h-auto">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                            </Button>}>
                                                <DropdownItem onClick={() => handleEditStaff(member)}>{t('editAction')}</DropdownItem>
                                                <DropdownItem onClick={() => handleDeleteStaff(member.id)} className="text-destructive hover:bg-destructive/10">{t('deleteAction')}</DropdownItem>
                                            </Dropdown>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={4} className="text-center p-8 text-muted-foreground">{t('noStaffFound')}</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                     {/* Mobile Card View */}
                    <div className="md:hidden p-4 space-y-4">
                        {filteredStaff.length > 0 ? filteredStaff.map(member => (
                            <Card key={member.id}>
                                <CardHeader className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <img src={member.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`} alt={member.name} className="w-12 h-12 object-cover rounded-full"/>
                                        <div>
                                            <p className="font-semibold text-foreground">{member.name}</p>
                                            <p className="text-sm text-muted-foreground">{member.email}</p>
                                        </div>
                                    </div>
                                    <Dropdown trigger={<Button variant="ghost" size="sm" className="p-2 h-auto">...</Button>}>
                                        <DropdownItem onClick={() => handleEditStaff(member)}>{t('editAction')}</DropdownItem>
                                        <DropdownItem onClick={() => handleDeleteStaff(member.id)} className="text-destructive">{t('deleteAction')}</DropdownItem>
                                    </Dropdown>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">{t('servicesProvidedLabel')}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {(member.serviceIds && member.serviceIds.length > 0) ? member.serviceIds.map(id => (
                                                <span key={id} className="px-2 py-0.5 text-xs bg-accent text-accent-foreground rounded-full">
                                                    {serviceMap.get(id) || '...'}
                                                </span>
                                            )) : <p className="text-xs text-muted-foreground italic">{t('noServicesAssigned')}</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground">{t('workingHours')}</p>
                                        <p className="text-sm text-foreground">{member.workingHours?.start} - {member.workingHours?.end}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )) : (
                            <div className="text-center py-10 text-muted-foreground">
                                {t('noStaffFound')}
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground">{t('foundUsers', { count: filteredStaff.length, total: allStaff.length })}</p>
                </CardFooter>
            </Card>
            <StaffModal isOpen={isStaffModalOpen} onClose={() => setIsStaffModalOpen(false)} staffMember={editingStaffMember} />
        </>
    );
};

export default ManageStaff;
