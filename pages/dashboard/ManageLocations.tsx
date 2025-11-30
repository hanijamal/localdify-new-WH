import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useBusiness } from '../../hooks/useBusiness';
import { useLanguage } from '../../hooks/useLanguage';
import Spinner from '../../components/ui/Spinner';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LocationModal from '../../components/LocationModal';
import { Location } from '../../types';
import { deleteLocation } from '../../services/supabaseService';
import { useAuth } from '../../hooks/useAuth';

const ManageLocations: React.FC = () => {
    const { user } = useAuth();
    const { locations, loading, deleteLocationContext, plans } = useBusiness();
    const { t } = useLanguage();
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);

    const currentPlan = useMemo(() => {
        if (!user?.subscriptionPlan) return null;
        return plans.find(p => p.name === user.subscriptionPlan);
    }, [plans, user]);

    const locationsLimit = currentPlan?.locations_limit;
    const limitReached = useMemo(() => {
        if (locationsLimit === undefined || locationsLimit === null) return false;
        if (locationsLimit >= 999) return false;
        return locations.length >= locationsLimit;
    }, [locations.length, locationsLimit]);

    const handleAddLocation = () => {
        if (limitReached) return;
        setEditingLocation(null);
        setIsLocationModalOpen(true);
    };

    const handleEditLocation = (location: Location) => {
        setEditingLocation(location);
        setIsLocationModalOpen(true);
    };

    const handleDeleteLocation = async (locationId: string) => {
        if (window.confirm(t('deleteLocationConfirm'))) {
            try {
                await deleteLocation(locationId);
                deleteLocationContext(locationId);
            } catch (error: any) {
                console.error("Failed to delete location:", error.message);
                alert(error.message);
            }
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }
    
    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center">
                        <div>
                            <h2 className="text-xl font-semibold">{t('manageLocationsTitle')}</h2>
                            <p className="text-sm text-muted-foreground">{t('manageLocationsDesc')}</p>
                        </div>
                        <Button onClick={handleAddLocation} disabled={limitReached} className="ms-auto">{t('addLocationButton')}</Button>
                    </div>
                </CardHeader>
                {limitReached && (
                    <div className="p-4 border-b border-border bg-yellow-50 dark:bg-yellow-500/10 text-center">
                        <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">{t('limitReachedTitle', { item: t('locations') })}</h3>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">{t('limitReachedDesc', { limit: locationsLimit, item: t('locations').toLowerCase() })}</p>
                        <Link to="/dashboard/billing">
                            <Button size="sm" className="mt-2">{t('upgradePlan')}</Button>
                        </Link>
                    </div>
                )}
                <CardContent>
                    <div className="space-y-4">
                        {locations.length > 0 ? locations.map(location => (
                            <div key={location.id} className="flex items-start justify-between p-4 bg-muted/50 rounded-lg">
                                <div>
                                    <p className="font-semibold text-foreground">{location.name}</p>
                                    <p className="text-sm text-muted-foreground">{location.address}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {location.workingHours?.start} - {location.workingHours?.end}
                                        {location.closedDays && location.closedDays.length > 0 && ` (${t('closedLabel')}: ${location.closedDays.map(day => t(day)).join(', ')})`}
                                    </p>
                                </div>
                                <div className="ps-4 flex-shrink-0 flex items-center gap-2">
                                    <Button variant="destructive" onClick={() => handleDeleteLocation(location.id)}>{t('deleteAction')}</Button>
                                    <Button variant="ghost" onClick={() => handleEditLocation(location)}>{t('editAction')}</Button>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-muted-foreground py-8">{t('noLocationsMessage')}</p>
                        )}
                    </div>
                </CardContent>
            </Card>
            <LocationModal 
                isOpen={isLocationModalOpen} 
                onClose={() => setIsLocationModalOpen(false)} 
                location={editingLocation}
            />
        </>
    );
};

export default ManageLocations;
