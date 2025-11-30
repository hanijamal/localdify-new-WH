
import React from 'react';
import { Link } from 'react-router-dom';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useLanguage } from '../hooks/useLanguage';

const EmailConfirmedPage: React.FC = () => {
  const { t } = useLanguage();
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
          <CardHeader className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-card-foreground">{t('emailConfirmed')}</h2>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              {t('accountActivated')}
            </p>
            <Link to="/login" className="mt-6 block">
              <Button className="w-full">
                {t('goToSignIn')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailConfirmedPage;
