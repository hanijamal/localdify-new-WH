import React, { useState, useEffect } from 'react';
import { Service, ServiceCategory } from '../types';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import { useLanguage } from '../hooks/useLanguage';
import { useBusiness } from '../hooks/useBusiness';
import Select from './ui/Select';
import { formatDuration } from '../contexts/BusinessContext';
import { addCategory } from '../services/supabaseService';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service | null;
  // FIX: Add onSubmit and isSubmitting to make the component controlled and fix type errors.
  onSubmit: (serviceData: Partial<Service>) => Promise<void>;
  isSubmitting: boolean;
}

const ServiceModal: React.FC<ServiceModalProps> = ({ isOpen, onClose, service, onSubmit, isSubmitting }) => {
  const { t } = useLanguage();
  const { business, categories, locations, addCategoryContext } = useBusiness();
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | undefined>('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [assignedLocationIds, setAssignedLocationIds] = useState<string[]>([]);
  
  const [imageError, setImageError] = useState('');
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const MAX_IMAGE_SIZE_KB = 100;

  useEffect(() => {
    if (isOpen) {
        if (service) {
          setName(service.name);
          setDuration(String(service.duration));
          setPrice(String(service.price));
          setDescription(service.description || '');
          setImageUrl(service.imageUrl || null);
          setCategoryId(service.categoryId || '');
          setAssignedLocationIds(service.locationIds || []);
        } else {
          // Reset for "Add" mode
          setName('');
          setDuration('');
          setPrice('');
          setDescription('');
          setImageUrl(null);
          setCategoryId('');
          setAssignedLocationIds([]);
        }
        setImageError('');
        setImageFileName(null);
        setNewCategoryName('');
    }
  }, [service, isOpen]);

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
    
    try {
        let finalCategoryId = categoryId;
        if (categoryId === 'new' && newCategoryName) {
            const newCategory = await addCategory({ businessId: business.id, name: newCategoryName });
            addCategoryContext(newCategory);
            finalCategoryId = newCategory.id;
        }

        const serviceData: Partial<Service> = {
          name,
          duration: parseInt(duration, 10),
          price: parseFloat(price),
          description,
          imageUrl,
          categoryId: finalCategoryId === 'new' ? undefined : finalCategoryId || null,
          locationIds: assignedLocationIds,
        };

        await onSubmit(serviceData);
    } catch (error) {
        console.error("Failed to save service", error);
    }
  };

  const imagePlaceholder = (
    <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    </div>
  );

  const modalFooter = (
    <>
      <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>{t('cancelButton')}</Button>
      <Button form="service-form" type="submit" isLoading={isSubmitting}>{service ? t('saveChangesButton') : t('addServiceButton')}</Button>
    </>
  );

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={service ? t('editServiceTitle') : t('addServiceTitle')} 
        widthClass="max-w-xl"
        footer={modalFooter}
        scrollable
    >
      <form id="service-form" onSubmit={handleSubmit}>
        <div className="p-6 space-y-4">
          <Input label={t('serviceNameLabel')} value={name} onChange={e => setName(e.target.value)} required/>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
                label={t('durationLabel')} 
                type="number" 
                min="1" 
                value={duration} 
                onChange={e => setDuration(e.target.value)} 
                required 
                helperText={duration ? `${t('whichIs')} ${formatDuration(parseInt(duration, 10))}` : t('durationInMinutesHelper')}
            />
            <Input label={`${t('priceLabel')} (${business?.currency || 'USD'})`} type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required />
          </div>
          <Select label="Category" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">Uncategorized</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            <option value="new">-- Add New Category --</option>
          </Select>
          {categoryId === 'new' && (
            <Input label="New Category Name" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} required />
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('availableAtLocations')}</label>
            <div className="p-3 bg-muted/30 rounded-lg border border-border space-y-2 max-h-40 overflow-y-auto">
                {locations.map(location => (
                    <div key={location.id} className="flex items-center">
                        <input
                            type="checkbox"
                            id={`service-location-${location.id}`}
                            checked={assignedLocationIds.includes(location.id)}
                            onChange={() => handleLocationAssignmentChange(location.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor={`service-location-${location.id}`} className="ml-3 block text-sm text-foreground">
                            {location.name}
                        </label>
                    </div>
                ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('serviceDescLabel')}</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder={t('serviceDescPlaceholder')}
              className="block w-full px-3 py-2 bg-card border border-input rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">{t('serviceImageLabel')}</label>
            <div className="flex items-center space-x-4">
              {imageUrl ? (
                <div className="relative group flex-shrink-0">
                  <img src={imageUrl} alt="Service preview" className="w-24 h-24 object-cover rounded-md" />
                  <button
                    type="button"
                    onClick={() => { setImageUrl(null); setImageFileName(null); }}
                    className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                imagePlaceholder
              )}
               <div className="flex-1">
                    <div className="relative">
                        <input
                            type="file"
                            id="service-image-upload"
                            accept="image/jpeg"
                            onChange={handleImageUpload}
                            className="absolute w-0 h-0 opacity-0 peer"
                        />
                        <label 
                            htmlFor="service-image-upload" 
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
        </div>
      </form>
    </Modal>
  );
};

export default ServiceModal;
