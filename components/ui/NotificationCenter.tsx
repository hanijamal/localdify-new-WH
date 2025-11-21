import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { Booking } from '../../types';
import { useBusiness } from '../../hooks/useBusiness';
import { mapBookingFromDb } from '../../services/supabaseService';
import { useLanguage } from '../../hooks/useLanguage';

const NotificationCenter: React.FC = () => {
    const { business, bookings: initialBookings } = useBusiness();
    const { t, language } = useLanguage();
    const [notifications, setNotifications] = useState<Booking[]>([]);
    const [hasUnread, setHasUnread] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const timeSince = (date: Date): string => {
        try {
            const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
            const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            const months = Math.floor(days / 30);
            const years = Math.floor(days / 365);
    
            if (years > 0) return rtf.format(-years, 'year');
            if (months > 0) return rtf.format(-months, 'month');
            if (days > 0) return rtf.format(-days, 'day');
            if (hours > 0) return rtf.format(-hours, 'hour');
            if (minutes > 0) return rtf.format(-minutes, 'minute');
            return rtf.format(-Math.max(seconds, 0), 'second');
        } catch (e) {
            console.error("Error formatting time since:", e);
            // Fallback for older browsers or errors
            const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
            if (seconds < 60) return "just now";
            const minutes = Math.floor(seconds / 60);
            return `${minutes}m ago`;
        }
    };
    
    useEffect(() => {
        const sortedInitial = [...initialBookings].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setNotifications(sortedInitial);
    }, [initialBookings]);

    useEffect(() => {
        if (!business) return;

        const channel = supabase.channel('public:bookings')
            .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'bookings', filter: `business_id=eq.${business.id}` },
            (payload) => {
                const newBooking = mapBookingFromDb(payload.new);
                setNotifications(prev => [newBooking, ...prev]);
                setHasUnread(true);
            }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [business]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsOpen(false);
          }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
          document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleDropdown = () => {
        setIsOpen(prev => {
            if (!prev) {
                setHasUnread(false);
            }
            return !prev;
        });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={toggleDropdown}
                className="relative p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:focus:ring-offset-background"
                aria-label={t('notifications')}
            >
                {/* FIX: Corrected malformed viewBox attribute */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {hasUnread && (
                    <span className="absolute top-1.5 ltr:right-1.5 rtl:left-1.5 block h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />
                )}
            </button>

            {isOpen && (
                 <div className="ltr:origin-top-right rtl:origin-top-left absolute ltr:right-0 rtl:left-0 mt-2 w-80 rounded-md shadow-lg bg-popover text-popover-foreground ring-1 ring-black ring-opacity-5 focus:outline-none z-20 border border-border">
                    <div className="p-3 border-b border-border">
                        <h3 className="text-sm font-semibold">{t('notifications')}</h3>
                    </div>
                    {/* FIX: Complete the truncated file content with a notification list and footer. */}
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                            <ul className="divide-y divide-border">
                                {notifications.slice(0, 10).map(booking => (
                                    <li key={booking.id} className="p-3 hover:bg-accent">
                                        <Link to="/dashboard/clients" onClick={() => setIsOpen(false)}>
                                            <div className="flex items-start space-x-3 rtl:space-x-reverse">
                                                <div className="flex-shrink-0 mt-1">
                                                     <span className="block h-2.5 w-2.5 rounded-full bg-primary" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-popover-foreground">
                                                        {t('newBookingFrom', { name: booking.customerName })}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">{booking.serviceName}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">{timeSince(new Date(booking.createdAt))}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="p-4 text-sm text-center text-muted-foreground">{t('noNewNotifications')}</p>
                        )}
                    </div>
                    <div className="border-t border-border p-2 text-center">
                        <Link to="/dashboard/clients" onClick={() => setIsOpen(false)} className="text-sm font-medium text-primary hover:underline">
                            {t('viewAllBookings')}
                        </Link>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default NotificationCenter;