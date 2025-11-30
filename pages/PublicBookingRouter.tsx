import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Business, Location } from '../types';
import { getPublicBusinessDataBySlug } from '../services/supabaseService';
import Spinner from '../components/ui/Spinner';
import LocationPicker from '../components/LocationPicker';
import { useLanguage } from '../hooks/useLanguage';

const PublicBookingRouter: React.FC = () => {
    const { businessSlug } = useParams<{ businessSlug: string }>();
    const { t, setLanguage } = useLanguage();
    const [business, setBusiness] = useState<Business | null>(null);
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [langInitialized, setLangInitialized] = useState(false);

    useEffect(() => {
        if (!businessSlug) {
            setError(t('businessNotFound'));
            setLoading(false);
            return;
        }

        const fetchBusinessAndLocations = async () => {
            try {
                const data = await getPublicBusinessDataBySlug(businessSlug);
                if (data) {
                    setBusiness(data.business);
                    setLocations(data.locations);

                    if (!langInitialized && !localStorage.getItem('localdify-public-lang') && data.business.defaultLanguage) {
                        setLanguage(data.business.defaultLanguage as any);
                        setLangInitialized(true);
                    }

                } else {
                    setError(t('businessNotFound'));
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : t('loadBusinessError');
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchBusinessAndLocations();
    }, [businessSlug, t, setLanguage, langInitialized]);

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
    }

    if (error) {
        return <div className="text-center mt-10 text-destructive">{error}</div>;
    }

    if (!business) {
        return <div className="text-center mt-10 text-muted-foreground">{t('businessNotFound')}</div>;
    }

    if (locations.length === 0) {
        return <div className="text-center mt-10 text-muted-foreground">{t('noLocationsConfiguredError')}</div>;
    }

    if (locations.length === 1) {
        return <Navigate to={`/b/${business.slug}/${locations[0].slug}`} replace />;
    }

    return <LocationPicker business={business} locations={locations} />;
};

export default PublicBookingRouter;