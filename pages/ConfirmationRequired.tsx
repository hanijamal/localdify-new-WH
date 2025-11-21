
import React from 'react';
import { Link } from 'react-router-dom';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import { useLanguage } from '../hooks/useLanguage';

const ConfirmationRequired: React.FC = () => {
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
          <CardHeader>
            <h2 className="text-2xl font-bold text-center text-card-foreground">{t('confirmYourEmail')}</h2>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              {t('confirmationInstructions')}
            </p>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t('alreadyConfirmed')}{' '}
              <Link to="/login" className="font-medium text-primary hover:text-primary/90 hover:underline">
                {t('signInHereLink')}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConfirmationRequired;
