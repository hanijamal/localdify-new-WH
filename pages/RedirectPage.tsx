import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getLongUrlForRedirect } from '../services/supabaseService';
import Spinner from '../components/ui/Spinner';
import Card, { CardContent } from '../components/ui/Card';

const RedirectPage: React.FC = () => {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [error, setError] = useState('');

  useEffect(() => {
    const performRedirect = async () => {
      if (!shortCode) {
        setError('No short link provided.');
        return;
      }

      try {
        const longUrl = await getLongUrlForRedirect(shortCode);
        if (longUrl) {
          window.location.replace(longUrl);
        } else {
          setError('This short link could not be found or has been deleted.');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while trying to redirect.');
      }
    };

    performRedirect();
  }, [shortCode]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8">
          {error ? (
             <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-destructive mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h1 className="mt-4 text-3xl font-bold text-foreground">Link Not Found</h1>
                <p className="mt-2 text-muted-foreground">{error}</p>
            </>
          ) : (
            <>
              <Spinner />
              <h1 className="mt-4 text-2xl font-semibold text-foreground">Redirecting...</h1>
              <p className="mt-2 text-muted-foreground">Please wait while we take you to your destination.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RedirectPage;