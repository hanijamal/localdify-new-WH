import React, { useState } from 'react';
import { useAdmin } from '../../hooks/useAdmin';
import { useLanguage } from '../../hooks/useLanguage';
import { Plan } from '../../types';
import Spinner from '../../components/ui/Spinner';
import Card, { CardContent, CardHeader, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import PlanModal from '../../components/PlanModal';

const AdminPlans: React.FC = () => {
    const { plans, users, loading, deletePlan } = useAdmin();
    const { t } = useLanguage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

    const handleAdd = () => {
        setEditingPlan(null);
        setIsModalOpen(true);
    };

    const handleEdit = (plan: Plan) => {
        setEditingPlan(plan);
        setIsModalOpen(true);
    };

    const handleDelete = async (plan: Plan) => {
        if (plan.name === 'Standard') {
            alert(t('deleteDefaultPlanError'));
            return;
        }

        const isPlanInUse = users.some(user => user.subscriptionPlan === plan.name);
        if (isPlanInUse) {
            alert(t('deletePlanInUseError'));
            return;
        }

        if (window.confirm(t('deletePlanConfirm'))) {
            try {
                await deletePlan(plan.id);
            } catch (err: any) {
                alert(`Failed to delete plan: ${err.message}`);
            }
        }
    };


    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{t('planManagement')}</h1>
                        <p className="text-muted-foreground">{t('planManagementDesc')}</p>
                    </div>
                    <Button onClick={handleAdd}>{t('addPlan')}</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.sort((a, b) => a.price - b.price).map(plan => (
                        <Card key={plan.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {plan.is_active ? t('planActive') : t('planInactive')}
                                    </span>
                                </div>
                                <p className="text-3xl font-bold mt-2">${plan.price.toFixed(2)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <ul className="space-y-3 text-sm">
                                    <li className="flex justify-between"><span>{t('staffLimit')}:</span> <span className="font-medium">{plan.staff_limit >= 999 ? t('unlimited') : plan.staff_limit}</span></li>
                                    <li className="flex justify-between"><span>{t('servicesLimit')}:</span> <span className="font-medium">{plan.services_limit >= 999 ? t('unlimited') : plan.services_limit}</span></li>
                                    <li className="flex justify-between"><span>{t('locationsLimit')}:</span> <span className="font-medium">{plan.locations_limit >= 999 ? t('unlimited') : plan.locations_limit}</span></li>
                                    <li className="flex justify-between"><span>{t('emailQuota')}:</span> <span className="font-medium">{plan.email_quota.toLocaleString()}</span></li>
                                    <li className="flex justify-between"><span>{t('whatsappQuota')}:</span> <span className="font-medium">{plan.whatsapp_quota.toLocaleString()}</span></li>
                                </ul>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                <Button variant="destructive" onClick={() => handleDelete(plan)}>{t('deleteAction')}</Button>
                                <Button variant="secondary" onClick={() => handleEdit(plan)}>{t('editAction')}</Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>

            <PlanModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                plan={editingPlan}
            />
        </>
    );
};

export default AdminPlans;
