import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from '../../hooks/useBusiness';
import Card, { CardContent, CardHeader, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Input from '../../components/ui/Input';
import { supabase } from '../../supabaseClient';
import { createOrUpdateBusiness, getSystemSetting } from '../../services/supabaseService';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import Accordion from '../../components/ui/Accordion';

const EmailIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" />
    </svg>
);

const WhatsAppIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.06 21.94L7.31 20.58C8.75 21.31 10.36 21.72 12.04 21.72C17.5 21.72 21.95 17.27 21.95 11.81C21.95 6.35 17.5 2 12.04 2ZM12.04 20.13C10.56 20.13 9.12 19.75 7.89 19.05L7.54 18.86L4.42 19.71L5.29 16.69L5.09 16.34C4.31 15.03 3.88 13.51 3.88 11.91C3.88 7.37 7.54 3.61 12.04 3.61C16.54 3.61 20.2 7.37 20.2 11.81C20.2 16.25 16.54 20.13 12.04 20.13ZM17.43 14.22C17.19 14.1 16.1 13.58 15.88 13.5C15.67 13.43 15.51 13.39 15.34 13.64C15.18 13.88 14.78 14.38 14.63 14.54C14.49 14.7 14.34 14.72 14.09 14.6C13.84 14.48 13.04 14.21 12.09 13.38C11.32 12.72 10.78 11.89 10.63 11.64C10.49 11.4 10.6 11.27 10.71 11.16C10.81 11.05 10.95 10.87 11.08 10.73C11.21 10.59 11.25 10.48 11.32 10.32C11.4 10.15 11.35 10.01 11.29 9.9C11.23 9.78 10.74 8.56 10.55 8.11C10.36 7.66 10.17 7.71 10.04 7.7H9.79C9.54 7.7 9.24 7.78 9 8.03C8.76 8.27 8.15 8.84 8.15 10.05C8.15 11.26 9.03 12.42 9.15 12.58C9.27 12.74 11.69 16.24 14.88 17.65C15.58 17.94 16.11 18.09 16.51 18.23C17.13 18.45 17.63 18.41 18.01 18.15C18.43 17.86 18.91 17.3 19.06 16.85C19.22 16.4 19.22 16.01 19.16 15.9C19.1 15.78 18.86 15.66 18.63 15.55C18.4 15.43 17.67 15.34 17.43 14.22Z" />
    </svg>
);


const UsageBar: React.FC<{ used: number; total: number; label: string }> = ({ used, total, label }) => {
    const { t } = useLanguage();
    const percentage = total > 0 ? (used / total) * 100 : 0;
    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-sm text-muted-foreground">{t('usedOf', { used: used.toLocaleString(), total: total.toLocaleString() })}</p>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

export const Integrations: React.FC = () => {
    const { user } = useAuth();
    const { business, refetch, plans, loading: businessLoading } = useBusiness();
    const { t } = useLanguage();
    
    const [testEmail, setTestEmail] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [isWhatsappConnecting, setIsWhatsappConnecting] = useState(false);
    const [isWhatsappConfigured, setIsWhatsappConfigured] = useState(false);

    const loading = businessLoading;

    useEffect(() => {
        const checkPlatformWhatsappConfig = async () => {
            try {
                const [tokenRes, phoneIdRes] = await Promise.all([
                    getSystemSetting<string>('whatsapp_access_token'),
                    getSystemSetting<string>('whatsapp_phone_number_id')
                ]);
                const isConfigured = !!tokenRes?.value && tokenRes.value !== 'null' && !!phoneIdRes?.value && phoneIdRes.value !== 'null';
                setIsWhatsappConfigured(isConfigured);
            } catch (error) {
                console.error("Could not check WhatsApp platform configuration:", error);
                setIsWhatsappConfigured(false);
            }
        };

        checkPlatformWhatsappConfig();
    }, []);
    
    const handleSendTestEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!testEmail) return;
        setIsSendingTest(true);
        setEmailStatus(null);
        try {
            const { error, data } = await supabase.functions.invoke('brevo-send-email', {
                body: { to: testEmail, subject: 'Test Email from localDify', body: '<p>This is a test email to confirm your integration is working.</p>' }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            setEmailStatus({ type: 'success', text: t('testEmailSent', { email: testEmail }) });
        } catch (err: any) {
            setEmailStatus({ type: 'error', text: t('testEmailError', { error: err.message }) });
        } finally {
            setIsSendingTest(false);
        }
    };
    
    const handleToggleWhatsapp = async () => {
        if (!user || !business) return;
        const newStatus = !business.whatsappNotificationsEnabled;
        try {
            await createOrUpdateBusiness({ id: business.id, userId: user.id, whatsappNotificationsEnabled: newStatus });
            await refetch();
        } catch (error) {
            console.error("Failed to toggle WhatsApp status", error);
        }
    };

    const currentPlan = useMemo(() => {
        if (!user?.subscriptionPlan || !plans) return null;
        return plans.find(p => p.name === user.subscriptionPlan);
    }, [plans, user]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">{t('automationTitle')}</h1>
                <p className="text-muted-foreground">{t('sidebarAutomation')}</p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-48"><Spinner /></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                     {currentPlan && business && (
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <h2 className="text-xl font-semibold">{t('usageQuotas')}</h2>
                                <p className="text-sm text-muted-foreground">{t('usageQuotasDesc')}</p>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <UsageBar label={t('emailUsage')} used={business.email_messages_sent || 0} total={currentPlan.email_quota} />
                                <UsageBar label={t('whatsappUsage')} used={business.whatsapp_messages_sent || 0} total={currentPlan.whatsapp_quota} />
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                             <div className="flex items-start gap-4">
                                <EmailIcon />
                                <div>
                                    <h2 className="text-xl font-semibold">{t('emailNotifications')}</h2>
                                    <p className="text-sm text-muted-foreground">{t('emailNotificationsDesc')}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm p-3 bg-green-500/10 text-green-700 dark:text-green-300 rounded-lg">{t('emailNotificationsActive')}</p>
                            <p className="text-sm text-muted-foreground">{t('emailNotificationsInfo')}</p>
                        </CardContent>
                        <CardFooter className="flex-col items-stretch gap-4">
                            <div className="border-t border-border pt-4">
                                <form onSubmit={handleSendTestEmail} className="space-y-2">
                                    <p className="text-sm font-medium">{t('sendTestEmail')}</p>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <Input type="email" placeholder={t('enterYourEmail')} value={testEmail} onChange={e => setTestEmail(e.target.value)} required className="flex-grow"/>
                                        <Button type="submit" variant="secondary" isLoading={isSendingTest} className="w-full sm:w-auto">{t('sendTest')}</Button>
                                    </div>
                                    {emailStatus && <p className={`text-xs mt-1 ${emailStatus.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>{emailStatus.text}</p>}
                                </form>
                            </div>
                        </CardFooter>
                    </Card>

                    <Card className="flex flex-col opacity-60">
                         <CardHeader>
                             <div className="flex items-start gap-4">
                                <WhatsAppIcon />
                                <div>
                                    <div className="flex items-center gap-2">
                                      <h2 className="text-xl font-semibold">{t('whatsapp')}</h2>
                                      <span className="px-2 py-0.5 text-xs font-semibold tracking-wide text-blue-800 bg-blue-100 dark:bg-blue-700 dark:text-blue-200 rounded-full">
                                        {t('comingSoon')}
                                      </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{t('whatsappDesc')}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            <p className="text-sm p-3 bg-gray-500/10 text-gray-700 dark:text-gray-300 rounded-lg">{t('whatsappNotificationsDisabledText')}</p>
                        </CardContent>
                        <CardFooter>
                            <Button disabled>
                                {t('enableWhatsapp')}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
};