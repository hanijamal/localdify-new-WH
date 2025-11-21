
import React, { useState, useMemo } from 'react';
import Card, { CardContent, CardHeader, CardFooter } from '../../components/ui/Card';
import { useAdmin } from '../../hooks/useAdmin';
import StatCard from '../../components/ui/StatCard';
import Spinner from '../../components/ui/Spinner';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { User } from '../../types';
import Dropdown, { DropdownItem } from '../../components/ui/Dropdown';
import UserModal from '../../components/UserModal';
import { useLanguage } from '../../hooks/useLanguage';

const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const StatusBadge: React.FC<{ status?: 'active' | 'suspended' }> = ({ status }) => {
    const { t } = useLanguage();
    const baseClasses = "px-2.5 py-0.5 text-xs font-medium leading-5 rounded-full inline-block";
    const statusMap = {
        active: { text: t('activeBadge'), classes: 'bg-green-400/20 text-green-500' },
        suspended: { text: t('suspendedStatus'), classes: 'bg-yellow-400/20 text-yellow-500' }
    };
    const currentStatus = status && statusMap[status] ? statusMap[status] : { text: 'Unknown', classes: 'bg-gray-400/20 text-gray-500' };

    return (
        <span className={`${baseClasses} ${currentStatus.classes}`}>
            {currentStatus.text}
        </span>
    );
};

const AdminDashboard: React.FC = () => {
    const { stats, users, plans, loading, error, deleteUser, updateUser } = useAdmin();
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);


    const handleAddUser = () => {
        setEditingUser(null);
        setIsUserModalOpen(true);
    };

    const handleEditUser = (user: User) => {
        setEditingUser(user);
        setIsUserModalOpen(true);
    };
    
    const handleDeleteUser = async (userId: string) => {
        if (window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) {
            try {
                await deleteUser(userId);
            } catch (err: any) {
                const errorMessage = err.context?.error || err.message || 'An unexpected error occurred.';
                alert(`Failed to delete user: ${errorMessage}`);
            }
        }
    };

    const handleToggleSuspendUser = async (user: User) => {
        const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
        const action = newStatus === 'suspended' ? 'suspend' : 'activate';
        if (window.confirm(`Are you sure you want to ${action} this user?`)) {
            try {
                await updateUser(user.id, { status: newStatus });
            } catch (err: any) {
                const errorMessage = err.context?.error || err.message || 'An unexpected error occurred.';
                alert(`Failed to update status: ${errorMessage}`);
            }
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(user =>
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.businessName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    if (error) {
        return <p className="text-destructive">Error loading dashboard: {error}</p>;
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-3xl font-bold text-foreground">{t('adminDashboard')}</h1>
                    <Button onClick={handleAddUser}>{t('addUserTitle')}</Button>
                </div>
                
                <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                    <StatCard title={t('totalUsers')} value={stats?.totalUsers.toString() ?? '0'} />
                    <StatCard title={t('totalBusinesses')} value={stats?.totalBusinesses.toString() ?? '0'} />
                    <StatCard title={t('totalBookings')} value={stats?.totalBookings.toString() ?? '0'} />
                </div>

                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                             <div>
                                <h2 className="text-xl font-semibold">{t('userManagement')}</h2>
                                <p className="text-sm text-muted-foreground">{t('userManagementDesc')}</p>
                            </div>
                            <Input
                                type="search"
                                placeholder={t('searchUsersPlaceholder')}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full sm:w-72"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('userHeader')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('businessHeader')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('whatsappHeader')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('bookingsHeader')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('emailMessagesHeader')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('whatsappMessagesHeader')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('subscriptionHeader')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('trialEndsHeader')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('statusHeader')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('joinedHeader')}</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('actionsHeader')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                    {filteredUsers.map(user => (
                                        <tr key={user.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-foreground">{user.name}</div>
                                                <div className="text-xs text-muted-foreground">{user.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{user.businessName || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{user.whatsappNumber || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-muted-foreground">{user.totalBookings ?? 0}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-muted-foreground">{user.emailMessagesSent ?? 0}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-muted-foreground">{user.whatsappMessagesSent ?? 0}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground capitalize">{user.subscriptionStatus}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate(user.trialEndsAt)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={user.status} /></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{formatDate(user.createdAt)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Dropdown
                                                    trigger={
                                                        <button className="p-2 text-muted-foreground rounded-full hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-background" aria-label="User actions">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                            </svg>
                                                        </button>
                                                    }
                                                >
                                                    <DropdownItem onClick={() => handleEditUser(user)}>{t('editAction')}</DropdownItem>
                                                    <DropdownItem onClick={() => handleToggleSuspendUser(user)}>
                                                        {user.status === 'suspended' ? t('activateAction') : t('suspendAction')}
                                                    </DropdownItem>
                                                    <DropdownItem onClick={() => handleDeleteUser(user.id)} className="text-destructive hover:bg-destructive/10">
                                                        {t('deleteAction')}
                                                    </DropdownItem>
                                                </Dropdown>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                    <CardFooter>
                         <p className="text-xs text-muted-foreground">{t('foundUsers', { count: filteredUsers.length, total: users.length })}</p>
                    </CardFooter>
                </Card>
            </div>
            
            <UserModal 
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                user={editingUser}
                plans={plans}
            />
        </>
    );
};

export default AdminDashboard;
