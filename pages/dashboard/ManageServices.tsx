
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from '../../hooks/useBusiness';
import { useLanguage } from '../../hooks/useLanguage';
import Spinner from '../../components/ui/Spinner';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import ServiceModal from '../../components/ServiceModal';
import { Service, ServiceCategory } from '../../types';
import { deleteService, addCategory as addCategoryApi, updateCategory as updateCategoryApi, deleteCategory as deleteCategoryApi, addService, updateService } from '../../services/supabaseService';
import { formatPrice, formatDuration } from '../../contexts/BusinessContext';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../hooks/useAuth';

const CategoryManager: React.FC<{
    categories: ServiceCategory[],
    onAdd: (name: string) => Promise<void>,
    onUpdate: (id: string, name: string) => Promise<void>,
    onDelete: (id: string) => Promise<void>
}> = ({ categories, onAdd, onUpdate, onDelete }) => {
    const { t } = useLanguage();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
    const [updatedName, setUpdatedName] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;
        setIsAdding(true);
        await onAdd(newCategoryName);
        setNewCategoryName('');
        setIsAdding(false);
    };

    const handleUpdate = async () => {
        if (!editingCategory || !updatedName.trim()) return;
        setIsUpdating(true);
        await onUpdate(editingCategory.id, updatedName);
        setEditingCategory(null);
        setUpdatedName('');
        setIsUpdating(false);
    };
    
    return (
        <Card>
            <CardHeader>
                <h3 className="text-lg font.semibold">{t('manageCategories')}</h3>
            </CardHeader>
            <CardContent className="space-y-4">
                <form onSubmit={handleAdd} className="flex items-center gap-2">
                    <Input 
                        placeholder={t('newCategoryNamePlaceholder')}
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        className="flex-grow"
                    />
                    <Button type="submit" isLoading={isAdding}>{t('addButton')}</Button>
                </form>
                <div className="space-y-2">
                    {categories.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                            <span className="text-sm font.medium text-foreground">{cat.name}</span>
                            <div className="flex items-center">
                                <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={() => { setEditingCategory(cat); setUpdatedName(cat.name); }}>{t('editAction')}</Button>
                                <Button variant="ghost" size="sm" className="p-1 h-auto text-destructive" onClick={() => onDelete(cat.id)}>{t('deleteAction')}</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
            <Modal isOpen={!!editingCategory} onClose={() => setEditingCategory(null)} title={t('editCategoryNameTitle')}>
                <div className="p-6 space-y-4">
                    <Input label={t('categoryNameLabel')} value={updatedName} onChange={e => setUpdatedName(e.target.value)} />
                </div>
                <div className="p-4 bg-muted/50 border-t flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setEditingCategory(null)}>{t('cancelButton')}</Button>
                    <Button onClick={handleUpdate} isLoading={isUpdating}>{t('saveChangesButton')}</Button>
                </div>
            </Modal>
        </Card>
    );
};


const ManageServices: React.FC = () => {
    const { user } = useAuth();
    const { business, allServices, categories, loading, deleteServiceContext, addCategoryContext, updateCategoryContext, deleteCategoryContext, addServiceContext, updateServiceContext, plans } = useBusiness();
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [isSubmittingService, setIsSubmittingService] = useState(false);

    const filteredServices = useMemo(() => {
        return allServices.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [allServices, searchTerm]);

    const servicesByCategory = useMemo(() => {
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));
        const grouped: { categoryId: string | null; categoryName: string; services: Service[] }[] = [];
        
        const uncategorized = { categoryId: null, categoryName: 'Uncategorized', services: [] as Service[] };

        filteredServices.forEach(service => {
            if (service.categoryId && categoryMap.has(service.categoryId)) {
                let group = grouped.find(g => g.categoryId === service.categoryId);
                if (!group) {
                    group = { categoryId: service.categoryId, categoryName: categoryMap.get(service.categoryId)!, services: [] };
                    grouped.push(group);
                }
                group.services.push(service);
            } else {
                uncategorized.services.push(service);
            }
        });

        grouped.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
        if(uncategorized.services.length > 0) {
            grouped.push(uncategorized);
        }

        return grouped;

    }, [filteredServices, categories]);
    
    const currentPlan = useMemo(() => {
        if (!user?.subscriptionPlan) return null;
        return plans.find(p => p.name === user.subscriptionPlan);
    }, [plans, user]);

    const servicesLimit = currentPlan?.services_limit;
    const limitReached = useMemo(() => {
        if (servicesLimit === undefined || servicesLimit === null) return false;
        if (servicesLimit >= 999) return false;
        return allServices.length >= servicesLimit;
    }, [allServices.length, servicesLimit]);

    const handleAddService = () => {
        if (limitReached) return;
        setEditingService(null);
        setIsServiceModalOpen(true);
    };

    const handleEditService = (service: Service) => {
        setEditingService(service);
        setIsServiceModalOpen(true);
    };

    const handleDeleteService = async (serviceId: string) => {
        if (window.confirm(t('deleteServiceConfirm'))) {
            try {
                await deleteService(serviceId);
                deleteServiceContext(serviceId);
            } catch (error: unknown) {
                // FIX: The `error` variable is of type `unknown` and cannot be passed to `alert`, which expects a string. This converts the error to a string before alerting.
                const message = error instanceof Error ? error.message : String(error);
                console.error("Failed to delete service:", message);
                alert(message);
            }
        }
    };

    const handleAddCategory = async (name: string) => {
        if (!business) return;
        try {
            const newCategory = await addCategoryApi({ businessId: business.id, name });
            addCategoryContext(newCategory);
        } catch(e: unknown) {
            // FIX: The 'e' variable is of type 'unknown' and cannot be passed to `alert`, which expects a string. This converts the error to a string before alerting.
            const message = e instanceof Error ? e.message : String(e);
            alert(`Error adding category: ${message}`);
        }
    };

    const handleUpdateCategory = async (id: string, name: string) => {
        try {
            const updated = await updateCategoryApi(id, { name });
            updateCategoryContext(updated);
        } catch(e: unknown) {
            // FIX: The 'e' variable is of type 'unknown' and cannot be passed to `alert`, which expects a string. This converts the error to a string before alerting.
            const message = e instanceof Error ? e.message : String(e);
            alert(`Error updating category: ${message}`);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (window.confirm(t('deleteCategoryConfirm'))) {
            try {
                await deleteCategoryApi(id);
                deleteCategoryContext(id);
            } catch (e: unknown) {
                // FIX: The 'e' variable is of type 'unknown' and cannot be passed to `alert`, which expects a string. This converts the error to a string before alerting.
                const message = e instanceof Error ? e.message : String(e);
                alert(`Error deleting category: ${message}`);
            }
        }
    };

    const handleServiceSubmit = async (serviceData: Partial<Service>) => {
        if (!business) return;
        setIsSubmittingService(true);
        try {
            if (editingService) {
                const updated = await updateService(editingService.id, serviceData);
                updateServiceContext(updated);
            } else {
                if (limitReached) {
                    throw new Error("Service limit reached for your current plan.");
                }
                const newService = await addService({ ...serviceData, businessId: business.id });
                addServiceContext(newService);
            }
            setIsServiceModalOpen(false);
        } catch (error: unknown) {
            // FIX: The 'error' variable is of type 'unknown' and cannot be passed to `alert`, which expects a string. This converts the error to a string before alerting.
            const message = error instanceof Error ? error.message : String(error);
            console.error("Failed to save service:", message);
            alert(`Error: ${message}`);
        } finally {
            setIsSubmittingService(false);
        }
    };


    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="w-full sm:w-auto">
                                    <Input
                                        type="search"
                                        placeholder={t('searchServicesPlaceholder')}
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                                <Button onClick={handleAddService} disabled={limitReached} className="flex-shrink-0 w-full sm:w-auto">{t('addNewService')}</Button>
                            </div>
                        </CardHeader>
                    </Card>
                     {limitReached && (
                        <div className="p-4 border-b border-border bg-yellow-50 dark:bg-yellow-500/10 text-center rounded-lg">
                            <h3 className="text-sm font.semibold text-yellow-800 dark:text-yellow-200">{t('limitReachedTitle', { item: t('services') })}</h3>
                            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">{t('limitReachedDesc', { limit: servicesLimit, item: t('services').toLowerCase() })}</p>
                            <Link to="/dashboard/billing">
                                <Button size="sm" className="mt-2">{t('upgradePlan')}</Button>
                            </Link>
                        </div>
                    )}

                    {servicesByCategory.map(({ categoryId, categoryName, services: groupServices }) => (
                        <Card key={categoryId || 'uncategorized'}>
                            <CardHeader>
                                <h3 className="font.semibold text-lg">{categoryName}</h3>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-border">
                                        <tbody className="bg-card divide-y divide-border">
                                            {groupServices.map(service => (
                                                <tr key={service.id} className="hover:bg-accent transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <img src={service.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(service.name)}&background=EAE6E1&color=413F3D`} alt={service.name} className="w-16 h-10 object-cover rounded-md flex-shrink-0" />
                                                            <div>
                                                                <div className="text-sm font.medium text-foreground">{service.name}</div>
                                                                <div className="text-xs text-muted-foreground">{service.description}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-muted-foreground">{formatDuration(service.duration)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-end text-sm font.medium text-foreground">{formatPrice(service.price, business?.currency)}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-end text-sm font.medium">
                                                        <Button variant="ghost" onClick={() => handleEditService(service)}>{t('editAction')}</Button>
                                                        <Button variant="ghost" className="text-destructive" onClick={() => handleDeleteService(service.id)}>{t('deleteAction')}</Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {allServices.length === 0 && (
                        <Card>
                            <CardContent className="text-center p-8 text-muted-foreground">
                                {t('noServicesFound')}
                            </CardContent>
                        </Card>
                    )}
                </div>
                <div className="lg:col-span-1">
                    <CategoryManager 
                        categories={categories}
                        onAdd={handleAddCategory}
                        onUpdate={handleUpdateCategory}
                        onDelete={handleDeleteCategory}
                    />
                </div>
            </div>

            <ServiceModal 
                isOpen={isServiceModalOpen} 
                onClose={() => setIsServiceModalOpen(false)} 
                service={editingService} 
                onSubmit={handleServiceSubmit}
                isSubmitting={isSubmittingService}
            />
        </>
    );
};

export default ManageServices;
