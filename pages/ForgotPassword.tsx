
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import { useLanguage } from '../hooks/useLanguage';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { sendPasswordResetLink } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      await sendPasswordResetLink(email);
      setMessage(t('passwordResetLinkSent'));
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
            <h2 className="text-2xl font-bold text-center text-card-foreground">{t('resetYourPassword')}</h2>
          </CardHeader>
          <CardContent>
            {message ? (
              <div className="text-center">
                <p className="text-green-600 dark:text-green-500">{message}</p>
                <Link to="/login" className="font-medium text-primary hover:text-primary/90 hover:underline mt-4 inline-block">
                    {t('backToSignIn')}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                 <p className="text-sm text-muted-foreground text-center">{t('resetPasswordInstructions')}</p>
                <Input
                  id="email"
                  label={t('emailAddressLabel')}
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {error && <p className="text-destructive text-sm text-center">{error}</p>}
                <Button type="submit" className="w-full" isLoading={isLoading}>
                  {t('sendResetLinkButton')}
                </Button>
              </form>
            )}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t('rememberYourPassword')}{' '}
              <Link to="/login" className="font-medium text-primary hover:text-primary/90 hover:underline">
                {t('signInLink')}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
