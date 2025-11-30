
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Business, Service, Booking, BookingStatus, DayOfWeek, StaffMember, ServiceCategory, Location, ThemeSettings } from '../types';
import { getPublicLocationData, createBooking, getBookingsForDay } from '../services/supabaseService';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import Calendar from '../components/ui/Calendar';
import Modal from '../components/ui/Modal';
import { useLanguage } from '../hooks/useLanguage';
import Dropdown, { DropdownItem } from '../components/ui/Dropdown';
import { formatPrice, formatDuration } from '../contexts/BusinessContext';
import Accordion from '../components/ui/Accordion';


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

const languages = [
    { code: 'ar', name: 'العربية ', flag: '' },
    { code: 'en', name: 'English', flag: '' },
    { code: 'fr', name: 'Français ', flag: '' },
    //{ code: 'pt-BR', name: 'Português ', flag: '' }
] as const;

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
       <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
   </svg>
);

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
        <div className="relative w-full h-64 md:h-80 group rounded-lg overflow-hidden shadow-md">
            <div 
                style={{ backgroundImage: `url(${images[currentIndex]})` }} 
                className="w-full h-full bg-center bg-cover duration-500 transition-transform group-hover:scale-105 cursor-pointer"
                onClick={() => onImageClick(images[currentIndex])}
            ></div>
            <div className="absolute inset-0 bg-black/20"></div>
  
            <button aria-label="Previous image" onClick={goToPrevious} className="hidden group-hover:flex items-center justify-center absolute top-1/2 -translate-y-1/2 left-3 text-2xl rounded-full p-2 bg-black/50 text-white cursor-pointer hover:bg-black/70 transition-colors z-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button aria-label="Next image" onClick={goToNext} className="hidden group-hover:flex items-center justify-center absolute top-1/2 -translate-y-1/2 right-3 text-2xl rounded-full p-2 bg-black/50 text-white cursor-pointer hover:bg-black/70 transition-colors z-10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
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
    );
};


const BookingForm: React.FC<{
    business: Business;
    location: Location;
    services: Service[];
    staff: StaffMember[];
    categories: ServiceCategory[];
}> = ({ business, location, services, staff, categories }) => {
  const { t, language } = useLanguage();
  
  const timeToMinutes = (timeStr: string): number => {
      if (!timeStr || !timeStr.includes(':')) return NaN;
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
  };

  const minutesToTime = (minutes: number): string => {
      const h = Math.floor(minutes / 60).toString().padStart(2, '0');
      const m = (minutes % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
  };

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [countryCode, setCountryCode] = useState(language === 'pt-BR' ? '+55' : '+1');
  const [localPhoneNumber, setLocalPhoneNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [dayBookings, setDayBookings] = useState<Booking[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [appointmentSuccess, setAppointmentSuccess] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedStaffId && staff.length > 0) {
        setSelectedStaffId(staff[0].id);
    }
  }, [staff, selectedStaffId]);

  useEffect(() => {
    setCountryCode(language === 'pt-BR' ? '+55' : language === 'ar' ? '+966' : language === 'fr' ? '+33' : '+1');
  }, [language]);

  const selectedServices = useMemo(() => {
    return selectedServiceIds.map(id => services.find(s => s.id === id)).filter((s): s is Service => !!s);
  }, [selectedServiceIds, services]);
  
  const totalDuration = useMemo(() => {
      if (selectedServices.length === 0) return 0;
      return selectedServices.reduce((total, service) => total + service.duration, 0);
  }, [selectedServices]);

  const totalPrice = useMemo(() => {
      if (selectedServices.length === 0) return 0;
      return selectedServices.reduce((total, service) => total + service.price, 0);
  }, [selectedServices]);


  const filteredServices = useMemo(() => {
      if (!selectedStaffId) {
          return [];
      }
      const selectedStaffMember = staff.find(s => s.id === selectedStaffId);
      if (!selectedStaffMember || !selectedStaffMember.serviceIds) {
          return [];
      }
      return services.filter(service => selectedStaffMember.serviceIds!.includes(service.id));
  }, [selectedStaffId, services, staff]);

  const servicesByCategory = useMemo(() => {
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));
    const grouped = new Map<string, { name: string, services: Service[] }>();
    
    const uncategorizedServices: Service[] = [];

    filteredServices.forEach(service => {
        if(service.categoryId && categoryMap.has(service.categoryId)) {
            const categoryId = service.categoryId;
            const categoryName = categoryMap.get(categoryId)!;

            if (!grouped.has(categoryId)) {
                grouped.set(categoryId, { name: categoryName, services: [] });
            }
            grouped.get(categoryId)!.services.push(service);
        } else {
            uncategorizedServices.push(service);
        }
    });

    const sortedGrouped = Array.from(grouped.values()).sort((a,b) => a.name.localeCompare(b.name));
    
    if (uncategorizedServices.length > 0) {
        sortedGrouped.push({ name: t('otherServices'), services: uncategorizedServices });
    }
    
    return sortedGrouped;

}, [filteredServices, categories, t]);

useEffect(() => {
    if (selectedDate && business.id && location.id) {
        const fetchBookingsForDate = async () => {
            setSlotsLoading(true);
            try {
                const bookingsData = await getBookingsForDay(business.id, location.id, selectedDate);
                setDayBookings(bookingsData);
            } catch (err: unknown) {
                // FIX: The `err` variable is of type `unknown` and cannot be directly assigned to the 'error' state, which expects a string. This converts the error to a string before setting the state.
                const message = err instanceof Error ? err.message : String(err);
                console.error("Failed to fetch bookings for date", message);
                setError(message);
            } finally {
                setSlotsLoading(false);
            }
        };
        fetchBookingsForDate();
    } else {
        setDayBookings([]);
    }
}, [selectedDate, business.id, location.id, t]);


  const minDate = useMemo(() => new Date(), []);
  const maxDate = useMemo(() => {
    if (!business?.calendarSettings?.bookingInAdvanceDays) return undefined;
    const today = new Date();
    const max = new Date(today.setDate(today.getDate() + business.calendarSettings.bookingInAdvanceDays));
    return max;
  }, [business]);
  
  const disabledDays = useMemo(() => {
    const days = new Set<DayOfWeek>();
    (location.closedDays || []).forEach(d => days.add(d));
    return Array.from(days);
}, [location.closedDays]);

  const availableTimeSlots = useMemo(() => {
    if (!business || !location || selectedServices.length === 0 || !selectedDate || !business.calendarSettings || !selectedStaffId) return [];
    
    const calculateBookingDuration = (booking: Booking): number => {
        const serviceNames = booking.serviceName.split(' + ');
        return services
            .filter(s => serviceNames.includes(s.name))
            .reduce((sum, s) => sum + s.duration, 0);
    };

    const now = new Date();
    const isToday = new Date(selectedDate.replace(/-/g, '/')).toDateString() === now.toDateString();
    const minNoticeMinutes = isToday ? now.getHours() * 60 + now.getMinutes() + (business.calendarSettings.minBookingNoticeHours || 0) * 60 : 0;
    
    const serviceDurationMinutes = totalDuration;
    const { bufferTimeMinutes, timeSlotInterval } = business.calendarSettings;
    const slotInterval = timeSlotInterval || 30;

    const staffToConsider = staff.filter(s => s.id === selectedStaffId);
    if (staffToConsider.length === 0) return [];
    
    const allPossibleSlots = new Set<number>();
    
    staffToConsider.forEach(staffMember => {
        const effectiveWorkingHours = staffMember.workingHours || location.workingHours;
        const start = effectiveWorkingHours?.start;
        const end = effectiveWorkingHours?.end;
        const staffClosedDays = staffMember.closedDays || [];
        const locationClosedDays = location.closedDays || [];

        const selectedDayIndex = new Date(selectedDate.replace(/-/g, '/')).getDay();
        const daysOfWeek: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const selectedDay = daysOfWeek[selectedDayIndex];
        
        if (staffClosedDays.includes(selectedDay) || locationClosedDays.includes(selectedDay)) return;

        const startMinutes = timeToMinutes(start || '00:00');
        const endMinutes = timeToMinutes(end || '23:59');

        if (isNaN(startMinutes) || isNaN(endMinutes)) return;
        
        for (let t = startMinutes; t < endMinutes; t += slotInterval) {
            allPossibleSlots.add(t);
        }
    });

    const validSlots = Array.from(allPossibleSlots).filter(slotStartMinutes => {
        if (slotStartMinutes < minNoticeMinutes) return false;

        const slotServiceEnd = slotStartMinutes + serviceDurationMinutes;
        
        const isStaffAvailable = staffToConsider.some(staffMember => {
            const effectiveWorkingHours = staffMember.workingHours || location.workingHours;
            const start = effectiveWorkingHours?.start;
            const end = effectiveWorkingHours?.end;
            const staffStart = timeToMinutes(start || '00:00');
            const staffEnd = timeToMinutes(end || '23:59');

            if (slotStartMinutes < staffStart || slotServiceEnd > staffEnd) {
                return false;
            }

            const staffBookings = dayBookings.filter(b => b.staffMemberId === staffMember.id);
            const slotBlockEnd = slotServiceEnd + bufferTimeMinutes;

            for (const booking of staffBookings) {
                const existingBookingDuration = calculateBookingDuration(booking);
                if (!existingBookingDuration) continue;
                
                const bookingStart = timeToMinutes(booking.time);
                const bookingEnd = bookingStart + existingBookingDuration + bufferTimeMinutes;
                
                if (slotStartMinutes < bookingEnd && slotBlockEnd > bookingStart) {
                    return false; // Overlap
                }
            }
            return true; // This staff is available
        });
        
        return isStaffAvailable;
    });

    return validSlots.map(minutesToTime).sort();

}, [business, location, selectedServices, services, selectedDate, dayBookings, selectedStaffId, staff, totalDuration]);


  const handleDateChange = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
    setSelectedTime(''); // Reset time when date changes
  };

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaffId(staffId);
    setSelectedServiceIds([]);
    setSelectedDate(null);
    setSelectedTime('');
  };

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServiceIds(prev => {
        const newIds = prev.includes(serviceId)
            ? prev.filter(id => id !== serviceId)
            : [...prev, serviceId];
        
        setSelectedDate(null);
        setSelectedTime('');
        
        return newIds;
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id || !location?.id || selectedServiceIds.length === 0 || !selectedDate || !selectedTime || !selectedStaffId) return;
    setIsSubmitting(true);
    setAppointmentSuccess(false);
    setError('');

    try {
        const servicesToBook = services.filter(s => selectedServiceIds.includes(s.id));
        if (servicesToBook.length === 0) {
            throw new Error(t('selectedServicesNotFound'));
        }

        const combinedName = servicesToBook.map(s => s.name).join(' + ');
        const combinedPrice = servicesToBook.reduce((sum, s) => sum + s.price, 0);
        const firstServiceId = servicesToBook[0].id;

        const assignedStaffId = selectedStaffId;

        const selectedStaffMember = staff.find(s => s.id === assignedStaffId);
        if (!selectedStaffMember) {
            throw new Error(t('selectedStaffNotFound'));
        }
        const slotStartMinutes = timeToMinutes(selectedTime);
        const { start, end } = selectedStaffMember.workingHours || location.workingHours || {};
        const staffStart = timeToMinutes(start || '00:00');
        const staffEnd = timeToMinutes(end || '23:59');
        
        if (slotStartMinutes < staffStart || (slotStartMinutes + totalDuration) > staffEnd) {
             throw new Error(t('staffNotWorkingError'));
        }

        const fullPhoneNumber = `${countryCode}${localPhoneNumber.replace(/\D/g, '')}`;
        await createBooking({
            businessId: business.id,
            locationId: location.id,
            customerName,
            customerEmail,
            customerPhone: fullPhoneNumber,
            serviceId: firstServiceId,
            serviceName: combinedName,
            priceAtBooking: combinedPrice,
            date: selectedDate,
            time: selectedTime,
            status: BookingStatus.Approved,
            notes,
            staffMemberId: assignedStaffId,
            language: language,
        });
        setAppointmentSuccess(true);
        // Reset form
        setCustomerName('');
        setCustomerEmail('');
        setCountryCode(language === 'pt-BR' ? '+55' : language === 'ar' ? '+966' : language === 'fr' ? '+33' : '+1');
        setLocalPhoneNumber('');
        setSelectedServiceIds([]);
        setSelectedDate(null);
        setSelectedTime('');
        setSelectedStaffId(staff.length > 0 ? staff[0].id : null);
        setNotes('');
    } catch (err: unknown) {
        // FIX: The 'err' variable is of type 'unknown' and cannot be directly assigned to the 'error' state, which expects a string. This converts the error to a string before setting the state.
        const message = err instanceof Error ? err.message : String(err);
        console.error("Appointment failed:", message);
        setError(message || t('bookingFailedError'));
    } finally {
        setIsSubmitting(false);
    }
  };


    if (appointmentSuccess) {
        return (
            <div className="text-center p-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-green-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-4 text-3xl font.semibold">{t('bookingConfirmed')}</h3>
                <p className="mt-2 text-muted-foreground">{t('bookingConfirmedSuccess')}</p>
                <Button onClick={() => setAppointmentSuccess(false)} className="mt-8">{t('bookAnotherService')}</Button>
            </div>
        );
    }

  return (
        <div className="space-y-10">
            <div className="space-y-6">
                <h2 className="text-2xl font.semibold">{t('bookAppointment')}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Input label={t('yourNameLabel')} value={customerName} onChange={e => setCustomerName(e.target.value)} required />
                        <Input label={t('yourEmailLabel')} type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font.medium text-foreground mb-1">{t('whatsappNumberLabel')}</label>
                         <div className="flex items-center w-full bg-card border border-input rounded-md shadow-sm focus-within:ring-1 focus-within:ring-ring">
                            <input 
                                id="country-code" 
                                type="text" 
                                value={countryCode} 
                                onChange={e => setCountryCode(e.target.value)} 
                                className="w-16 text-center px-3 py-2 bg-transparent border-0 focus:ring-0 text-foreground placeholder:text-muted-foreground sm:text-sm" 
                                aria-label="Country code" 
                                placeholder={t('countryCodePlaceholder')} 
                                required
                            />
                            <div className="h-6 w-px bg-border"></div>
                            <input 
                                id="phone" 
                                type="tel" 
                                value={localPhoneNumber} 
                                onChange={e => setLocalPhoneNumber(e.target.value)} 
                                required 
                                className="flex-1 w-full px-3 py-2 bg-transparent border-0 focus:ring-0 text-foreground placeholder:text-muted-foreground sm:text-sm" 
                                placeholder={t('phonePlaceholder')}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="notes" className="block text-sm font.medium text-foreground mb-1">{t('notesHeader')}</label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            placeholder={t('notesPlaceholderPublic')}
                            className="block w-full px-3 py-2 bg-card border border-input rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm"
                        />
                    </div>
                </form>
            </div>
            
            <div className="space-y-6">
                <h2 className="text-2xl font.semibold">{t('selectStaffMember')}</h2>
                <div className="flex overflow-x-auto space-x-4 pb-4 -mx-6 px-6 sm:-mx-8 sm:px-8 scrollbar-hide md:grid md:grid-cols-4 md:gap-4 md:p-0 md:m-0 md:overflow-visible">
                    {staff.map(s => (
                        <div key={s.id} onClick={() => handleStaffSelect(s.id)} className={`w-36 md:w-full flex-shrink-0 relative group cursor-pointer transition-all duration-200 rounded-lg overflow-hidden border-2 ${selectedStaffId === s.id ? 'border-primary' : 'border-transparent hover:border-primary/50'}`}>
                            {s.imageUrl ? (
                                <img 
                                    src={s.imageUrl} 
                                    alt={s.name}
                                    className="w-full h-full object-cover aspect-square"
                                />
                            ) : (
                                <div className="w-full aspect-square bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                                     <span className="text-4xl sm:text-5xl font-bold text-white">
                                        {s.name.split(' ').map(n=>n[0]).join('').toUpperCase()}
                                    </span>
                                </div>
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
                                <p className="font.semibold text-sm truncate text-center">{s.name}</p>
                            </div>
                            {selectedStaffId === s.id && (
                                <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary rounded-md flex items-center justify-center text-white border-2 border-white dark:border-card">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {selectedStaffId && (
                <div className="space-y-10 animate-fade-in">
                    <div className="space-y-6">
                        <h2 className="text-2xl font.semibold">{t('chooseServices')}</h2>
                        <div className="border border-border rounded-lg divide-y divide-border">
                        {servicesByCategory.map((category, index) => (
                            <Accordion title={category.name} key={index} defaultOpen={index === 0}>
                                <div className="divide-y divide-border">
                                {category.services.map(service => {
                                    const isSelected = selectedServiceIds.includes(service.id);
                                    return (
                                        <div key={service.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-accent/50 transition-colors">
                                            {service.imageUrl && 
                                                <img 
                                                    src={service.imageUrl}
                                                    alt={service.name}
                                                    className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                                                />
                                            }
                                            <div className="flex-1">
                                                <p className="font-semibold text-foreground">{service.name}</p>
                                                {service.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>}
                                            </div>
                                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                                <div className="text-right flex-shrink-0">
                                                    <p className="font-semibold text-foreground">{formatPrice(service.price, business.currency)}</p>
                                                    <p className="text-sm text-muted-foreground">{formatDuration(service.duration)}</p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={() => toggleServiceSelection(service.id)}
                                                    variant={isSelected ? 'destructive' : 'secondary'}
                                                    size="sm"
                                                    className="px-6"
                                                >
                                                    {isSelected ? t('selected') : t('select')}
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                                </div>
                            </Accordion>
                        ))}
                        </div>
                    </div>

                    {selectedServices.length > 0 && (
                        <div className="space-y-10 animate-fade-in">
                        <div className="p-4 border border-border rounded-lg bg-background">
                            <h3 className="font.semibold text-card-foreground">{t('summaryTitle')}</h3>
                            <ul className="mt-2 space-y-1">
                                {selectedServices.map(s => (
                                    <li key={s.id} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{s.name}</span>
                                        <span>{formatPrice(s.price, business.currency)}</span>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-3 pt-3 border-t border-border flex justify-between font-bold text-foreground">
                                <span>{t('totalLabel')}</span>
                                <span>{formatDuration(totalDuration)} &bull; {formatPrice(totalPrice, business.currency)}</span>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-2xl font.semibold mb-4">{t('selectDateTime')}</h3>
                            <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1">
                                <Calendar 
                                    value={selectedDate}
                                    onChange={handleDateChange}
                                    minDate={minDate}
                                    maxDate={maxDate}
                                    disabledDays={disabledDays}
                                />
                            </div>
                            <div className="md:w-56 flex-shrink-0">
                                {selectedDate && (
                                    <div className="h-full">
                                        {slotsLoading ? (
                                            <div className="flex items-center justify-center h-full"><Spinner /></div>
                                        ) : availableTimeSlots.length > 0 ? (
                                            <div className="grid grid-cols-3 gap-2 max-h-72 md:max-h-96 overflow-y-auto">
                                                {availableTimeSlots.map(slot => (
                                                    <Button 
                                                        key={slot} 
                                                        type="button"
                                                        variant={selectedTime === slot ? 'primary' : 'secondary'}
                                                        onClick={() => setSelectedTime(slot)}
                                                    >
                                                        {slot}
                                                    </Button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center text-sm text-muted-foreground h-full flex items-center justify-center">
                                                {t('noTimesAvailable')}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            </div>
                        </div>
                        </div>
                    )}
                </div>
            )}
             {error && <p className="text-sm text-center text-destructive py-4">{error}</p>}
            <Button type="button" onClick={handleSubmit} className="w-full !py-4 text-lg" isLoading={isSubmitting} disabled={!selectedTime || selectedServiceIds.length === 0}>
                {t('requestAppointmentButton')}
            </Button>
        </div>
    );
};

const PublicBookingPage: React.FC = () => {
  const { businessSlug, locationSlug } = useParams<{ businessSlug: string; locationSlug: string }>();
  const { t, setLanguage, language } = useLanguage();
  const [business, setBusiness] = useState<Business | null>(null);
  const [location, setLocation] = useState<Location | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [langInitialized, setLangInitialized] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    if (!businessSlug || !locationSlug) {
      setError(t('businessNotFound'));
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const publicData = await getPublicLocationData(businessSlug, locationSlug);
        if (publicData) {
          setBusiness(publicData.business);
          setLocation(publicData.location);
          setServices(publicData.services);
          setStaff(publicData.staff);
          setCategories(publicData.categories);

          if (!langInitialized && !localStorage.getItem('localdify-public-lang') && publicData.business.defaultLanguage) {
            setLanguage(publicData.business.defaultLanguage as any);
            setLangInitialized(true);
          }

        } else {
          setError(t('businessNotFound'));
        }
      } catch (err: unknown) {
        // FIX: The 'err' variable is of type 'unknown' and cannot be directly assigned to the 'error' state, which expects a string. This converts the error to a string before setting the state.
        const message = err instanceof Error ? err.message : String(err);
        setError(message || t('loadBusinessError'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [businessSlug, locationSlug, t, setLanguage, langInitialized]);

  useEffect(() => {
    const root = document.documentElement;
    const originalPrimary = root.style.getPropertyValue('--primary');
    const originalSecondary = root.style.getPropertyValue('--secondary');

    if (business?.themeSettings) {
        const { primaryColor, secondaryColor } = business.themeSettings;
        if (primaryColor) {
            root.style.setProperty('--primary', primaryColor);
        }
        if (secondaryColor) {
            root.style.setProperty('--secondary', secondaryColor);
        }
    }
    
    if (business?.cssContent) {
      const styleTag = document.createElement('style');
      styleTag.id = 'custom-template-css';
      styleTag.innerHTML = business.cssContent;
      document.head.appendChild(styleTag);
    }

    return () => {
        root.style.setProperty('--primary', originalPrimary);
        root.style.setProperty('--secondary', originalSecondary);
        const existingTag = document.getElementById('custom-template-css');
        if (existingTag) {
            existingTag.remove();
        }
    };
  }, [business]);
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
  }

  if (error || !business || !location) {
    return <div className="text-center mt-10 text-destructive">{error || t('businessNotFound')}</div>;
  }
  
  const hasCoverImage = !!business.themeSettings?.coverImageUrl;
  const hasLogo = !!business.imageUrl;
  const currentLanguage = languages.find(l => l.code === language) || languages[0];

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {hasCoverImage && (
        <div className="absolute top-0 left-0 w-full h-80 -z-10">
          <img src={business.themeSettings!.coverImageUrl!} alt={`${business.name} cover`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent"></div>
        </div>
      )}

      <div className="absolute top-4 right-4 z-20">
             <Dropdown
                trigger={
                    <button className="flex items-center space-x-2 p-2 rounded-lg text-muted-foreground bg-card shadow-sm border border-border hover:bg-accent hover:text-foreground focus:outline-none">
                        <span className="text-sm font-medium hidden sm:inline">{currentLanguage.name}</span>
                        <ChevronDownIcon />
                    </button>
                }
            >
                {languages.map(lang => (
                    <DropdownItem
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`flex items-center space-x-2 ${language === lang.code ? 'bg-accent font-semibold text-accent-foreground' : ''}`}
                    >
                        <span>{lang.name}</span>
                    </DropdownItem>
                ))}
            </Dropdown>
        </div>

      <div className={`container mx-auto px-4 ${hasCoverImage ? 'pt-32' : 'pt-12 sm:pt-24'} pb-12`}>
        <div className="max-w-2xl mx-auto">
            <div className="relative mt-16">
                 {business.imageUrl && (
                    <img src={business.imageUrl} alt={business.name} className="absolute left-1/2 -translate-x-1/2 -top-16 w-32 h-32 object-cover rounded-full mx-auto border-4 border-background shadow-lg z-10"/>
                )}
                
                <div className="bg-card rounded-lg shadow-lg border border-border overflow-hidden">
                    <div className="pt-20 text-center relative px-6 pb-6">
                         <button 
                            onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)} 
                            className="absolute top-2 right-2 p-2 rounded-full hover:bg-accent transition-colors text-muted-foreground z-20"
                            aria-label={isDescriptionExpanded ? "Collapse description" : "Expand description"}
                        >
                            <ChevronDownIcon className={`h-5 w-5 transform transition-transform ${isDescriptionExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <h1 className="text-3xl font-bold text-foreground">{business.name}</h1>
                        {business.description && (
                            <p className={`mt-2 text-base text-muted-foreground max-w-lg mx-auto transition-all duration-300 ${!isDescriptionExpanded ? 'line-clamp-3' : ''}`}>
                                {business.description}
                            </p>
                        )}
                        <SocialIcons socials={business.socials} />
                    </div>

                    {business.galleryImages && business.galleryImages.length > 0 && (
                        <div className="px-6 sm:px-8 pb-8">
                            <h2 className="text-xl font-semibold text-center mb-4">{t('ourWork')}</h2>
                            <GalleryCarousel images={business.galleryImages} onImageClick={setSelectedImage} />
                        </div>
                    )}
                  
                    <div className="p-6 sm:p-8 border-t border-border bg-background/50">
                        <BookingForm business={business} location={location} services={services} staff={staff} categories={categories} />
                    </div>
                </div>
            </div>
        </div>
      </div>
       <footer className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
              {t('poweredBy')} <a href="https://home.localdify.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">localDify</a>
          </p>
      </footer>
      <Modal isOpen={!!selectedImage} onClose={() => setSelectedImage(null)} title={t('imagePreview')} widthClass="max-w-3xl">
          <div className="p-2">
              {selectedImage && (
                  <img 
                      src={selectedImage} 
                      alt="Enlarged gallery view" 
                      className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl mx-auto" 
                  />
              )}
          </div>
      </Modal>
    </div>
  );
};

export default PublicBookingPage;
