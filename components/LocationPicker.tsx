import React from 'react';
import { Link } from 'react-router-dom';
import { Business, Location } from '../types';
import Card, { CardContent, CardHeader } from './ui/Card';
import { useLanguage } from '../hooks/useLanguage';

interface LocationPickerProps {
    business: Business;
    locations: Location[];
}

const LocationPicker: React.FC<LocationPickerProps> = ({ business, locations }) => {
    const { t } = useLanguage();
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full">
                <div className="text-center mb-8">
                    {business.imageUrl && <img src={business.imageUrl} alt={business.name} className="w-24 h-24 object-cover mb-4 rounded-full mx-auto" />}
                    <h1 className="text-3xl font-bold text-foreground">{t('welcomeToBusiness', { name: business.name })}</h1>
                    <p className="mt-2 text-lg text-muted-foreground">{t('chooseLocationPrompt')}</p>
                </div>
                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-semibold text-center">{t('ourLocations')}</h2>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {locations.map(location => (
                                <Link to={`/b/${business.slug}/${location.slug}`} key={location.id} className="block">
                                    <div className="p-4 border border-border rounded-lg hover:bg-accent hover:border-primary transition-colors cursor-pointer">
                                        <p className="font-semibold text-foreground">{location.name}</p>
                                        <p className="text-sm text-muted-foreground">{location.address}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
             <footer className="py-6 text-center mt-8">
                <p className="text-sm text-muted-foreground">
                    {t('poweredBy')} <a href="https://localdify.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">localDify</a>
                </p>
            </footer>
        </div>
    );
};

export default LocationPicker;