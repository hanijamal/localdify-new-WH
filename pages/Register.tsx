import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import { useLanguage } from '../hooks/useLanguage';
import LanguageSelector from '../components/LanguageSelector';
import { getPublicSystemSettings } from '../services/supabaseService';
import { RegistrationCounterSetting } from '../types';

const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useLanguage();
  const [counterSettings, setCounterSettings] = useState<Partial<RegistrationCounterSetting> | null>(null);
  const [counterLoading, setCounterLoading] = useState(true);

  useEffect(() => {
    const fetchCounter = async () => {
      try {
        const settings = await getPublicSystemSettings();
        setCounterSettings(settings?.registrationCounter ?? null);
      } catch (e) {
        console.error("Failed to load counter settings", e);
      } finally {
        setCounterLoading(false);
      }
    };
    fetchCounter();
  }, []);

  const formattedCounterMessage = useMemo(() => {
      if (!counterSettings || !counterSettings.message) return '';
      return counterSettings.message
          .replace('{{current}}', String(counterSettings.current ?? 0))
          .replace('{{total}}', String(counterSettings.total ?? 0));
  }, [counterSettings]);

  const progressPercentage = useMemo(() => {
    if (!counterSettings || !counterSettings.total || counterSettings.total === 0) return 0;
    return ((counterSettings.current ?? 0) / counterSettings.total) * 100;
  }, [counterSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    if (password.length < 6) {
        setError(t('passwordLengthError'));
        setIsLoading(false);
        return;
    }
    try {
      await register(name, email, password);
      navigate('/confirmation-required');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 relative">
       <LanguageSelector className="absolute top-4 ltr:right-4 rtl:left-4" />
       {!counterLoading && counterSettings?.enabled && (
            <div className="w-full max-w-md mb-6 p-6 bg-card text-card-foreground rounded-xl shadow-lg border border-border animate-fade-in-up">
                <div className="flex flex-col items-center text-center">
                    <h3 className="text-xl font-bold text-foreground">{formattedCounterMessage}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t('limitedTimeOffer', { count: counterSettings.total })}</p>
                    <div className="w-full bg-muted rounded-full h-2.5 mt-4">
                        <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                    </div>
                </div>
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
            <h2 className="text-2xl font-bold text-center text-card-foreground">{t('createYourAccount')}</h2>
            <p className="text-sm text-muted-foreground text-center mt-1">{t('trialInfo')}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
               <Input
                id="name"
                label={t('fullNameLabel')}
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && <p className="text-destructive text-sm text-center">{error}</p>}
              <Button type="submit" className="w-full" isLoading={isLoading}>
                {t('createAccountButton')}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t('alreadyHaveAccount')}{' '}
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

export default Register;