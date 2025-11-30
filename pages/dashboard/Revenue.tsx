

import React, { useState, useMemo } from 'react';
import { BookingStatus } from '../../types';
import Spinner from '../../components/ui/Spinner';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import { useBusiness } from '../../hooks/useBusiness';
import Select from '../../components/ui/Select';
import { useLanguage } from '../../hooks/useLanguage';
import { formatPrice } from '../../contexts/BusinessContext';

const DollarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const TrendingUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>;

const Revenue: React.FC = () => {
    const { business, bookings, staff, loading } = useBusiness();
    const { t, language } = useLanguage();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [staffFilter, setStaffFilter] = useState<'all' | string>('all');

    const approvedBookings = useMemo(() => {
        return bookings.filter(b => b.status === BookingStatus.Approved);
    }, [bookings]);

    const filteredBookings = useMemo(() => {
        return approvedBookings.filter(booking => {
            const bookingDate = new Date(booking.date.replace(/-/g, '/'));
            const start = startDate ? new Date(startDate.replace(/-/g, '/')) : null;
            const end = endDate ? new Date(endDate.replace(/-/g, '/')) : null;

            if (start) start.setHours(0, 0, 0, 0);
            if (end) end.setHours(23, 59, 59, 999);
            
            const dateMatch = (!start || bookingDate >= start) && (!end || bookingDate <= end);
            const staffMatch = staffFilter === 'all' || booking.staffMemberId === staffFilter;

            return dateMatch && staffMatch;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [approvedBookings, startDate, endDate, staffFilter]);

    const totalRevenue = useMemo(() => {
        return filteredBookings.reduce((sum, booking) => sum + booking.priceAtBooking, 0);
    }, [filteredBookings]);

    const revenueThisMonth = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return approvedBookings
            .filter(b => {
                const dateMatch = new Date(b.date.replace(/-/g, '/')) >= startOfMonth;
                const staffMatch = staffFilter === 'all' || b.staffMemberId === staffFilter;
                return dateMatch && staffMatch;
            })
            .reduce((sum, booking) => sum + booking.priceAtBooking, 0);
    }, [approvedBookings, staffFilter]);

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    const currentMonthName = new Date().toLocaleString(language, { month: 'long' });

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-foreground">{t('revenue')}</h1>
            
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                <StatCard 
                    title={t('totalRevenueFiltered')}
                    value={formatPrice(totalRevenue, business?.currency)}
                    icon={<DollarIcon />}
                    description={!startDate && !endDate ? t('fromAllAppointments') : t('forSelectedDateRange')}
                />
                <StatCard 
                    title={t('revenueThisMonth')}
                    value={formatPrice(revenueThisMonth, business?.currency)}
                    icon={<TrendingUpIcon />}
                    description={t('forMonth', { month: currentMonthName })}
                />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <h2 className="text-xl font-semibold">{t('salesHistory')}</h2>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <Select
                                id="staff-filter"
                                value={staffFilter}
                                onChange={(e) => setStaffFilter(e.target.value)}
                                aria-label="Filter by staff"
                                className="w-full sm:w-40"
                            >
                                <option value="all">{t('allStaff')}</option>
                                {staff.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </Select>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} aria-label="Start Date" />
                             <span className="text-muted-foreground text-center">{t('to')}</span>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} aria-label="End Date" />
                            <Button variant="ghost" onClick={() => { setStartDate(''); setEndDate(''); }}>{t('clearButton')}</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Desktop Table View */}
                    <div className="overflow-x-auto hidden md:block">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('appointmentDate')}</th>
                                    <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('customerHeader')}</th>
                                    <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('serviceHeader')}</th>
                                    <th className="px-6 py-3 text-end text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('amount')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {filteredBookings.length > 0 ? filteredBookings.map(booking => (
                                    <tr key={booking.id} className="hover:bg-accent transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{booking.date}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-foreground">{booking.customerName}</div>
                                            <div className="text-xs text-muted-foreground">{booking.customerEmail}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{booking.serviceName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium text-foreground">{formatPrice(booking.priceAtBooking, business?.currency)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="text-center py-10 text-muted-foreground">{t('noSalesFound')}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                     {/* Mobile Card View */}
                    <div className="md:hidden">
                        {filteredBookings.length > 0 ? (
                            <ul className="divide-y divide-border">
                                {filteredBookings.map(booking => (
                                    <li key={booking.id} className="p-4 flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-foreground">{booking.customerName}</p>
                                            <p className="text-sm text-muted-foreground">{booking.serviceName}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{booking.date}</p>
                                        </div>
                                        <p className="text-lg font-bold text-foreground">{formatPrice(booking.priceAtBooking, business?.currency)}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                             <div className="text-center py-10 text-muted-foreground">
                                {t('noSalesFound')}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Revenue;