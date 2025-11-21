import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Card, { CardContent, CardHeader, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PaymentHistory } from '../../types';
import { getPaymentHistoryForUser } from '../../services/supabaseService';
import Spinner from '../../components/ui/Spinner';
import { useLanguage } from '../../hooks/useLanguage';
import { useBusiness } from '../../hooks/useBusiness';

const UsageBar: React.FC<{ used: number; total: number; label: string }> = ({ used, total, label }) => {
    const { t } = useLanguage();
    const isUnlimited = total >= 999999;
    const percentage = !isUnlimited && total > 0 ? Math.min((used / total) * 100, 100) : (isUnlimited ? 100 : 0);
    const displayTotal = isUnlimited ? t('unlimited') : total.toLocaleString();

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-sm text-muted-foreground">{t('usedOf', { used: used.toLocaleString(), total: displayTotal })}</p>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
                <div 
                    className={`h-2.5 rounded-full ${isUnlimited ? 'bg-green-500' : 'bg-primary'}`} 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};


const Billing: React.FC = () => {
    const { user } = useAuth();
    const { business, plans, allStaff, allServices, locations, loading: businessLoading } = useBusiness();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [history, setHistory] = useState<PaymentHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

     useEffect(() => {
        const fetchBillingData = async () => {
            if (!user) return;
            setLoadingHistory(true);
            try {
                const paymentHistory = await getPaymentHistoryForUser(user.id);
                setHistory(paymentHistory);
            } catch (error) {
                console.error("Failed to fetch billing data:", error);
            } finally {
                setLoadingHistory(false);
            }
        };
        fetchBillingData();
    }, [user]);

    const currentPlan = useMemo(() => {
        if (!user?.subscriptionPlan || !plans) return null;
        return plans.find(p => p.name === user.subscriptionPlan);
    }, [plans, user]);

    const loading = loadingHistory || businessLoading;

    const statusMap = {
      active: { text: t('activeBadge'), classes: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
      trialing: { text: t('trialingBadge'), classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
      inactive: { text: t('inactiveBadge'), classes: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300' }
    };

    const currentStatus = statusMap[user?.subscriptionStatus || 'inactive'];

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-foreground">{t('billingSubscription')}</h1>

            <Card>
                <CardHeader className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">{t('currentPlan')}</h2>
                    {user?.subscriptionStatus && (
                         <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${currentStatus.classes}`}>
                            {currentStatus.text}
                        </span>
                    )}
                </CardHeader>
                <CardContent>
                    <p className="text-lg font-bold">{currentPlan?.name || 'Free Plan'}</p>
                    {user?.subscriptionStatus === 'active' && currentPlan && (
                        <p className="text-muted-foreground mt-1">{t('currentPlanIs', {planName: currentPlan.name})}</p>
                    )}
                </CardContent>
            </Card>
            
            {currentPlan && business && (
                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-semibold">{t('currentPlanUsage')}</h2>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <UsageBar label={t('staffMembers')} used={allStaff.length} total={currentPlan.staff_limit} />
                        <UsageBar label={t('services')} used={allServices.length} total={currentPlan.services_limit} />
                        <UsageBar label={t('locations')} used={locations.length} total={currentPlan.locations_limit} />
                        <UsageBar label={t('emailUsage')} used={business.email_messages_sent || 0} total={currentPlan.email_quota} />
                        <UsageBar label={t('whatsappUsage')} used={business.whatsapp_messages_sent || 0} total={currentPlan.whatsapp_quota} />
                    </CardContent>
                    <CardFooter>
                         <Button onClick={() => navigate('/trial-ended')}>{t('upgradeSubscription')}</Button>
                    </CardFooter>
                </Card>
            )}

            <Card>
                <CardHeader>
                     <h2 className="text-xl font-semibold">{t('paymentHistory')}</h2>
                </CardHeader>
                 <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center items-center h-40"><Spinner /></div>
                    ) : history.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('dateTimeHeader')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('descriptionHeader')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('amount')}</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('transactionIdHeader')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                    {history.map(item => (
                                        <tr key={item.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{item.description}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">${item.amount.toFixed(2)} {item.currency}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-muted-foreground font-mono">{item.providerTransactionId}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                         <p className="text-muted-foreground text-center py-8">
                            {t('noPaymentHistory')}
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Billing;