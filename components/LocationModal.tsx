import React, { useState, useEffect } from 'react';
import { Location, DayOfWeek } from '../types';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import { useBusiness } from '../hooks/useBusiness';
import { useLanguage } from '../hooks/useLanguage';
import { addLocation, updateLocation } from '../services/supabaseService';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: Location | null;
}

const generateSlug = (name: string) => {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\p{L}\p{N}-]+/gu, '') // Remove all non-word chars except unicode letters, numbers, and hyphens
        .replace(/--+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, ''); // Trim - from end of text
};


const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose, location }) => {
    const { business, addLocationContext, updateLocationContext } = useBusiness();
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [closedDays, setClosedDays] = useState<DayOfWeek[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    const isEditMode = !!location;
    const daysOfWeek: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setName(location.name);
                setAddress(location.address || '');
                setStartTime(location.workingHours?.start || '09:00');
                setEndTime(location.workingHours?.end || '17:00');
                setClosedDays(location.closedDays || []);
            } else {
                setName('');
                setAddress('');
                setStartTime('09:00');
                setEndTime('17:00');
                setClosedDays([]);
            }
            setError('');
        }
    }, [location, isOpen, isEditMode]);

    const handleClosedDayChange = (day: DayOfWeek) => {
        setClosedDays(prev => 
            prev.includes(day) 
                ? prev.filter(d => d !== day) 
                : [...prev, day]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!business) return;
        setIsSubmitting(true);
        setError('');

        try {
            const slug = generateSlug(name);
            if (!slug) {
                throw new Error("Location name cannot be empty or invalid.");
            }

            const locationData = {
                businessId: business.id,
                name,
                slug,
                address,
                workingHours: { start: startTime, end: endTime },
                closedDays,
            };

            if (isEditMode && location) {
                const { businessId, ...updates } = locationData;
                const updatedLocation = await updateLocation(location.id, updates);
                updateLocationContext(updatedLocation);
            } else {
                const newLocation = await addLocation(locationData as Omit<Location, 'id'>);
                addLocationContext(newLocation);
            }
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={isEditMode ? t('editLocationTitle') : t('addLocationTitle')} 
            widthClass="max-w-xl"
        >
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                    <Input label={t('locationNameLabel')} value={name} onChange={e => setName(e.target.value)} required placeholder={t('locationNamePlaceholder')} />
                    <Input label={t('businessAddressLabel')} value={address} onChange={e => setAddress(e.target.value)} placeholder={t('addressPlaceholder')} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label={t('opensAtLabel')} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                        <Input label={t('closesAtLabel')} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">{t('closedDaysLabel')}</label>
                        <div className="flex flex-wrap gap-2">
                            {daysOfWeek.map(day => (
                                <button
                                    type="button"
                                    key={day}
                                    onClick={() => handleClosedDayChange(day)}
                                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${closedDays.includes(day) ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-accent'}`}
                                >
                                    <span className="capitalize">{t(day)}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    {error && <p className="text-destructive text-sm text-center">{error}</p>}
                </div>
                <div className="p-4 bg-muted/50 border-t flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>{t('cancelButton')}</Button>
                    <Button type="submit" isLoading={isSubmitting}>{isEditMode ? t('saveChangesButton') : t('addLocationButton')}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default LocationModal;