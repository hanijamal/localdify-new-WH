
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
        <div className="mt-6 flex items-center justify-center space-x-6 text-gray-400">
            {socials.website && (
                <a href={socials.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors transform hover:scale-110" aria-label="Website">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                </a>
            )}
            {socials.instagram && (
                <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-pink-600 transition-colors transform hover:scale-110" aria-label="Instagram">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.07-1.645-.07-4.85s.012-3.584.07-4.85c.149-3.225 1.664 4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163zm0 1.44s-3.442.008-4.695.064c-2.913.13-4.14 1.353-4.27 4.27C3.008 9.204 3 9.558 3 12s.008 2.796.064 4.05c.13 2.913 1.354 4.14 4.27 4.27 1.253.056 4.695.064 4.695.064s3.442-.008 4.695-.064c2.913-.13 4.14-1.354 4.27-4.27.056-1.253.064-2.695.064-4.05s-.008-2.796-.064-4.05c-.13-2.913-1.354-4.14-4.27-4.27C15.442 3.611 12 3.603 12 3.603zm0 4.262a4.135 4.135 0 100 8.27 4.135 4.135 0 000-8.27zm0 6.832a2.697 2.697 0 110-5.394 2.697 2.697 0 010 5.394zm4.965-7.73a.96.96 0 100 1.92.96.96 0 000-1.92z" />
                    </svg>
                </a>
            )}
            {socials.facebook && (
                <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors transform hover:scale-110" aria-label="Facebook">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                    </svg>
                </a>
            )}
            {socials.whatsapp && (
                <a href={cleanWhatsAppLink(socials.whatsapp)} target="_blank" rel="noopener noreferrer" className="hover:text-green-500 transition-colors transform hover:scale-110" aria-label="WhatsApp">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
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
    const [isPaused, setIsPaused] = useState(false);

    const goToNext = useCallback(() => {
        setCurrentIndex((prevIndex) =>
            prevIndex === images.length - 1 ? 0 : prevIndex + 1
        );
    }, [images.length]);

    useEffect(() => {
        if (!isPaused && images.length > 1) {
            const intervalId = setInterval(goToNext, 5000); // 5 seconds
            return () => clearInterval(intervalId);
        }
    }, [goToNext, isPaused, images.length]);

    if (!images || images.length === 0) {
        return null;
    }

    const goToPrevious = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === 0 ? images.length - 1 : prevIndex - 1
        );
    };

    const goToSlide = (slideIndex: number) => {
        setCurrentIndex(slideIndex);
    };

    return (
        <div
            className="mb-10"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">{t('ourWork')}</h2>
            <div className="relative w-full h-80 md:h-[450px] group rounded-2xl overflow-hidden shadow-2xl">
                <div
                    style={{ backgroundImage: `url(${images[currentIndex]})` }}
                    className="w-full h-full bg-center bg-cover duration-700 transition-transform group-hover:scale-105 cursor-pointer"
                    onClick={() => onImageClick(images[currentIndex])}
                ></div>
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30"></div>

                {/* Left Arrow */}
                {images.length > 1 && (
                    <button aria-label="Previous image" onClick={goToPrevious} className="hidden group-hover:flex items-center justify-center absolute top-1/2 -translate-y-1/2 left-4 text-2xl rounded-full p-3 bg-white/20 backdrop-blur-md text-white cursor-pointer hover:bg-white/40 transition-all z-10 border border-white/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                )}
                {/* Right Arrow */}
                {images.length > 1 && (
                    <button aria-label="Next image" onClick={goToNext} className="hidden group-hover:flex items-center justify-center absolute top-1/2 -translate-y-1/2 right-4 text-2xl rounded-full p-3 bg-white/20 backdrop-blur-md text-white cursor-pointer hover:bg-white/40 transition-all z-10 border border-white/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>
                )}
                {/* Dots */}
                {images.length > 1 && (
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 z-10">
                        {images.map((_, slideIndex) => (
                            <button
                                key={slideIndex}
                                aria-label={`Go to image ${slideIndex + 1}`}
                                onClick={() => goToSlide(slideIndex)}
                                className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-all duration-300 ${currentIndex === slideIndex ? 'bg-white scale-125 shadow-lg' : 'bg-white/50 hover:bg-white/80'}`}
                            ></button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const languages = [
    { code: 'ar', name: 'العربية ', flag: '' },
    { code: 'en', name: 'English', flag: '' },
    { code: 'fr', name: 'Français ', flag: '' },
    //{ code: 'pt-BR', name: 'Português ', flag: '' }
] as const;

const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);

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
        const categoryMap = new Map<string, string>(categories.map(c => [c.id, c.name]));
        const grouped = new Map<string, { name: string, services: Service[] }>();

        const uncategorizedServices: Service[] = [];

        filteredServices.forEach(service => {
            if (service.categoryId && categoryMap.has(service.categoryId)) {
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

        const sortedGrouped = Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));

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
    }, [selectedDate, business.id, location.id]);


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
        // Staff-specific days off are handled in time slot generation, not calendar disabling.
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
            const firstServiceId = servicesToBook[0].id; // Compromise for single serviceId in DB

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
            const message = err instanceof Error ? err.message : String(err);
            console.error("Appointment failed:", err);
            setError(message || t('bookingFailedError'));
        } finally {
            setIsSubmitting(false);
        }
    };


    if (appointmentSuccess) {
        return (
            <div className="text-center p-12 bg-white rounded-xl shadow-lg border border-gray-100">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 className="text-3xl font-bold text-gray-900">{t('bookingConfirmed')}</h3>
                <p className="mt-3 text-lg text-gray-500">{t('bookingConfirmedSuccess')}</p>
                <Button onClick={() => setAppointmentSuccess(false)} className="mt-8 px-8 py-3 text-lg">{t('bookAnotherService')}</Button>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8 border border-gray-100">
            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="border-b border-gray-100 pb-6">
                    <h2 className="text-2xl font-bold text-gray-900">{t('bookAppointment')}</h2>
                    <p className="text-gray-500 mt-1">{t('fillDetailsToBook')}</p>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Input label={t('yourNameLabel')} value={customerName} onChange={e => setCustomerName(e.target.value)} required className="bg-gray-50 border-gray-200 focus:bg-white transition-colors" />
                        <Input label={t('yourEmailLabel')} type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} required className="bg-gray-50 border-gray-200 focus:bg-white transition-colors" />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font.medium text-gray-700 mb-1">{t('whatsappNumberLabel')}</label>
                        <div className="flex items-center w-full bg-gray-50 border border-gray-200 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-primary focus-within:bg-white transition-all overflow-hidden">
                            <input
                                id="country-code"
                                type="text"
                                value={countryCode}
                                onChange={e => setCountryCode(e.target.value)}
                                className="w-20 text-center px-3 py-2.5 bg-transparent border-r border-gray-200 focus:ring-0 text-gray-900 placeholder:text-gray-400 sm:text-sm font-medium"
                                aria-label="Country code"
                                placeholder={t('countryCodePlaceholder')}
                                required
                            />
                            <input
                                id="phone"
                                type="tel"
                                value={localPhoneNumber}
                                onChange={e => setLocalPhoneNumber(e.target.value)}
                                required
                                className="flex-1 w-full px-3 py-2.5 bg-transparent border-0 focus:ring-0 text-gray-900 placeholder:text-gray-400 sm:text-sm"
                                placeholder={t('phonePlaceholder')}
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">{t('notesHeader')}</label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            placeholder={t('notesPlaceholderPublic')}
                            className="block w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md shadow-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all sm:text-sm"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">{t('selectStaffMember')}</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {staff.map(s => (
                            <div key={s.id} onClick={() => handleStaffSelect(s.id)} className={`relative group cursor-pointer transition-all duration-300 rounded-xl overflow-hidden border-2 ${selectedStaffId === s.id ? 'border-primary shadow-md scale-[1.02]' : 'border-transparent hover:border-gray-200 hover:shadow-sm'}`}>
                                <div className="aspect-square relative">
                                    <img
                                        src={s.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random&color=fff`}
                                        alt={s.name}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
                                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                                        <p className="font-semibold text-sm truncate">{s.name}</p>
                                    </div>
                                </div>
                                {selectedStaffId === s.id && (
                                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white shadow-sm animate-in fade-in zoom-in duration-200">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {selectedStaffId && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-4">{t('chooseServices')}</label>
                            {filteredServices.length === 0 ? (
                                <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                                    <p className="text-gray-500">{t('noServicesForStaff')}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {servicesByCategory.map((category, index) => (
                                        <Accordion title={category.name} key={index} defaultOpen={index === 0} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                            <div className="divide-y divide-gray-100">
                                                {category.services.map(service => {
                                                    const isSelected = selectedServiceIds.includes(service.id);
                                                    return (
                                                        <div key={service.id}
                                                            onClick={() => toggleServiceSelection(service.id)}
                                                            className={`p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all cursor-pointer ${isSelected ? 'bg-primary/5' : 'hover:bg-gray-50'}`}
                                                        >
                                                            <div className="relative flex-shrink-0">
                                                                <img
                                                                    src={service.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(service.name)}&background=EAE6E1&color=413F3D&size=128`}
                                                                    alt={service.name}
                                                                    className="w-full sm:w-20 h-20 object-cover rounded-lg shadow-sm"
                                                                />
                                                                {isSelected && (
                                                                    <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-1 shadow-sm">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className={`font-semibold ${isSelected ? 'text-primary' : 'text-gray-900'}`}>{service.name}</p>
                                                                        {service.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{service.description}</p>}
                                                                    </div>
                                                                    <div className="text-right pl-4">
                                                                        <p className="font-bold text-gray-900">{formatPrice(service.price, business.currency)}</p>
                                                                        <p className="text-xs text-gray-500 font-medium mt-0.5">{formatDuration(service.duration)}</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </Accordion>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedServices.length > 0 && (
                            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 delay-100">
                                <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg">
                                    <h3 className="font-bold text-lg mb-4 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                        {t('summaryTitle')}
                                    </h3>
                                    <ul className="space-y-3 mb-6">
                                        {selectedServices.map(s => (
                                            <li key={s.id} className="flex justify-between text-sm items-center border-b border-gray-700 pb-2 last:border-0 last:pb-0">
                                                <span className="text-gray-300">{s.name}</span>
                                                <span className="font-mono">{formatPrice(s.price, business.currency)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="pt-4 border-t border-gray-700 flex justify-between items-end">
                                        <span className="text-gray-400 text-sm">{t('totalLabel')}</span>
                                        <div className="text-right">
                                            <div className="text-sm text-gray-400 mb-1">{formatDuration(totalDuration)}</div>
                                            <div className="text-2xl font-bold text-primary">{formatPrice(totalPrice, business.currency)}</div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">{t('selectDateTime')}</h3>
                                    <div className="flex flex-col lg:flex-row gap-8">
                                        <div className="flex-1 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                            <Calendar
                                                value={selectedDate}
                                                onChange={handleDateChange}
                                                minDate={minDate}
                                                maxDate={maxDate}
                                                disabledDays={disabledDays}
                                                className="w-full"
                                            />
                                        </div>
                                        <div className="lg:w-64 flex-shrink-0">
                                            {selectedDate ? (
                                                <div className="h-full flex flex-col">
                                                    <h4 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">{t('availableSlots')}</h4>
                                                    {slotsLoading ? (
                                                        <div className="flex-1 flex items-center justify-center min-h-[200px] bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                            <Spinner />
                                                        </div>
                                                    ) : availableTimeSlots.length > 0 ? (
                                                        <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                                                            {availableTimeSlots.map(slot => (
                                                                <button
                                                                    key={slot}
                                                                    type="button"
                                                                    onClick={() => setSelectedTime(slot)}
                                                                    className={`py-2 px-3 text-sm font-medium rounded-lg transition-all ${selectedTime === slot
                                                                            ? 'bg-primary text-white shadow-md transform scale-105'
                                                                            : 'bg-white border border-gray-200 text-gray-700 hover:border-primary hover:text-primary'
                                                                        }`}
                                                                >
                                                                    {slot}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] bg-gray-50 rounded-xl border border-dashed border-gray-200 p-4 text-center">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                            <p className="text-sm text-gray-500">{t('noTimesAvailable')}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center min-h-[200px] bg-gray-50 rounded-xl border border-dashed border-gray-200 p-6 text-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    <p className="text-gray-500 font-medium">{t('selectDateFirst')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center animate-in fade-in slide-in-from-top-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                {error}
                            </div>
                        )}
                        <Button type="submit" className="w-full py-4 text-lg font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all" isLoading={isSubmitting} disabled={!selectedTime || selectedServiceIds.length === 0}>
                            {t('requestAppointmentButton')}
                        </Button>
                    </div>
                )}
            </form>
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

                    if (!langInitialized && publicData.business.defaultLanguage) {
                        if (!publicData.business.allowLanguageSelection) {
                            setLanguage(publicData.business.defaultLanguage as any);
                            localStorage.setItem('localdify-public-lang', publicData.business.defaultLanguage);
                        } else if (!localStorage.getItem('localdify-public-lang')) {
                            setLanguage(publicData.business.defaultLanguage as any);
                        }
                        setLangInitialized(true);
                    }

                } else {
                    setError(t('businessNotFound'));
                }
            } catch (err: unknown) {
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
        return <div className="flex justify-center items-center h-screen bg-gray-50"><Spinner /></div>;
    }

    if (error || !business || !location) {
        return <div className="text-center mt-10 text-red-500 font-medium">{error || t('businessNotFound')}</div>;
    }

    const hasCoverImage = !!business.themeSettings?.coverImageUrl;
    const currentLanguage = languages.find(l => l.code === language) || languages[0];

    const languageDropdown = business.allowLanguageSelection ? (
        <Dropdown
            trigger={
                <button className={`flex items-center space-x-2 p-2.5 rounded-full focus:outline-none transition-all shadow-sm ${hasCoverImage ? 'bg-white/10 backdrop-blur-md text-white hover:bg-white/20 border border-white/20' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
                    <span className="text-xl">{currentLanguage.flag}</span>
                    <span className="text-sm font-medium hidden sm:inline">{currentLanguage.name}</span>
                    <ChevronDownIcon />
                </button>
            }
        >
            {languages.map(lang => (
                <DropdownItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`flex items-center space-x-3 px-4 py-2 ${language === lang.code ? 'bg-primary/5 font-semibold text-primary' : 'hover:bg-gray-50'}`}
                >
                    <span className="text-xl">{lang.flag}</span>
                    <span>{lang.name}</span>
                </DropdownItem>
            ))}
        </Dropdown>
    ) : null;

    const bookingFormComponent = <BookingForm business={business} location={location} services={services} staff={staff} categories={categories} />;

    if (business.htmlContent) {
        const cleanWhatsAppLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`;
        let renderedHtml = business.htmlContent
            .replace(/{{business_name}}/g, business.name)
            .replace(/{{business_description}}/g, business.description || '')
            .replace(/{{business_image_url}}/g, business.imageUrl || '')
            .replace(/{{business_address}}/g, location.address || '')
            .replace(/{{socials_website}}/g, business.socials?.website || '')
            .replace(/{{socials_instagram}}/g, business.socials?.instagram || '')
            .replace(/{{socials_facebook}}/g, business.socials?.facebook || '')
            .replace(/{{socials_whatsapp}}/g, business.socials?.whatsapp ? cleanWhatsAppLink(business.socials.whatsapp) : '');

        const parts = renderedHtml.split('{{booking_app}}');

        return (
            <div className="relative min-h-screen bg-gray-50">
                <div className="fixed top-4 right-4 z-50">
                    {languageDropdown}
                </div>
                <div dangerouslySetInnerHTML={{ __html: parts[0] }} />
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    {bookingFormComponent}
                </div>
                {parts[1] && <div dangerouslySetInnerHTML={{ __html: parts[1] }} />}
            </div>
        );
    }

    const displayAddress = location.address;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-primary/20">
            {hasCoverImage && (
                <div className="absolute top-0 left-0 w-full h-80 z-0">
                    <img src={business.themeSettings!.coverImageUrl} alt={`${business.name} cover`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-gray-50/90"></div>
                </div>
            )}

            <div className="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
                <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
                    {languageDropdown}
                </div>

                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-10 pt-8">
                        {business.imageUrl && (
                            <div className="relative inline-block">
                                <img src={business.imageUrl} alt={business.name} className="w-32 h-32 object-cover rounded-full border-4 border-white shadow-xl mx-auto" />
                                <div className="absolute inset-0 rounded-full shadow-inner pointer-events-none"></div>
                            </div>
                        )}
                        <h1 className={`text-4xl font-extrabold mt-6 mb-2 tracking-tight ${hasCoverImage ? 'text-gray-900' : 'text-gray-900'}`}>{business.name}</h1>
                        <p className="text-xl font-medium text-gray-500 mb-4">{location.name}</p>
                        {business.description && (
                            <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">{business.description}</p>
                        )}

                        {displayAddress && (
                            <div className="mt-4 flex items-center justify-center text-sm text-gray-500 bg-white/50 backdrop-blur-sm inline-flex px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 20l-4.95-5.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                <span>{displayAddress}</span>
                            </div>
                        )}

                        <SocialIcons socials={business.socials} />
                    </div>

                    {business.galleryImages && business.galleryImages.length > 0 && (
                        <GalleryCarousel images={business.galleryImages} onImageClick={setSelectedImage} />
                    )}

                    {bookingFormComponent}
                </div>
            </div>

            <footer className="py-8 text-center border-t border-gray-200 mt-12 bg-white">
                <p className="text-sm text-gray-500">
                    {t('poweredBy')} <a href="https://home.localdify.com/" target="_blank" rel="noopener noreferrer" className="font-bold text-primary hover:text-primary/80 transition-colors">localDify</a>
                </p>
            </footer>

            <Modal isOpen={!!selectedImage} onClose={() => setSelectedImage(null)} title={t('imagePreview')} size="full">
                <div className="w-full h-full flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
                    {selectedImage && (
                        <img
                            src={selectedImage}
                            alt="Enlarged gallery view"
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                    )}
                    <button className="absolute top-4 right-4 text-white hover:text-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default PublicBookingPage;
