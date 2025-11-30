
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import { useLanguage } from '../../hooks/useLanguage';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login, user, isAdmin, loading, logout } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (!loading && user) {
      if (isAdmin) {
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError('You do not have administrative privileges. Please log out and use the main login page.');
      }
    }
  }, [user, isAdmin, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
      // The useEffect hook will handle navigation or error display
    } catch (err: any) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNonAdminLogout = async () => {
      await logout();
      setError(''); // Clear error after logout
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
       <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground">{t('adminPanel')}</h1>
            <p className="text-muted-foreground">{t('adminAccess')}</p>
        </div>
      <div className="max-w-md w-full">
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold text-center text-card-foreground">{t('adminSignIn')}</h2>
          </CardHeader>
          <CardContent>
            {user && !isAdmin ? (
                <div className="text-center space-y-4">
                    {error && <p className="text-destructive text-sm text-center">{error}</p>}
                    <Button onClick={handleNonAdminLogout} className="w-full">
                        {t('logout')}
                    </Button>
                </div>
            ) : (
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
                  <Input
                    id="password"
                    label={t('passwordLabel')}
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  {error && <p className="text-destructive text-sm text-center">{error}</p>}
                  <Button type="submit" className="w-full" isLoading={isLoading}>
                    {t('signInButton')}
                  </Button>
                </form>
            )}
             <p className="mt-6 text-center text-sm text-muted-foreground">
              {t('notAdmin')}{' '}
              <Link to="/login" className="font-medium text-primary hover:text-primary/90 hover:underline">
                {t('goToUserLogin')}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
