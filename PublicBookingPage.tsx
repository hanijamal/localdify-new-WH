import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Business, Service, Booking, BookingStatus, DayOfWeek, StaffMember, ServiceCategory } from './types';
import { getBusinessBySlug, getServicesForBusiness, createBooking, getBookingsForDay, getStaffForBusiness, getCategoriesForBusiness } from './services/supabaseService';
import Card, { CardContent, CardHeader } from './components/ui/Card';
import Input from './components/ui/Input';
import Button from './components/ui/Button';
import Spinner from './components/ui/Spinner';
import Calendar from './components/ui/Calendar';
import Modal from './components/ui/Modal';
import { useLanguage } from './hooks/useLanguage';
import Dropdown, { DropdownItem } from './components/ui/Dropdown';
import { formatPrice, formatDuration } from './contexts/BusinessContext';
import Accordion from './components/ui/Accordion';


const SocialIcons: React.FC<{ socials: Business['socials'] }> = ({ socials }) => {
    if (!socials || Object.values(socials).every(v => !v)) {
        return null;
    }

    const cleanWhatsAppLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`;

    return (
        <div className="mt-4 flex items-center justify-center space-x-4 text-muted-foreground">
            {socials.website && (
                <a href={socials.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors" aria-label="Website">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                </a>
            )}
            {socials.instagram && (
                <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors" aria-label="Instagram">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.07-1.645-.07-4.85s.012-3.584.07-4.85c.149-3.225 1.664 4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163zm0 1.44s-3.442.008-4.695.064c-2.913.13-4.14 1.353-4.27 4.27C3.008 9.204 3 9.558 3 12s.008 2.796.064 4.05c.13 2.913 1.354 4.14 4.27 4.27 1.253.056 4.695.064 4.695.064s3.442-.008 4.695-.064c2.913-.13 4.14-1.354 4.27-4.27.056-1.253.064-2.695.064-4.05s-.008-2.796-.064-4.05c-.13-2.913-1.354-4.14-4.27-4.27C15.442 3.611 12 3.603 12 3.603zm0 4.262a4.135 4.135 0 100 8.27 4.135 4.135 0 000-8.27zm0 6.832a2.697 2.697 0 110-5.394 2.697 2.697 0 010 5.394zm4.965-7.73a.96.96 0 100 1.92.96.96 0 000-1.92z" />
                    </svg>
                </a>
            )}
             {socials.facebook && (
                <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors" aria-label="Facebook">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                    </svg>
                </a>
            )}
            {socials.whatsapp && (
                <a href={cleanWhatsAppLink(socials.whatsapp)} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors" aria-label="WhatsApp">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.505 1.905 6.431l-1.287 4.705 4.752-1.247zm11.39-5.762c-.229-.115-1.354-.667-1.565-.742-.211-.074-.367-.115-.523.116-.157.232-.592.742-.727.889-.135.146-.27.165-.5.05-.229-.115-.962-.354-1.833-1.13-.68-.593-1.144-1.324-1.279-1.541-.135-.217-.014-.33.101-.444.102-.102.229-.26.344-.39.115-.13.156-.231.231-.387.075-.156.038-.288-.018-.402-.057-.115-.523-1.254-.718-1.711-.195-.457-.39-.395-.523-.402-.134-.007-.289-.007-.445-.007-.156 0-.402.057-.613.288-.211.231-.808.79-1.061 2.066-.252 1.275.211 2.531.231 2.688.02.156.511 1.667 3.303 3.328 2.091 1.202 2.79 1.625 3.36.195.57-.231.962-.925 1.09-1.275.128-.35.128-.65.09-.742z" />
                    </svg>
                </a>
            )}
        </div>
    );
};

const GalleryCarousel: React.FC<{ images: string[], onImageClick: (url: string) => void }> = ({ images, onImageClick }) => {
    const { t } = useLanguage();
    const [currentIndex, setCurrentIndex] = useState(0);
  
    if (!images || images.length === 0) {
      return null;
    }
  
    const goToPrevious = () => {
      const isFirstSlide = currentIndex === 0;
      const newIndex = isFirstSlide ? images.length - 1 : currentIndex - 1;
      setCurrentIndex(newIndex);
    };
  
    const goToNext = () => {
      const isLastSlide = currentIndex === images.length - 1;
      const newIndex = isLastSlide ? 0 : currentIndex + 1;
      setCurrentIndex(newIndex);
    };
  
    const goToSlide = (slideIndex: number) => {
      setCurrentIndex(slideIndex);
    };
  
    return (
      <div className="my-8">
          <h2 className="text-xl font-semibold text-center mb-4">{t('ourWork')}</h2>
          <div className="relative w-full h-64 md:h-80 group rounded-lg overflow-hidden shadow-md">
              <div 
                  style={{ backgroundImage: `url(${images[currentIndex]})` }} 
                  className="w-full h-full bg-center bg-cover duration-500 transition-transform group-hover:scale-105 cursor-pointer"
                  onClick={() => onImageClick(images[currentIndex])}
              ></div>
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/20"></div>
  
              {/* Left Arrow */}
              <button aria-label="Previous image" onClick={goToPrevious} className="hidden group-hover:flex items-center justify-center absolute top-1/2 -translate-y-1/2 left-3 text-2xl rounded-full p-2 bg-black/50 text-white cursor-pointer hover:bg-black/70 transition-colors z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              </button>
              {/* Right Arrow */}
              <button aria-label="Next image" onClick={goToNext} className="hidden group-hover:flex items-center justify-center absolute top-1/2 -translate-y-1/2 right-3 text-2xl rounded-full p-2 bg-black/50 text-white cursor-pointer hover:bg-black/70 transition-colors z-10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
              {/* Dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
                  {images.map((_, slideIndex) => (
                      <button 
                          key={slideIndex} 
                          aria-label={`Go to image ${slideIndex + 1}`}
                          onClick={() => goToSlide(slideIndex)} 
                          className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all duration-300 ${currentIndex === slideIndex ? 'bg-white scale-125' : 'bg-white/60 hover:bg-white'}`}
                      ></button>
                  ))}
              </div>
          </div>
      </div>
    );
};

const languages = [
    { code: 'ar', name: 'العربية ', flag: '' },
    { code: 'en', name: 'English', flag: '' },
    { code: 'fr', name: 'Français ', flag: '' },
    //{ code: 'pt-BR', name: 'Português ', flag: '' }
];

const ChevronDownIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);

const PublicBookingPage: React.FC = () => {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const { t, setLanguage, language } = useLanguage();
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!businessSlug) {
      setError('Business not found.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const businessData = await getBusinessBySlug(businessSlug);
        if (businessData) {
          setBusiness(businessData);
          const [servicesData, staffData, categoriesData] = await Promise.all([
            getServicesForBusiness(businessData.id),
            getStaffForBusiness(businessData.id),
            getCategoriesForBusiness(businessData.id)
          ]);
          setServices(servicesData);
          setStaff(staffData);
          setCategories(categoriesData);
        } else {
          setError('Business not found.');
        }
      } catch (err: unknown) {
        // FIX: Safely handle unknown error by checking for an error message.
        // FIX: Safely handle unknown error by checking for an error message.
        const message = err instanceof Error ? err.message : 'Failed to load business information.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [businessSlug]);

  useEffect(() => {
    const root = document.documentElement;
    // Store original values to restore them on cleanup
    const originalPrimary = root.style.getPropertyValue('--primary');
    const originalSecondary = root.style.getPropertyValue('--secondary');

    // Apply theme settings colors if they exist
    if (business?.themeSettings) {
        const { primaryColor, secondaryColor } = business.themeSettings;
        if (primaryColor) {
            root.style.setProperty('--primary', primaryColor);
        }
        if (secondaryColor) {
            root.style.setProperty('--secondary', secondaryColor);
        }
    }
    
    // Inject custom template CSS if it exists
    if (business?.cssContent) {
      const styleTag = document.createElement('style');
      styleTag.id = 'custom-template-css';
      styleTag.innerHTML = business.cssContent;
      document.head.appendChild(styleTag);
    }

    // Cleanup function to run when component unmounts or business changes
    return () => {
        // Restore original colors
        root.style.setProperty('--primary', originalPrimary);
        root.style.setProperty('--secondary', originalSecondary);

        // Remove the custom template stylesheet
        const existingTag = document.getElementById('custom-template-css');
        if (existingTag) {
            existingTag.remove();
        }
    };
  }, [business]);
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
  }

  if (error && !business) {
    return <div className="text-center mt-10 text-destructive">{error}</div>;
  }

  if (!business) {
    return <div className="text-center mt-10 text-muted-foreground">Business not found.</div>;
  }

  const hasCoverImage = !!business.themeSettings?.coverImageUrl;
  const currentLanguage = languages.find(l => l.code === language) || languages[0];

  const languageDropdown = (
    <Dropdown
        trigger={
            <button className={`flex items-center space-x-2 p-2 rounded-lg focus:outline-none transition-colors ${hasCoverImage ? 'bg-black/30 backdrop-blur-sm text-white hover:bg-black/50' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
                <span className="text-lg">{currentLanguage.flag}</span>
                <span className="text-sm font-medium hidden sm:inline">{currentLanguage.name}</span>
                <ChevronDownIcon />
            </button>
        }
    >
        {languages.map(lang => (
            <DropdownItem
                key={lang.code}
                onClick={() => setLanguage(lang.code as any)}
                className={`flex items-center space-x-2 ${language === lang.code ? 'bg-accent font-semibold text-accent-foreground' : ''}`}
            >
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.name}</span>
            </DropdownItem>
        ))}
    </Dropdown>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <Card className="bg-card shadow-lg rounded-lg border-border relative overflow-hidden">
            <div className="absolute top-2 sm:top-4 rtl:sm:left-4 ltr:sm:right-4 rtl:left-2 ltr:right-2 z-20">
              {languageDropdown}
            </div>
            <CardHeader className="border-b border-border text-center relative p-6">
                {hasCoverImage && (
                <>
                    <div className="absolute inset-0 z-0">
                        <img src={business.themeSettings!.coverImageUrl} alt={`${business.name} cover`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40"></div>
                    </div>
                    {/* Use inline style to ensure text is readable on cover image */}
                    <style>{`.cover-text { color: white !important; } .cover-muted { color: #d1d5db !important; } .cover-muted a { color: #d1d5db !important; } .cover-muted a:hover { color: var(--primary) !important; }`}</style>
                </>
                )}
                <div className="relative z-10">
                    {business.imageUrl && (
                        <img src={business.imageUrl} alt={business.name} className="w-32 h-32 object-cover mb-4 rounded-full mx-auto border-4 border-card shadow-md"/>
                    )}
                    <h1 className={`text-3xl font-bold ${hasCoverImage ? 'cover-text' : 'text-foreground'}`}>{business.name}</h1>
                    <p className={`mt-2 ${hasCoverImage ? 'cover-muted' : 'text-muted-foreground'}`}>{business.description}</p>
                    {/* FIX: Removed obsolete business.address property */}
                    <div className={hasCoverImage ? 'cover-muted' : ''}>
                        <SocialIcons socials={business.socials} />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
              {business.galleryImages && business.galleryImages.length > 0 && (
                <GalleryCarousel images={business.galleryImages} onImageClick={setSelectedImage} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
       <footer className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
              {t('poweredBy')} <a href="https://localdify.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">localDify</a>
          </p>
      </footer>
      <Modal isOpen={!!selectedImage} onClose={() => setSelectedImage(null)} title={t('imagePreview')} size="full">
          <div className="w-full h-full flex items-center justify-center bg-background/50 p-4" onClick={() => setSelectedImage(null)}>
              {selectedImage && (
                  <img 
                      src={selectedImage} 
                      alt="Enlarged gallery view" 
                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                  />
              )}
          </div>
      </Modal>
    </div>
  );
};

export default PublicBookingPage;