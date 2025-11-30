

import React, { useState, useMemo, useEffect } from 'react';
import Card, { CardContent, CardHeader, CardFooter } from '../../components/ui/Card';
import { useAdmin } from '../../hooks/useAdmin';
import StatCard from '../../components/ui/StatCard';
import Spinner from '../../components/ui/Spinner';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useLanguage } from '../../hooks/useLanguage';
import { Plan } from '../../types';

const SubscriptionStatusBadge: React.FC<{ status: 'trialing' | 'active' | 'inactive' }> = ({ status }) => {
    const { t } = useLanguage();
    const statusMap = {
        active: { text: t('activeBadge'), classes: 'bg-green-400/20 text-green-500' },
        trialing: { text: t('trialingBadge'), classes: 'bg-blue-400/20 text-blue-500' },
        inactive: { text: t('inactiveBadge'), classes: 'bg-gray-400/20 text-gray-500' }
    };
    const currentStatus = statusMap[status] || statusMap.inactive;

    return (
        <span className={`px-2.5 py-0.5 text-xs font-medium leading-5 rounded-full inline-block ${currentStatus.classes}`}>
            {currentStatus.text}
        </span>
    );
};

const AdminRevenue: React.FC = () => {
    const { users, plans, loading, error } = useAdmin();
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'trialing' | 'inactive'>('all');

    const customerUsers = useMemo(() => users.filter(u => u.role !== 'admin'), [users]);

    const filteredUsers = useMemo(() => {
        return customerUsers.filter(user => {
            const statusMatch = statusFilter === 'all' || user.subscriptionStatus === statusFilter;
            const searchMatch = !searchTerm ||
                user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.businessName?.toLowerCase().includes(searchTerm.toLowerCase());
            return statusMatch && searchMatch;
        });
    }, [customerUsers, searchTerm, statusFilter]);

    const stats = useMemo(() => {
        if (!customerUsers || !plans || plans.length === 0) return { mrr: 0, activeSubs: 0, trialingUsers: 0 };
        
        const activeSubscribers = customerUsers.filter(u => u.subscriptionStatus === 'active');
        const planPriceMap = new Map(plans.map(p => [p.name, p.price]));
        
        const mrr = activeSubscribers.reduce((total, user) => {
            if (user.subscriptionPlan) {
                const price = planPriceMap.get(user.subscriptionPlan);
                if (price) {
                    return total + price;
                }
            }
            // Fallback for older users or if plan not found, assume standard price
            return total + (planPriceMap.get('Standard') || 14.00);
        }, 0);
        
        const activeSubs = activeSubscribers.length;
        const trialingUsers = customerUsers.filter(u => u.subscriptionStatus === 'trialing').length;

        return { mrr, activeSubs, trialingUsers };
    }, [customerUsers, plans]);
    
    const handleManageOnPayPal = (subscriptionId: string) => {
        const url = `https://www.sandbox.paypal.com/billing/subscriptions?status=ALL&plan_id=&subscription_id=${subscriptionId}`;
        window.open(url, '_blank');
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    if (error) {
        return <p className="text-destructive">Error loading revenue data: {error}</p>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-foreground">{t('revenueSubscriptions')}</h1>
            
            <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                <StatCard title={t('mrr')} value={`$${stats.mrr.toFixed(2)}`} />
                <StatCard title={t('activeSubscriptions')} value={stats.activeSubs.toString()} />
                <StatCard title={t('trialingUsers')} value={stats.trialingUsers.toString()} />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-semibold">{t('subscriberManagement')}</h2>
                            <p className="text-sm text-muted-foreground">{t('subscriberManagementDesc')}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Input
                                type="search"
                                placeholder={t('searchSubscribersPlaceholder')}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full sm:w-64"
                            />
                            <div className="flex items-center bg-muted/50 rounded-md p-1">
                                {(['all', 'active', 'trialing', 'inactive'] as const).map(status => (
                                    <button 
                                        key={status}
                                        onClick={() => setStatusFilter(status)}
                                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${statusFilter === status ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('userHeader')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('businessHeader')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('statusHeader')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('paypalIdHeader')}</th>
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
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <SubscriptionStatusBadge status={user.subscriptionStatus} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-mono">{user.paypalSubscriptionId || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            {user.paypalSubscriptionId && (
                                                <Button variant="secondary" onClick={() => handleManageOnPayPal(user.paypalSubscriptionId!)}>
                                                    {t('manageOnPayPal')}
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground">{t('foundSubscribers', { count: filteredUsers.length, total: customerUsers.length })}</p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default AdminRevenue;