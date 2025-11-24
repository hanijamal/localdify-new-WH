import React, { useState, useEffect } from 'react';
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

    return (
        <div className="w-full">
            {notifications.length > 0 ? (
                <>
                    <div className="max-h-64 overflow-y-auto">
                        <ul className="space-y-1">
                            {notifications.slice(0, 5).map(booking => (
                                <li key={booking.id} className="rounded-md hover:bg-accent/50 transition-colors">
                                    <Link to="/dashboard/clients" className="block p-2">
                                        <div className="flex items-start space-x-2 rtl:space-x-reverse">
                                            <div className="flex-shrink-0 mt-1">
                                                <span className="block h-2 w-2 rounded-full bg-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-foreground truncate">
                                                    {booking.customerName}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">{booking.serviceName}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{timeSince(new Date(booking.createdAt))}</p>
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border">
                        <Link
                            to="/dashboard/clients"
                            className="block w-full text-center text-sm font-medium text-primary hover:text-primary/80 py-1.5 rounded-md hover:bg-accent transition-colors"
                        >
                            {t('viewAllBookings')}
                        </Link>
                    </div>
                </>
            ) : (
                <p className="text-sm text-center text-muted-foreground py-4">{t('noNewNotifications')}</p>
            )}
        </div>
    );
};

export default NotificationCenter;