import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Spinner from '../components/ui/Spinner';
import Card, { CardContent } from '../components/ui/Card';
import { useLanguage } from '../hooks/useLanguage';

const CancelBookingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('Processing your cancellation request...');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const cancelBooking = async () => {
      setMessage(t('processingCancellation'));
      const token = searchParams.get('token');
      if (!token) {
        setMessage(t('invalidCancellationLink'));
        setIsError(true);
        setLoading(false);
        return;
      }

      try {
        const { data, error: funcError } = await supabase.functions.invoke('cancel-booking', {
          body: { token },
        });

        if (funcError) throw funcError;
        
        if (data.error) throw new Error(data.error);
        
        setMessage(data.message || t('bookingCanceledSuccess'));
        setIsError(false);
      } catch (err: any) {
        setMessage(err.message || 'An unexpected error occurred. Please try again or contact the business directly.');
        setIsError(true);
      } finally {
        setLoading(false);
      }
    };

    cancelBooking();
  }, [searchParams, t]);

  const Icon = () => {
    if (loading) return <Spinner />;
    if (isError) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-destructive mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const title = loading ? t('processingCancellation') : isError ? t('cancellationFailed') : t('bookingCanceled');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          <Icon />
          <h1 className="mt-4 text-3xl font-bold text-foreground">{title}</h1>
          <p className="mt-2 text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CancelBookingPage;