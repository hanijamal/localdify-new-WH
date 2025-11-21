
import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { useLanguage } from '../hooks/useLanguage';

type ViewState = 'loading' | 'form' | 'error' | 'redirect';

const UpdatePassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();
  const { isPasswordRecovery, updatePasswordForRecovery, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    // This effect determines the component's state based on auth status and URL.
    
    // 1. Check for explicit errors in the URL from Supabase (e.g., expired token)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const errorDescription = hashParams.get('error_description');
    if (errorDescription) {
      setErrorMessage(errorDescription.replace(/\+/g, ' '));
      setViewState('error');
      return;
    }

    // 2. While the auth context is initializing, show the loading state.
    if (authLoading) {
      setViewState('loading');
      return;
    }
    
    // 3. Once auth is loaded, check the recovery status.
    if (isPasswordRecovery) {
      // If the auth context confirms we are in recovery mode, show the form.
      setViewState('form');
    } else {
      // If we're not in recovery mode, decide what to do.
      const hasRecoveryHash = window.location.hash.includes('type=recovery');
      if (hasRecoveryHash) {
        // The URL suggests a recovery attempt, but the auth state doesn't confirm it.
        // This means the link is invalid or expired.
        setErrorMessage(t('invalidOrExpiredLink'));
        setViewState('error');
      } else {
        // The user landed here without a recovery link. Redirect them to login.
        setViewState('redirect');
      }
    }
  }, [authLoading, isPasswordRecovery, t]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatchError'));
      return;
    }
    if (password.length < 6) {
      setError(t('passwordLengthError'));
      return;
    }
    
    setIsLoading(true);
    try {
      await updatePasswordForRecovery(password);
      setMessage(t('passwordUpdatedSuccess'));
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
        setIsLoading(false);
    }
  };
  
  switch (viewState) {
    case 'loading':
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
            <p className="mb-4 text-muted-foreground">{t('validatingResetLink')}</p>
            <Spinner />
        </div>
      );
    case 'error':
       return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
            <div className="max-w-md w-full">
                <Card>
                <CardHeader>
                    <h2 className="text-2xl font-bold text-center text-destructive">{t('linkErrorTitle')}</h2>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-muted-foreground">{errorMessage}</p>
                    <Link to="/forgot-password">
                        <Button variant="secondary">{t('requestNewLink')}</Button>
                    </Link>
                </CardContent>
                </Card>
            </div>
        </div>
        );
    case 'redirect':
        return <Navigate to="/login" replace />;
    case 'form':
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
                <div className="text-center mb-8">
                    <a href="https://localdify.com/">
                        <h1 className="text-4xl font-bold text-foreground transition-colors hover:text-primary">localDify</h1>
                    </a>
                    <p className="text-muted-foreground">{t('yourBusinessSimplified')}</p>
                </div>
                <div className="max-w-md w-full">
                    <Card>
                    <CardHeader>
                        <h2 className="text-2xl font-bold text-center text-card-foreground">{t('setNewPassword')}</h2>
                    </CardHeader>
                    <CardContent>
                        {message ? (
                            <p className="text-center text-green-600 dark:text-green-500">{message}</p>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                            <Input
                                id="new-password"
                                label={t('newPasswordLabel')}
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <Input
                                id="confirm-password"
                                label={t('confirmNewPasswordLabel')}
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                            {error && <p className="text-destructive text-sm text-center">{error}</p>}
                            <Button type="submit" className="w-full" isLoading={isLoading}>
                                {t('updatePasswordButton')}
                            </Button>
                            </form>
                        )}
                    </CardContent>
                    </Card>
                </div>
            </div>
        );
    default:
        return null;
  }
};

export default UpdatePassword;
