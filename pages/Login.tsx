
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import { useLanguage } from '../hooks/useLanguage';
import LanguageSelector from '../components/LanguageSelector';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the state from history so the message doesn't reappear on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      const loggedInUser = await login(email, password);
      if (loggedInUser?.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (err.message.toLowerCase().includes('invalid login credentials')) {
        setError(t('invalidCredentialsError'));
      } else if (err.message.toLowerCase().includes('email not confirmed')) {
        setError(t('emailNotConfirmedError'));
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 relative">
       <LanguageSelector className="absolute top-4 ltr:right-4 rtl:left-4" />
       {successMessage && (
            <div className="max-w-md w-full mb-4 p-4 text-sm text-green-700 bg-green-100 rounded-lg dark:bg-green-200 dark:text-green-800 text-center">
                {successMessage}
            </div>
        )}
       <div className="text-center mb-8">
            <a href="https://home.localdify.com/">
                <h1 className="text-4xl font-bold text-foreground transition-colors hover:text-primary">localDify</h1>
            </a>
            <p className="text-muted-foreground">{t('yourBusinessSimplified')}</p>
        </div>
      <div className="max-w-md w-full">
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold text-center text-card-foreground">{t('signInToAccount')}</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                id="email"
                label={t('emailAddressLabel')}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <div>
                <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-foreground">{t('passwordLabel')}</label>
                    <div className="text-sm">
                        <Link to="/forgot-password" className="font-medium text-primary hover:text-primary/90 hover:underline">
                            {t('forgotPasswordLink')}
                        </Link>
                    </div>
                </div>
                <div className="mt-1">
                    <Input
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>
              </div>
              {error && <p className="text-destructive text-sm text-center">{error}</p>}
              <Button type="submit" className="w-full" isLoading={isLoading}>
                {t('signInButton')}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t('notAMember')}{' '}
              <Link to="/register" className="font-medium text-primary hover:text-primary/90 hover:underline">
                {t('signUpNowLink')}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
