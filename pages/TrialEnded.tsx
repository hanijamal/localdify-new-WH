import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card, { CardContent, CardHeader, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import PayPalButton from '../components/PayPalButton';
import Spinner from '../components/ui/Spinner';
import { supabase } from '../supabaseClient';
import { createPaymentRecord } from '../services/supabaseService';
import { useLanguage } from '../hooks/useLanguage';
import { formatPrice } from '../contexts/BusinessContext';
import LanguageSelector from '../components/LanguageSelector';
import { Plan } from '../types';
import { useBusiness } from '../hooks/useBusiness';

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const SuccessIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ErrorIcon: React.FC = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-destructive mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const TrialEnded: React.FC = () => {
  const { user, logout, updateUserProfile, refreshUser } = useAuth();
  const { plans, loading: plansLoading } = useBusiness();
  const { t } = useLanguage();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [payPalClientId, setPayPalClientId] = useState<string | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [payPalError, setPayPalError] = useState<string | null>(null);

  const T = (key: string, options?: any) => t(key, options);

  const trialHasActuallyEnded = useMemo(() => {
    if (!user) return true; 
    const isTrialing = user.subscriptionStatus === 'trialing';
    let isTrialExpired = false;
    if (user.trialEndsAt) {
      const trialEndDay = new Date(user.trialEndsAt);
      const expiryDate = new Date(Date.UTC(
        trialEndDay.getUTCFullYear(),
        trialEndDay.getUTCMonth(),
        trialEndDay.getUTCDate() + 1
      ));
      isTrialExpired = new Date() >= expiryDate;
    }
    return (isTrialing && isTrialExpired) || user.subscriptionStatus === 'inactive';
  }, [user]);

  useEffect(() => {
    const fetchConfig = async () => {
        setConfigLoading(true);
        setPayPalError(null);
        try {
            const { data, error } = await supabase.functions.invoke('get-paypal-client-id');
            if (error) throw error;
            if (data.error) throw new Error(data.error);
            if (data.clientId) {
                setPayPalClientId(data.clientId);
            } else {
                setPayPalError('Upgrades are currently unavailable. The site administrator has not configured a payment provider.');
            }
        } catch (err: any) {
            console.error("Failed to fetch page config:", err instanceof Error ? err.message : String(err));
            setPayPalError('Could not load payment options. Please try refreshing the page or contact support.');
        } finally {
            setConfigLoading(false);
        }
    };
    fetchConfig();
  }, []);

  const handlePaymentSuccess = async (details: { subscriptionID: string }, planNameForProfile: string) => {
    setStatus('processing');
    setErrorMessage('');

    const plan = plans.find(p => p.name === planNameForProfile);

    if (!user || !plan) {
        setErrorMessage('User session or plan details are missing. Cannot complete subscription.');
        setStatus('error');
        return;
    }
    try {
       await createPaymentRecord({
          userId: user.id,
          amount: plan.price,
          paymentProvider: 'PayPal',
          providerTransactionId: details.subscriptionID,
          description: `${planNameForProfile} - Monthly Subscription`,
      });
        
      await updateUserProfile({
        subscriptionStatus: 'active',
        subscriptionPlan: planNameForProfile,
        trialEndsAt: null,
        paypalSubscriptionId: details.subscriptionID,
      });

      await refreshUser();
      setStatus('success');
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err: any) {
      console.error("Failed to update user profile after payment:", err.message);
      setErrorMessage('Your payment was successful, but we failed to update your account. Please contact support.');
      setStatus('error');
    }
  };

  const handlePaymentError = (err: any) => {
    console.error("PayPal Error:", err.message);
    setErrorMessage(err.message || t('paymentProcessingError'));
    setStatus('error');
  };
  
  const pageTitle = trialHasActuallyEnded ? T('trialEndedTitle') : T('choosePlanTitle');
  const pageSubtitle = trialHasActuallyEnded ? T('trialEndedDesc') : T('choosePlanDesc');

  if (status === 'processing') {
     return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <Spinner />
            <p className="mt-4 text-muted-foreground">
                {T('finalizingSubscription')}
            </p>
        </div>
     );
  }

  if (status === 'success') {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <Card className="max-w-md w-full text-center p-8 space-y-4">
                <SuccessIcon />
                <h3 className="text-2xl font-bold text-green-600">{T('subscriptionSuccess')}</h3>
                <p className="text-muted-foreground">{T('welcomeToPro')}</p>
            </Card>
        </div>
      );
  }

  if (status === 'error') {
       return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <Card className="max-w-md w-full text-center p-8 space-y-4">
                <ErrorIcon />
                <h3 className="text-2xl font-bold text-destructive">{T('errorOccurred')}</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">{errorMessage || "An unexpected error occurred."}</p>
                <Button onClick={() => setStatus('idle')}>{T('tryAgain')}</Button>
            </Card>
        </div>
      );
  }

  if (configLoading || plansLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
          <Spinner />
          <p className="mt-4 text-muted-foreground">{T('loadingSubscription')}</p>
      </div>
    );
  }
  
  const activePlans = plans.filter(p => p.is_active).sort((a,b) => a.price - b.price);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative">
      <LanguageSelector className="absolute top-4 ltr:right-4 rtl:left-4" />
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold font-serif text-foreground">
            {pageTitle}
        </h1>
        <p className="mt-2 text-lg text-muted-foreground max-w-2xl">
            {pageSubtitle}
        </p>
      </div>

      <div className={`w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(activePlans.length, 3)} gap-8`}>
        {activePlans.map(plan => {
            const isProfessional = plan.name === 'Professional';

            return (
                <Card key={plan.id} className={`flex flex-col p-2 ${isProfessional ? 'border-2 border-primary shadow-lg' : ''}`}>
                    <CardHeader>
                        <h3 className={`text-2xl font-bold ${isProfessional ? 'text-primary' : ''}`}>{plan.name}</h3>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                        <div className="text-left py-6">
                            <span className="text-5xl font-bold">{formatPrice(plan.price, 'USD')}</span>
                            <span className="text-muted-foreground"> {T('perMonth')}</span>
                        </div>
                        <ul className="space-y-3 text-left">
                            <li className="flex items-start"><CheckIcon className="text-green-500 flex-shrink-0 mr-3 mt-1" /><span>{t('staffLimit')}: {plan.staff_limit >= 999 ? t('unlimited') : plan.staff_limit}</span></li>
                            <li className="flex items-start"><CheckIcon className="text-green-500 flex-shrink-0 mr-3 mt-1" /><span>{t('servicesLimit')}: {plan.services_limit >= 999 ? t('unlimited') : plan.services_limit}</span></li>
                            <li className="flex items-start"><CheckIcon className="text-green-500 flex-shrink-0 mr-3 mt-1" /><span>{t('locationsLimit')}: {plan.locations_limit >= 999 ? t('unlimited') : plan.locations_limit}</span></li>
                            <li className="flex items-start"><CheckIcon className="text-green-500 flex-shrink-0 mr-3 mt-1" /><span>{t('emailQuota')}: {plan.email_quota >= 999999 ? t('unlimited') : plan.email_quota.toLocaleString()}</span></li>
                            <li className="flex items-start"><CheckIcon className="text-green-500 flex-shrink-0 mr-3 mt-1" /><span>{t('whatsappQuota')}: {plan.whatsapp_quota >= 999999 ? t('unlimited') : plan.whatsapp_quota.toLocaleString()}</span></li>
                        </ul>
                    </CardContent>
                    <CardFooter className="!p-6">
                        {payPalClientId ? (
                             <PayPalButton
                                clientId={payPalClientId}
                                planId={plan.id}
                                isProcessing={status !== 'idle'}
                                onSuccess={(details) => handlePaymentSuccess(details, plan.name)}
                                onError={handlePaymentError}
                            />
                        ) : (
                             <p className="text-sm text-muted-foreground text-center w-full">
                                {payPalError || 'This plan is not available for online subscription.'}
                            </p>
                        )}
                    </CardFooter>
                </Card>
            );
        })}
      </div>

      <div className="mt-12 flex items-center gap-4">
        {!trialHasActuallyEnded && (
            <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                {T('backToDashboard')}
            </Button>
        )}
        <Button variant="ghost" onClick={logout}>
            {T('logout')}
        </Button>
      </div>
    </div>
  );
};

export default TrialEnded;