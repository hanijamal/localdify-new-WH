import React, { useState, useEffect } from 'react';
import { StaffMember, DayOfWeek, Service } from '../types';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import { useBusiness } from '../hooks/useBusiness';
import ServiceModal from './ServiceModal';
import { addService, updateService, deleteService, addStaffMember as addStaffMemberApi, updateStaffMember as updateStaffMemberApi } from '../services/supabaseService';
import { useLanguage } from '../hooks/useLanguage';
import { formatPrice, formatDuration } from '../contexts/BusinessContext';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffMember: StaffMember | null;
}

const StaffModal: React.FC<StaffModalProps> = ({ isOpen, onClose, staffMember }) => {
  const { business, allServices, locations, addServiceContext, updateServiceContext, deleteServiceContext, addStaffContext, updateStaffContext } = useBusiness();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [closedDays, setClosedDays] = useState<DayOfWeek[]>([]);
  const [assignedServiceIds, setAssignedServiceIds] = useState<string[]>([]);
  const [assignedLocationIds, setAssignedLocationIds] = useState<string[]>([]);
  
  const [imageError, setImageError] = useState('');
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const MAX_IMAGE_SIZE_KB = 100;
  const daysOfWeek: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  // State for the nested ServiceModal
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isSubmittingService, setIsSubmittingService] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (staffMember) {
        setName(staffMember.name);
        setEmail(staffMember.email || '');
        setImageUrl(staffMember.imageUrl || null);
        setStartTime(staffMember.workingHours?.start || '09:00');
        setEndTime(staffMember.workingHours?.end || '17:00');
        setClosedDays(staffMember.closedDays || []);
        setAssignedServiceIds(staffMember.serviceIds || []);
        setAssignedLocationIds(staffMember.locationIds || []);
      } else {
        // Reset for "Add" mode
        setName('');
        setEmail('');
        setImageUrl(null);
        setStartTime('09:00');
        setEndTime('17:00');
        setClosedDays([]);
        setAssignedServiceIds([]);
        setAssignedLocationIds([]);
      }
      setImageError('');
      setImageFileName(null);
    }
  }, [staffMember, isOpen]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageError('');
      if (file.type !== 'image/jpeg') {
        setImageError('Only JPG images are allowed.');
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_KB * 1024) {
        setImageError(`Image must be under ${MAX_IMAGE_SIZE_KB}KB.`);
        return;
      }
      setImageFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleClosedDayChange = (day: DayOfWeek) => {
    setClosedDays(prev => 
        prev.includes(day) 
            ? prev.filter(d => d !== day) 
            : [...prev, day]
    );
  };

  const handleServiceAssignmentChange = (serviceId: string) => {
    setAssignedServiceIds(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleLocationAssignmentChange = (locationId: string) => {
    setAssignedLocationIds(prev =>
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setIsSubmitting(true);
    try {
      const staffData = {
        id: staffMember?.id,
        businessId: business.id,
        name,
        email,
        imageUrl,
        workingHours: { start: startTime, end: endTime },
        closedDays,
        serviceIds: assignedServiceIds,
        locationIds: assignedLocationIds
      };
      if (staffMember) {
        const updated = await updateStaffMemberApi(staffMember.id, staffData);
        updateStaffContext(updated);
      } else {
        const added = await addStaffMemberApi(staffData as Omit<StaffMember, 'id'>);
        addStaffContext(added);
      }
      onClose();
    } catch (error) {
      console.error("Failed to save staff member", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleServiceSubmit = async (serviceData: Partial<Service>) => {
      if (!business) return;
      setIsSubmittingService(true);
      try {
          if (editingService) {
              const updated = await updateService(editingService.id, serviceData);
              updateServiceContext(updated);
          } else {
              const newService = await addService({ ...serviceData, businessId: business.id });
              addServiceContext(newService);
              setAssignedServiceIds(prev => [...prev, newService.id]);
          }
          setIsServiceModalOpen(false);
          setEditingService(null);
      } catch (error: any) {
          console.error("Failed to save service:", error.message);
      } finally {
          setIsSubmittingService(false);
      }
  };

  const handleDeleteServiceClick = async (serviceId: string) => {
      if (window.confirm("Are you sure you want to permanently delete this service from your business?")) {
          try {
              await deleteService(serviceId);
              deleteServiceContext(serviceId);
              setAssignedServiceIds(prev => prev.filter(id => id !== serviceId));
          } catch (error: any) {
              console.error("Failed to delete service:", error.message);
          }
      }
  };

  const modalFooter = (
    <>
        <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>{t('cancelButton')}</Button>
        <Button form="staff-form" type="submit" isLoading={isSubmitting}>{staffMember ? t('saveChangesButton') : t('addStaffButton')}</Button>
    </>
  );


  return (
    <>
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={staffMember ? t('editStaffTitle') : t('addStaffTitle')} 
            widthClass="max-w-3xl" 
            scrollable 
            footer={modalFooter}
        >
            <form id="staff-form" onSubmit={handleSubmit}>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label={t('fullNameLabel')} value={name} onChange={e => setName(e.target.value)} required />
                        <Input label={t('staffEmailLabel')} type="email" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">{t('photoLabel')}</label>
                        <div className="flex items-center space-x-4">
                            <img src={imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'S')}&background=random`} alt="Staff member" className="w-20 h-20 object-cover rounded-full" />
                            <div className="flex-1">
                                <div className="relative">
                                    <input
                                        type="file"
                                        id="staff-image-upload"
                                        accept="image/jpeg"
                                        onChange={handleImageUpload}
                                        className="absolute w-0 h-0 opacity-0 peer"
                                    />
                                    <label 
                                        htmlFor="staff-image-upload" 
                                        className="flex items-center w-full h-10 px-3 bg-card border border-input rounded-md shadow-sm cursor-pointer focus-within:ring-1 focus-within:ring-ring"
                                    >
                                        <span className="inline-block bg-primary/10 text-primary hover:bg-primary/20 text-sm font-semibold px-3 py-1 rounded-md transition-colors">
                                            {t('chooseFile')}
                                        </span>
                                        <span className="ltr:ml-3 rtl:mr-3 text-sm text-muted-foreground truncate">
                                            {imageFileName || t('noFileChosen')}
                                        </span>
                                    </label>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{t('imageUploadHelper')}</p>
                                {imageError && <p className="text-destructive text-sm mt-1">{imageError}</p>}
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">{t('worksAtLocations')}</label>
                        <div className="p-3 bg-muted/30 rounded-lg border border-border space-y-2 max-h-40 overflow-y-auto">
                            {locations.map(location => (
                                <div key={location.id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`staff-location-${location.id}`}
                                        checked={assignedLocationIds.includes(location.id)}
                                        onChange={() => handleLocationAssignmentChange(location.id)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor={`staff-location-${location.id}`} className="ml-3 block text-sm text-foreground">
                                        {location.name}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>


                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">{t('servicesProvidedLabel')}</label>
                        <div className="p-3 bg-muted/30 rounded-lg border border-border space-y-2 max-h-52 overflow-y-auto">
                            {allServices.length > 0 ? (
                                allServices.map(service => (
                                    <div key={service.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                                        <label className="flex items-center space-x-3 cursor-pointer flex-grow">
                                            <input
                                                type="checkbox"
                                                checked={assignedServiceIds.includes(service.id)}
                                                onChange={() => handleServiceAssignmentChange(service.id)}
                                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm text-foreground">{service.name} <span className="text-xs text-muted-foreground">({formatDuration(service.duration)}, {formatPrice(service.price, business?.currency || 'USD')})</span></span>
                                        </label>
                                        <div className="flex items-center space-x-1">
                                             <Button type="button" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditingService(service); setIsServiceModalOpen(true); }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>
                                            </Button>
                                            <Button type="button" variant="ghost" className="h-7 w-7 p-0 text-destructive/70 hover:text-destructive" onClick={() => handleDeleteServiceClick(service.id)}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">{t('noServicesMessage')}</p>
                            )}
                        </div>
                        <div className="text-right mt-2">
                             <Button type="button" variant="secondary" onClick={() => { setEditingService(null); setIsServiceModalOpen(true); }}>{t('addNewServiceButton')}</Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label={t('workingHoursStartLabel')} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
                        <Input label={t('workingHoursEndLabel')} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">{t('daysOffLabel')}</label>
                        <div className="flex flex-wrap gap-2">
                            {daysOfWeek.map(day => {
                                const isClosed = closedDays.includes(day);
                                return (
                                    <button
                                        type="button"
                                        key={day}
                                        onClick={() => handleClosedDayChange(day)}
                                        aria-pressed={isClosed}
                                        className={`flex-grow basis-16 sm:flex-grow-0 px-3 py-2 text-sm font-medium rounded-md transition-colors text-center focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:focus:ring-offset-background ${
                                            isClosed 
                                            ? 'bg-primary text-primary-foreground shadow hover:bg-primary/90' 
                                            : 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80'
                                        }`}
                                    >
                                        <span className="capitalize">{t(day)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </form>
        </Modal>

        <ServiceModal
            isOpen={isServiceModalOpen}
            onClose={() => setIsServiceModalOpen(false)}
            onSubmit={handleServiceSubmit}
            service={editingService}
            isSubmitting={isSubmittingService}
        />
    </>
  );
};

export default StaffModal;
