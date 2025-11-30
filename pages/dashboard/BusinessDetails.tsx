

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { createOrUpdateBusiness, verifyCustomDomain } from '../../services/supabaseService';
// FIX: Removed DayOfWeek from imports as it's no longer used here.
import { Business, ThemeSettings } from '../../types';
import Spinner from '../../components/ui/Spinner';
import Card, { CardContent, CardHeader, CardFooter } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Accordion from '../../components/ui/Accordion';
import { useBusiness } from '../../hooks/useBusiness';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import { useLanguage } from '../../hooks/useLanguage';

const classicTemplateThemeSettings: ThemeSettings = {
    templateId: 'classic-template',
    primaryColor: '#644a40',
    backgroundColor: '#f9f9f9',
    cardColor: '#fcfcfc',
    textColor: '#202020',
    fontFamily: 'Lora',
    borderRadius: 8,
    customCss: '',
    secondaryColor: '#004050',
    coverImageUrl: '',
};

const BusinessDetails: React.FC = () => {
    const { user } = useAuth();
    const { business, loading, refetch, setBusiness } = useBusiness();
    const { t } = useLanguage();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Business Details State
    const [businessName, setBusinessName] = useState('');
    const [slug, setSlug] = useState('');
    const [businessDescription, setBusinessDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [galleryImages, setGalleryImages] = useState<string[]>([]);
    const [currency, setCurrency] = useState('USD');
    const [isSavingCurrency, setIsSavingCurrency] = useState(false);
    const [currencyStatus, setCurrencyStatus] = useState('');
    const [socials, setSocials] = useState({
        website: '',
        instagram: '',
        facebook: '',
        whatsapp: '',
    });
    
    // Theme Settings State
    const [primaryColor, setPrimaryColor] = useState('#00cc61');
    const [secondaryColor, setSecondaryColor] = useState('#004050');
    const [coverImageUrl, setCoverImageUrl] = useState('');
    const [coverImageFileName, setCoverImageFileName] = useState<string | null>(null);

    // Calendar Settings State
    const [bookingInAdvanceDays, setBookingInAdvanceDays] = useState(90);
    const [minBookingNoticeHours, setMinBookingNoticeHours] = useState(4);
    const [bufferTimeMinutes, setBufferTimeMinutes] = useState(15);
    const [timeSlotInterval, setTimeSlotInterval] = useState(30);
    
    // Public Page State
    const [publicBookingLink, setPublicBookingLink] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);
    const [isSubmittingLink, setIsSubmittingLink] = useState(false);
    const [linkError, setLinkError] = useState('');
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    
    // Image Validation State
    const [imageErrors, setImageErrors] = useState({ business: '', gallery: '', newService: '', cover: '' });
    const [businessImageFileName, setBusinessImageFileName] = useState<string | null>(null);
    const [galleryImageFileName, setGalleryImageFileName] = useState<string | null>(null);

    // Custom Domain State
    const [customDomainInput, setCustomDomainInput] = useState('');
    const [isSavingDomain, setIsSavingDomain] = useState(false);
    const [isVerifyingDomain, setIsVerifyingDomain] = useState(false);
    const [domainMessage, setDomainMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    
    const MAX_GALLERY_IMAGES = 5;
    const MAX_IMAGE_SIZE_KB = 100;

    useEffect(() => {
        if (business) {
            setBusinessName(business.name);
            setSlug(business.slug || '');
            setBusinessDescription(business.description || '');
            setImageUrl(business.imageUrl || '');
            setGalleryImages(business.galleryImages || []);
            setCurrency(business.currency || 'USD');
            setSocials({
                website: business.socials?.website || '',
                instagram: business.socials?.instagram || '',
                facebook: business.socials?.facebook || '',
                whatsapp: business.socials?.whatsapp || '',
            });
            if (business.themeSettings) {
                setPrimaryColor(business.themeSettings.primaryColor || '#00cc61');
                setSecondaryColor(business.themeSettings.secondaryColor || '#004050');
                setCoverImageUrl(business.themeSettings.coverImageUrl || '');
            }
            if (business.calendarSettings) {
                setBookingInAdvanceDays(business.calendarSettings.bookingInAdvanceDays);
                setMinBookingNoticeHours(business.calendarSettings.minBookingNoticeHours);
                setBufferTimeMinutes(business.calendarSettings.bufferTimeMinutes);
                setTimeSlotInterval(business.calendarSettings.timeSlotInterval || 30);
            }
            setCustomDomainInput(business.customDomain || '');
        }
    }, [business]);
    
    useEffect(() => {
        const origin = window.location.origin;
        if (slug) {
            setPublicBookingLink(`${origin}/#/b/${slug}`);
        } else {
            setPublicBookingLink('');
        }
    }, [slug]);

    const handleCurrencyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newCurrency = e.target.value;
        if (!user || !business) return;

        const oldCurrency = business.currency; // Store old currency for rollback
        
        setIsSavingCurrency(true);
        setCurrencyStatus('');
        
        // Optimistic UI update
        setCurrency(newCurrency);
        setBusiness(prev => prev ? { ...prev, currency: newCurrency } : null);

        try {
            // FIX: Added the missing 'userId' property to the payload to match the expected type for 'createOrUpdateBusiness'.
            await createOrUpdateBusiness({ id: business.id, userId: user.id, currency: newCurrency });
            await refetch();
            setCurrencyStatus(t('currencyUpdateSuccess'));
            setTimeout(() => setCurrencyStatus(''), 3000);
        } catch (error: any) {
            console.error("Failed to update currency:", error.message);
            setCurrencyStatus(t('currencyUpdateError'));
            setBusiness(prev => prev ? { ...prev, currency: oldCurrency } : null);
            setCurrency(oldCurrency);
        } finally {
            setIsSavingCurrency(false);
        }
    };
    
    const handleBusinessSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSubmitting(true);
        try {
            // FIX: Removed address, workingHours, and closedDays from payload as they are location-specific.
            const payload: Partial<Business> & { userId: string } = {
                id: business?.id,
                userId: user.id,
                name: businessName,
                description: businessDescription,
                imageUrl,
                galleryImages,
                currency,
                socials,
                calendarSettings: {
                    bookingInAdvanceDays: Number(bookingInAdvanceDays),
                    minBookingNoticeHours: Number(minBookingNoticeHours),
                    bufferTimeMinutes: Number(bufferTimeMinutes),
                    timeSlotInterval: Number(timeSlotInterval)
                },
                themeSettings: {
                    ...(business?.themeSettings || classicTemplateThemeSettings),
                    primaryColor: primaryColor,
                    secondaryColor: secondaryColor,
                    coverImageUrl: coverImageUrl,
                }
            };

            await createOrUpdateBusiness(payload);
            await refetch();
        } catch (error: any) {
            console.error("Failed to save business settings:", error.message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleLinkSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !business) return;
        setIsSubmittingLink(true);
        setLinkError('');
        try {
            const payload: Partial<Business> & { userId: string } = {
                id: business.id,
                userId: user.id,
                slug: slug,
            };

            await createOrUpdateBusiness(payload);
            await refetch();
        } catch (error: any) {
            console.error("Failed to save link:", error.message);
            setLinkError(error.message || 'An unexpected error occurred.');
        } finally {
            setIsSubmittingLink(false);
        }
    };

    const copyLinkToClipboard = (link: string) => {
        navigator.clipboard.writeText(link);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageErrors(prev => ({ ...prev, business: '' }));
            if (file.type !== 'image/jpeg') {
                setImageErrors(prev => ({ ...prev, business: 'Only JPG images are allowed.' }));
                return;
            }
            if (file.size > MAX_IMAGE_SIZE_KB * 1024) {
                setImageErrors(prev => ({ ...prev, business: `Image must be under ${MAX_IMAGE_SIZE_KB}KB.` }));
                return;
            }
            setBusinessImageFileName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleGalleryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            setImageErrors(prev => ({ ...prev, gallery: '' }));
            let currentErrors: string[] = [];
            let validFiles: File[] = [];

            if (galleryImages.length + files.length > MAX_GALLERY_IMAGES) {
                currentErrors.push(`You can only upload up to ${MAX_GALLERY_IMAGES} images.`);
            }

            const availableSlots = MAX_GALLERY_IMAGES - galleryImages.length;
            
            for (let i = 0; i < Math.min(files.length, availableSlots); i++) {
                const file = files.item(i);
                if (file) {
                    if (file.type !== 'image/jpeg') {
                        currentErrors.push(`${file.name} is not a JPG.`);
                        continue;
                    }
                    if (file.size > MAX_IMAGE_SIZE_KB * 1024) {
                        currentErrors.push(`${file.name} is over ${MAX_IMAGE_SIZE_KB}KB.`);
                        continue;
                    }
                    validFiles.push(file);
                }
            }
            
            if (currentErrors.length > 0) {
                setImageErrors(prev => ({ ...prev, gallery: currentErrors.join(' ') }));
            }

            if (files.length > 0) {
                setGalleryImageFileName(files.length > 1 ? `${files.length} files chosen` : files[0].name);
            } else {
                setGalleryImageFileName(null);
            }

            validFiles.forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setGalleryImages(prev => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
        e.target.value = '';
    };

    const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageErrors(prev => ({ ...prev, cover: '' }));
            if (file.type !== 'image/jpeg') {
                setImageErrors(prev => ({ ...prev, cover: 'Only JPG images are allowed.' }));
                return;
            }
            if (file.size > MAX_IMAGE_SIZE_KB * 1024) {
                setImageErrors(prev => ({ ...prev, cover: `Image must be under ${MAX_IMAGE_SIZE_KB}KB.` }));
                return;
            }
            setCoverImageFileName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                setCoverImageUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };
    
    const handleRemoveGalleryImage = (indexToRemove: number) => {
        setGalleryImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handlePreview = () => {
        if (publicBookingLink) {
            window.open(publicBookingLink, '_blank');
        }
    };

    const handleSaveDomain = async () => {
        if (!business || !user || !customDomainInput) return;
        setIsSavingDomain(true);
        setDomainMessage(null);
        try {
            await createOrUpdateBusiness({
                id: business.id,
                userId: user.id,
                customDomain: customDomainInput,
                customDomainStatus: 'pending'
            });
            await refetch();
            setDomainMessage({ type: 'success', text: 'Domain saved. Please configure your DNS records.' });
        } catch (err: any) {
            setDomainMessage({ type: 'error', text: err.message });
        } finally {
            setIsSavingDomain(false);
        }
    };
    
    const handleVerifyDomain = async () => {
        if (!business || !business.customDomain) return;
        setIsVerifyingDomain(true);
        setDomainMessage(null);
        try {
            const result = await verifyCustomDomain(business.customDomain);
            await refetch();
            setDomainMessage({ type: result.success ? 'success' : 'error', text: result.message });
        } catch (err: any) {
            setDomainMessage({ type: 'error', text: err.message });
        } finally {
            setIsVerifyingDomain(false);
        }
    };
    
    const handleRemoveDomain = async () => {
        if (!business || !user) return;
        if (!window.confirm('Are you sure you want to remove your custom domain?')) return;
        setIsSavingDomain(true);
        setDomainMessage(null);
        try {
            await createOrUpdateBusiness({
                id: business.id,
                userId: user.id,
                customDomain: null,
                customDomainStatus: null
            });
            await refetch();
            setCustomDomainInput('');
        } catch (err: any) {
            setDomainMessage({ type: 'error', text: err.message });
        } finally {
            setIsSavingDomain(false);
        }
    }
    
    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    const imagePlaceholder = (
        <div className="w-24 h-24 bg-muted rounded-md flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-4">
            <Accordion title={t('businessDetails')} defaultOpen={!business}>
                <form onSubmit={handleBusinessSubmit}>
                    <div className="p-4 sm:p-6 space-y-6">
                         <p className="text-sm text-muted-foreground -mt-2">{t('businessDetailsDesc')}</p>
                        <Input label={t('businessNameLabel')} value={businessName} onChange={e => setBusinessName(e.target.value)} required />
                        <Select
                            label={t('currency')}
                            id="currency"
                            value={currency}
                            onChange={handleCurrencyChange}
                            disabled={isSavingCurrency}
                            helperText={t('currencyHelper')}
                        >
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="BRL">BRL - Brazilian Real</option>
                            <option value="SAR">SAR - Saudi Riyal</option>
                            <option value="MAD">MAD - Moroccan Dirham</option>
                        </Select>
                        {isSavingCurrency && <p className="text-sm text-muted-foreground -mt-4">{t('saving')}...</p>}
                        {currencyStatus && <p className={`text-sm -mt-4 ${currencyStatus.includes('successfully') ? 'text-green-600' : 'text-destructive'}`}>{currencyStatus}</p>}

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">{t('descriptionLabel')}</label>
                            <textarea
                                value={businessDescription}
                                onChange={e => setBusinessDescription(e.target.value)}
                                rows={4}
                                className="block w-full px-3 py-2 bg-card border border-input rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-foreground mb-1">{t('businessPhotoLabel')}</label>
                            <div className="flex items-center space-x-4">
                                {imageUrl ? (
                                    <div className="relative group">
                                        <img src={imageUrl} alt="Business preview" className="w-24 h-24 object-cover rounded-md" />
                                        <button
                                            type="button"
                                            onClick={() => { setImageUrl(''); setBusinessImageFileName(null); }}
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
                                            id="business-image-upload"
                                            accept="image/jpeg"
                                            onChange={handleImageUpload}
                                            className="absolute w-0 h-0 opacity-0 peer"
                                        />
                                        <label 
                                            htmlFor="business-image-upload" 
                                            className="flex items-center w-full h-10 px-3 bg-card border border-input rounded-md shadow-sm cursor-pointer focus-within:ring-1 focus-within:ring-ring"
                                        >
                                            <span className="inline-block bg-primary/10 text-primary hover:bg-primary/20 text-sm font-semibold px-3 py-1 rounded-md transition-colors">
                                                {t('chooseFile')}
                                            </span>
                                            <span className="ltr:ml-3 rtl:mr-3 text-sm text-muted-foreground truncate">
                                                {businessImageFileName || t('noFileChosen')}
                                            </span>
                                        </label>
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">{t('imageUploadHelper')}</p>
                                    {imageErrors.business && <p className="text-destructive text-sm mt-1">{imageErrors.business}</p>}
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-border pt-6">
                            <h3 className="text-lg font-medium text-foreground mb-4">{t('brandCustomization')}</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">{t('brandColors')}</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                            <input 
                                                type="color" 
                                                id="primaryColor" 
                                                value={primaryColor} 
                                                onChange={e => setPrimaryColor(e.target.value)}
                                                className="w-10 h-10 p-1 border border-input rounded-md cursor-pointer"
                                            />
                                            <div>
                                                <label htmlFor="primaryColor" className="text-sm font-medium text-foreground">{t('primaryColor')}</label>
                                                <p className="text-xs text-muted-foreground font-mono">{primaryColor}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                            <input 
                                                type="color" 
                                                id="secondaryColor" 
                                                value={secondaryColor} 
                                                onChange={e => setSecondaryColor(e.target.value)}
                                                className="w-10 h-10 p-1 border border-input rounded-md cursor-pointer"
                                            />
                                            <div>
                                                <label htmlFor="secondaryColor" className="text-sm font-medium text-foreground">{t('secondaryColor')}</label>
                                                <p className="text-xs text-muted-foreground font-mono">{secondaryColor}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">{t('coverImageLabel')}</label>
                                    <div className="flex items-center space-x-4">
                                        {coverImageUrl ? (
                                            <div className="relative group">
                                                <img src={coverImageUrl} alt="Cover preview" className="w-24 h-24 object-cover rounded-md" />
                                                <button
                                                    type="button"
                                                    onClick={() => { setCoverImageUrl(''); setCoverImageFileName(null); }}
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
                                                    id="cover-image-upload"
                                                    accept="image/jpeg"
                                                    onChange={handleCoverImageUpload}
                                                    className="absolute w-0 h-0 opacity-0 peer"
                                                />
                                                <label 
                                                    htmlFor="cover-image-upload" 
                                                    className="flex items-center w-full h-10 px-3 bg-card border border-input rounded-md shadow-sm cursor-pointer focus-within:ring-1 focus-within:ring-ring"
                                                >
                                                    <span className="inline-block bg-primary/10 text-primary hover:bg-primary/20 text-sm font-semibold px-3 py-1 rounded-md transition-colors">
                                                        {t('chooseFile')}
                                                    </span>
                                                    <span className="ltr:ml-3 rtl:mr-3 text-sm text-muted-foreground truncate">
                                                        {coverImageFileName || t('noFileChosen')}
                                                    </span>
                                                </label>
                                            </div>
                                            <p className="mt-1 text-xs text-muted-foreground">{t('imageUploadHelper')}</p>
                                            {imageErrors.cover && <p className="text-destructive text-sm mt-1">{imageErrors.cover}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">{t('galleryImagesLabel')}</label>
                             <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-4">
                                {galleryImages.map((img, index) => (
                                    <div key={index} className="relative group aspect-square">
                                        <img src={img} alt={`Gallery image ${index + 1}`} className="w-full h-full object-cover rounded-md" />
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveGalleryImage(index)}
                                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            aria-label="Remove image"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4">
                                <div className="relative">
                                    <input
                                        type="file"
                                        id="gallery-image-upload"
                                        accept="image/jpeg"
                                        multiple
                                        onChange={handleGalleryImageUpload}
                                        className="absolute w-0 h-0 opacity-0 peer"
                                        disabled={galleryImages.length >= MAX_GALLERY_IMAGES}
                                    />
                                    <label 
                                        htmlFor="gallery-image-upload" 
                                        className={`flex items-center w-full h-10 px-3 bg-card border border-input rounded-md shadow-sm focus-within:ring-1 focus-within:ring-ring ${galleryImages.length >= MAX_GALLERY_IMAGES ? 'cursor-not-allowed bg-muted' : 'cursor-pointer'}`}
                                    >
                                        <span className={`inline-block text-sm font-semibold px-3 py-1 rounded-md transition-colors ${galleryImages.length >= MAX_GALLERY_IMAGES ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>
                                            {t('chooseFile')}
                                        </span>
                                        <span className="ltr:ml-3 rtl:mr-3 text-sm text-muted-foreground truncate">
                                            {galleryImageFileName || t('noFileChosen')}
                                        </span>
                                    </label>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">{t('galleryImagesHelper')}</p>
                                {imageErrors.gallery && <p className="text-destructive text-sm mt-1">{imageErrors.gallery}</p>}
                            </div>
                        </div>

                        <div className="border-t border-border pt-6">
                            <label className="block text-lg font-medium text-foreground mb-4">{t('socialMediaLinks')}</label>
                            <div className="space-y-4">
                                <Input 
                                    label={t('websiteUrlLabel')}
                                    placeholder={t('websitePlaceholder')}
                                    value={socials.website} 
                                    onChange={e => setSocials(s => ({ ...s, website: e.target.value }))}
                                />
                                <Input 
                                    label={t('instagramUrlLabel')}
                                    placeholder={t('instagramPlaceholder')}
                                    value={socials.instagram} 
                                    onChange={e => setSocials(s => ({ ...s, instagram: e.target.value }))}
                                />
                                <Input 
                                    label={t('facebookUrlLabel')} 
                                    placeholder={t('facebookPlaceholder')}
                                    value={socials.facebook} 
                                    onChange={e => setSocials(s => ({ ...s, facebook: e.target.value }))}
                                />
                                <Input 
                                    label={t('whatsappContactLabel')}
                                    placeholder={t('whatsappContactPlaceholder')} 
                                    value={socials.whatsapp} 
                                    onChange={e => setSocials(s => ({ ...s, whatsapp: e.target.value }))}
                                    helperText={t('whatsappContactHelper')}
                                />
                            </div>
                        </div>

                    </div>
                    <div className="p-4 sm:p-6 bg-muted/50 border-t border-border text-right">
                         <Button type="submit" isLoading={isSubmitting}>{t('saveChanges')}</Button>
                    </div>
                </form>
            </Accordion>
            
             {business && (
                 <Accordion title={t('calendarSettings')}>
                    <form onSubmit={handleBusinessSubmit}>
                        <div className="p-4 sm:p-6 space-y-6">
                            <p className="text-sm text-muted-foreground -mt-2">{t('calendarSettingsDesc')}</p>
                            <Input 
                                label={t('bookableInAdvanceLabel')}
                                type="number"
                                min="1"
                                value={bookingInAdvanceDays} 
                                onChange={e => setBookingInAdvanceDays(parseInt(e.target.value, 10))} 
                                required 
                                helperText={t('bookableInAdvanceHelper')}
                            />
                            <Input 
                                label={t('minBookingNoticeLabel')}
                                type="number"
                                min="0"
                                value={minBookingNoticeHours} 
                                onChange={e => setMinBookingNoticeHours(parseInt(e.target.value, 10))} 
                                required 
                                helperText={t('minBookingNoticeHelper')}
                            />
                            <Input 
                                label={t('bufferTimeLabel')}
                                type="number"
                                min="0"
                                value={bufferTimeMinutes} 
                                onChange={e => setBufferTimeMinutes(parseInt(e.target.value, 10))} 
                                required 
                                helperText={t('bufferTimeHelper')}
                            />
                            <Select 
                                label={t('timeSlotIntervalLabel')}
                                id="time-slot-interval"
                                value={timeSlotInterval}
                                onChange={e => setTimeSlotInterval(parseInt(e.target.value, 10))}
                                required 
                                helperText={t('timeSlotIntervalHelper')}
                            >
                                <option value="15">15 minutes</option>
                                <option value="30">30 minutes</option>
                                <option value="45">45 minutes</option>
                                <option value="60">60 minutes (every hour)</option>
                            </Select>
                        </div>
                        <div className="p-4 sm:p-6 bg-muted/50 border-t border-border text-right">
                             <Button type="submit" isLoading={isSubmitting}>{t('saveCalendarSettings')}</Button>
                        </div>
                    </form>
                </Accordion>
             )}
             
            {business && (
                 <Accordion title={t('domains')}>
                    <div className="p-4 sm:p-6 space-y-6">
                        <Card>
                             <form onSubmit={handleLinkSubmit}>
                                <CardHeader>
                                    <h3 className="text-lg font-semibold">{t('yourSubdomain')}</h3>
                                    <p className="text-sm text-muted-foreground">{t('yourSubdomainDesc')}</p>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label htmlFor="business-slug" className="block text-sm font-medium text-foreground mb-1">
                                            {t('bookingPageUrl')}
                                        </label>
                                        <div className="flex flex-col sm:flex-row items-stretch">
                                            <span className="h-10 inline-flex items-center px-3 rounded-t-md sm:rounded-l-md sm:rounded-tr-none border border-b-0 sm:border-r-0 border-input bg-muted text-muted-foreground text-sm whitespace-nowrap">
                                                {`${window.location.origin}/#/b/`}
                                            </span>
                                            <Input
                                                id="business-slug"
                                                value={slug}
                                                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                                placeholder={t('yourBusinessNamePlaceholder')}
                                                className="!rounded-t-none !rounded-b-md sm:!rounded-l-none sm:!rounded-r-md"
                                            />
                                        </div>
                                    </div>

                                    {linkError && <p className="text-destructive text-sm mt-2">{linkError}</p>}
                                    
                                    {publicBookingLink && (
                                        <div className="mt-4 p-3 border border-border rounded-lg bg-background flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <p className="text-sm text-foreground break-all font-mono flex-1">
                                                {publicBookingLink}
                                            </p>
                                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                                <Button onClick={() => copyLinkToClipboard(publicBookingLink)} type="button" variant="ghost" size="sm" className="p-2 h-auto" title={t('copyLink')}>
                                                    {linkCopied ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    )}
                                                </Button>
                                                <Button type="button" onClick={() => setIsQrModalOpen(true)} variant="ghost" size="sm" className="p-2 h-auto" title={t('qrCode')}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 1h1v1h-1v-1zm4 0h1v1h-1v-1zm-4 4h1v1h-1v-1zm4 0h1v1h-1v-1z" />
                                                    </svg>
                                                </Button>
                                                <Button type="button" onClick={handlePreview} variant="ghost" size="sm" className="p-2 h-auto" title={t('preview')}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                </CardContent>
                                <CardFooter className="flex justify-end">
                                    <Button type="submit" isLoading={isSubmittingLink}>
                                        {t('saveLink')}
                                    </Button>
                                </CardFooter>
                             </form>
                        </Card>
                        {/* Hiding Custom Domain Feature */}
                         {/*<Card>
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">{t('connectYourDomain')}</h3>
                                    <span className="px-2 py-0.5 text-xs font-semibold tracking-wide text-blue-800 bg-blue-100 dark:bg-blue-700 dark:text-blue-200">PRO</span>
                                </div>
                                <p className="text-sm text-muted-foreground">{t('connectYourDomainDesc')}</p>
                            </CardHeader>
                            {!business?.customDomain ? (
                                <>
                                    <CardContent>
                                        <Input
                                            label="Your Custom Domain"
                                            placeholder={t('customDomainPlaceholder')}
                                            value={customDomainInput}
                                            onChange={(e) => setCustomDomainInput(e.target.value)}
                                        />
                                    </CardContent>
                                    <CardFooter className="justify-between items-center">
                                        {domainMessage && <p className={`text-sm ${domainMessage.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>{domainMessage.text}</p>}
                                        <div className="flex-grow"></div>
                                        <Button onClick={handleSaveDomain} isLoading={isSavingDomain}>Save Domain</Button>
                                    </CardFooter>
                                </>
                            ) : (
                                <>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="font-mono text-foreground bg-muted px-3 py-1 rounded-md">{business.customDomain}</p>
                                            {business.customDomainStatus && (
                                                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full capitalize ${
                                                    business.customDomainStatus === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' :
                                                    business.customDomainStatus === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                                                }`}>
                                                    {business.customDomainStatus}
                                                </span>
                                            )}
                                        </div>

                                        {business.customDomainStatus !== 'active' && (
                                            <div className="p-4 border border-border rounded-lg bg-background space-y-3">
                                                <h4 className="font-semibold">DNS Configuration Required</h4>
                                                <p className="text-sm text-muted-foreground">To complete the setup, create a <code className="bg-muted px-1 py-0.5 rounded-sm">CNAME</code> record with your domain provider pointing to our service.</p>
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex items-center gap-2"><span className="font-semibold w-16">Type:</span> <code className="bg-muted px-2 py-1 rounded-sm">CNAME</code></div>
                                                    <div className="flex items-center gap-2"><span className="font-semibold w-16">Host:</span> <code className="bg-muted px-2 py-1 rounded-sm">{business.customDomain}</code></div>
                                                    <div className="flex items-center gap-2"><span className="font-semibold w-16">Value:</span> <code className="bg-muted px-2 py-1 rounded-sm">app.localdify.com</code></div>
                                                </div>
                                                <p className="text-xs text-muted-foreground pt-2 border-t border-border">Note: DNS changes can take up to 24 hours to propagate. Once you've set up your record, click Verify.</p>
                                            </div>
                                        )}

                                        {domainMessage && <p className={`text-sm ${domainMessage.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>{domainMessage.text}</p>}
                                    </CardContent>
                                    <CardFooter className="justify-end space-x-2">
                                        <Button variant="ghost" onClick={handleRemoveDomain} isLoading={isSavingDomain}>Remove</Button>
                                        {business.customDomainStatus !== 'active' && (
                                            <Button onClick={handleVerifyDomain} isLoading={isVerifyingDomain}>Verify</Button>
                                        )}
                                    </CardFooter>
                                </>
                            )}
                        </Card>
                        */}
                    </div>
                 </Accordion>
            )}

            {!business && !loading && (
                 <Card>
                    <CardContent className="text-center p-6">
                        <h2 className="text-xl font-bold text-foreground">{t('welcomeTitle')}</h2>
                        <p className="mt-2 text-muted-foreground">{t('welcomeDesc')}</p>
                    </CardContent>
                </Card>
            )}

            {publicBookingLink && (
                 <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title={t('shareBookingPage')}>
                    <div className="p-6 text-center space-y-4">
                        <div className="flex justify-center">
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(publicBookingLink)}`} 
                                alt="Booking Page QR Code" 
                                className="rounded-lg border-4 border-border"
                            />
                        </div>
                        <p className="text-sm text-muted-foreground break-all">{publicBookingLink}</p>
                        <a 
                            href={`https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(publicBookingLink)}`}
                            download="booking-qr-code.png"
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none px-4 py-2 bg-primary text-primary-foreground shadow hover:bg-primary/90 w-full"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2