import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { updateBookingStatus } from '../../services/supabaseService';
import { Booking, BookingStatus } from '../../types';
import Spinner from '../../components/ui/Spinner';
import Card, { CardContent, CardHeader, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Dropdown, { DropdownItem } from '../../components/ui/Dropdown';
import { useBusiness } from '../../hooks/useBusiness';
import { useLanguage } from '../../hooks/useLanguage';

const StatusBadge: React.FC<{ status: BookingStatus }> = ({ status }) => {
    const { t } = useLanguage();
    const baseClasses = "px-2.5 py-0.5 text-xs font-medium leading-5 rounded-full inline-block";
    const statusClasses = {
        [BookingStatus.Pending]: "bg-yellow-400/20 text-yellow-500",
        [BookingStatus.Approved]: "bg-green-400/20 text-green-500",
        [BookingStatus.Canceled]: "bg-red-400/20 text-red-500",
    };
    const statusText = {
        [BookingStatus.Pending]: "Pending",
        [BookingStatus.Approved]: t('approvedStatus'),
        [BookingStatus.Canceled]: t('canceledStatus'),
    }
    return (
        <span className={`${baseClasses} ${statusClasses[status]}`}>
            {statusText[status]}
        </span>
    );
};

const ClientCard: React.FC<{ booking: Booking, onUpdateStatus: (id: string, status: BookingStatus) => void, staffName: string | undefined }> = ({ booking, onUpdateStatus, staffName }) => {
    const { t } = useLanguage();
    return (
    <Card>
        <CardHeader className="flex justify-between items-start">
            <div>
                <p className="font-semibold text-foreground">{booking.customerName}</p>
                <p className="text-sm text-muted-foreground">{booking.customerEmail}</p>
                 <p className="text-sm text-muted-foreground">{booking.customerPhone}</p>
            </div>
            <Dropdown
                trigger={
                    <button className="p-2 text-muted-foreground rounded-full hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-card" aria-label="Booking options">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                    </button>
                }
            >
                {booking.status === BookingStatus.Pending && (
                    <DropdownItem onClick={() => onUpdateStatus(booking.id, BookingStatus.Approved)} className="text-green-600 dark:text-green-400 hover:bg-green-500/10">
                        {t('approveAction')}
                    </DropdownItem>
                )}
                 {(booking.status === BookingStatus.Pending || booking.status === BookingStatus.Approved) && (
                    <DropdownItem onClick={() => onUpdateStatus(booking.id, BookingStatus.Canceled)} className="text-destructive hover:bg-destructive/10">
                        {t('cancelAction')}
                    </DropdownItem>
                )}
            </Dropdown>
        </CardHeader>
        <CardContent className="space-y-3">
             <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">{t('statusHeader')}</span>
                <StatusBadge status={booking.status} />
            </div>
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">{t('serviceHeader')}</span>
                <span className="text-sm text-foreground">{booking.serviceName}</span>
            </div>
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">{t('staffHeader')}</span>
                <span className="text-sm text-foreground">{staffName || t('anyAvailable')}</span>
            </div>
             <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">{t('dateTimeHeader')}</span>
                <span className="text-sm text-foreground">{booking.date} at {booking.time}</span>
            </div>
            {booking.notes && (
                <div>
                    <span className="text-sm font-medium text-muted-foreground">{t('notesHeader')}</span>
                    <p className="text-sm text-foreground mt-1 bg-muted/50 p-2 rounded-md">{booking.notes}</p>
                </div>
            )}
        </CardContent>
        <CardFooter className="flex justify-end items-center space-x-4">
            <a 
               href={`https://wa.me/${booking.customerPhone.replace(/\D/g, '')}`} 
               target="_blank" 
               rel="noopener noreferrer"
               aria-label="Contact via WhatsApp"
               className="text-muted-foreground hover:text-green-500"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.505 1.905 6.431l-1.287 4.705 4.752-1.247zm11.39-5.762c-.229-.115-1.354-.667-1.565-.742-.211-.074-.367-.115-.523.116-.157.232-.592.742-.727.889-.135.146-.27.165-.5.05-.229-.115-.962-.354-1.833-1.13-.68-.593-1.144-1.324-1.279-1.541-.135-.217-.014-.33.101-.444.102-.102.229-.26.344-.39.115-.13.156-.231.231-.387.075-.156.038-.288-.018-.402-.057-.115-.523-1.254-.718-1.711-.195-.457-.39-.395-.523-.402-.134-.007-.289-.007-.445-.007-.156 0-.402.057-.613.288-.211.231-.808.79-1.061 2.066-.252 1.275.211 2.531.231 2.688.02.156.511 1.667 3.303 3.328 2.091 1.202 2.79 1.625 3.36.195.57-.231.962-.925 1.09-1.275.128-.35.128-.65.09-.742z" />
                </svg>
            </a>
            <a 
               href={`mailto:${booking.customerEmail}`}
               aria-label="Contact via Email"
               className="text-muted-foreground hover:text-primary"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
            </a>
        </CardFooter>
    </Card>
)};


const Bookings: React.FC = () => {
    const { bookings, staff, loading, refetch } = useBusiness();
    const { t } = useLanguage();
    const location = useLocation();
    const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
    const [dateFilter, setDateFilter] = useState(() => location.state?.defaultDate || '');
    const [creationDateFilter, setCreationDateFilter] = useState(() => location.state?.defaultCreationDate || '');
    const [staffFilter, setStaffFilter] = useState<'all' | string>('all');

    const staffMap = useMemo(() => new Map(staff.map(s => [s.id, s.name])), [staff]);

    const handleUpdateStatus = async (bookingId: string, status: BookingStatus) => {
        try {
            await updateBookingStatus(bookingId, status);
            await refetch(); // Refetch all business data to ensure consistency
        } catch (error: any) {
            console.error("Failed to update status:", error.message);
        }
    };
    
    const filteredClients = useMemo(() => {
        return bookings.filter(client => {
            const statusMatch = filter === 'all' || client.status === filter;
            const staffMatch = staffFilter === 'all' || client.staffMemberId === staffFilter;

            if (creationDateFilter) {
                const creationDateMatch = new Date(client.createdAt).toISOString().split('T')[0] === creationDateFilter;
                return statusMatch && staffMatch && creationDateMatch;
            }
            
            const dateMatch = !dateFilter || client.date === dateFilter;
            return statusMatch && staffMatch && dateMatch;
        });
    }, [bookings, filter, dateFilter, staffFilter, creationDateFilter]);

    const exportToCSV = () => {
        const headers = ["Customer Name", "Email", "Phone", "Service", "Staff Member", "Date", "Time", "Status", "Notes"];
        const rows = filteredClients.map(b => 
            [b.customerName, b.customerEmail, b.customerPhone, b.serviceName, staffMap.get(b.staffMemberId!) || 'Any', b.date, b.time, b.status, `"${b.notes || ''}"`].join(',')
        );
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "clients.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold text-foreground">{t('yourClients')}</h1>
                 <Button onClick={exportToCSV} variant="secondary" className="w-full sm:w-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {t('exportToCSV')}
                 </Button>
            </div>

            <Card>
                <CardHeader>
                     <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-4">
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
                        <Select
                            id="status-filter"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as BookingStatus | 'all')}
                            aria-label="Filter by status"
                            className="w-full sm:w-40"
                        >
                            <option value="all">{t('allStatuses')}</option>
                            <option value={BookingStatus.Approved}>{t('approvedStatus')}</option>
                            <option value={BookingStatus.Canceled}>{t('canceledStatus')}</option>
                        </Select>

                        <div className="flex items-center space-x-2">
                            <Input
                                id="date-filter"
                                type="date"
                                value={dateFilter}
                                onChange={(e) => {
                                    setDateFilter(e.target.value);
                                    setCreationDateFilter('');
                                }}
                                aria-label="Filter by date"
                                className="flex-grow"
                                disabled={!!creationDateFilter}
                            />
                            {dateFilter && !creationDateFilter && (
                                <Button variant="ghost" onClick={() => setDateFilter('')}>{t('clearButton')}</Button>
                            )}
                        </div>
                    </div>
                     {creationDateFilter && (
                        <div className="mt-4 p-3 bg-accent rounded-lg flex items-center justify-between">
                            <p className="text-sm text-accent-foreground">
                                {t('showingBookingsCreatedOn', { date: creationDateFilter })}
                            </p>
                            <Button variant="ghost" size="sm" onClick={() => setCreationDateFilter('')}>{t('clearButton')}</Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    {/* Desktop Table View */}
                    <div className="overflow-x-auto hidden md:block">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('customerHeader')}</th>
                                    <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('serviceHeader')}</th>
                                    <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('staffHeader')}</th>
                                    <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('dateTimeHeader')}</th>
                                    <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('notesHeader')}</th>
                                    <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('statusHeader')}</th>
                                    <th className="px-6 py-3 text-start text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('contactHeader')}</th>
                                    <th className="px-6 py-3 text-end text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('actionsHeader')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {filteredClients.length > 0 ? filteredClients.map(booking => (
                                    <tr key={booking.id} className="hover:bg-accent transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-foreground">{booking.customerName}</div>
                                            <div className="text-xs text-muted-foreground">{booking.customerEmail}</div>
                                            <div className="text-xs text-muted-foreground">{booking.customerPhone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{booking.serviceName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{staffMap.get(booking.staffMemberId!) || t('anyAvailable')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{booking.date} at {booking.time}</td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs whitespace-normal">{booking.notes || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={booking.status} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-3">
                                                <a 
                                                   href={`https://wa.me/${booking.customerPhone.replace(/\D/g, '')}`} 
                                                   target="_blank" 
                                                   rel="noopener noreferrer"
                                                   aria-label="Contact via WhatsApp"
                                                   className="text-muted-foreground hover:text-green-500"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.505 1.905 6.431l-1.287 4.705 4.752-1.247zm11.39-5.762c-.229-.115-1.354-.667-1.565-.742-.211-.074-.367-.115-.523.116-.157.232-.592.742-.727.889-.135.146-.27.165-.5.05-.229-.115-.962-.354-1.833-1.13-.68-.593-1.144-1.324-1.279-1.541-.135-.217-.014-.33.101-.444.102-.102.229-.26.344-.39.115-.13.156-.231.231-.387.075-.156.038-.288-.018-.402-.057-.115-.523-1.254-.718-1.711-.195-.457-.39-.395-.523-.402-.134-.007-.289-.007-.445-.007-.156 0-.402.057-.613.288-.211.231-.808.79-1.061 2.066-.252 1.275.211 2.531.231 2.688.02.156.511 1.667 3.303 3.328 2.091 1.202 2.79 1.625 3.36.195.57-.231.962-.925 1.09-1.275.128-.35.128-.65.09-.742z" />
                                                    </svg>
                                                </a>
                                                <a 
                                                   href={`mailto:${booking.customerEmail}`}
                                                   aria-label="Contact via Email"
                                                   className="text-muted-foreground hover:text-primary"
                                                >
                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                                    </svg>
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-end text-sm font-medium">
                                            {(booking.status === BookingStatus.Pending || booking.status === BookingStatus.Approved) && (
                                                <Dropdown
                                                    trigger={
                                                        <button className="p-2 text-muted-foreground rounded-full hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-background" aria-label="Booking options">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                            </svg>
                                                        </button>
                                                    }
                                                >
                                                    {booking.status === BookingStatus.Pending && (
                                                        <DropdownItem 
                                                            onClick={() => handleUpdateStatus(booking.id, BookingStatus.Approved)}
                                                            className="text-green-600 dark:text-green-400 hover:bg-green-500/10"
                                                        >
                                                            {t('approveAction')}
                                                        </DropdownItem>
                                                    )}
                                                    <DropdownItem 
                                                        onClick={() => handleUpdateStatus(booking.id, BookingStatus.Canceled)}
                                                        className="text-destructive hover:bg-destructive/10"
                                                    >
                                                        {t('cancelAction')}
                                                    </DropdownItem>
                                                </Dropdown>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={8} className="text-center py-10 text-muted-foreground">{t('noClientsFound')}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                     {/* Mobile Card View */}
                    <div className="md:hidden p-4 space-y-4">
                        {filteredClients.length > 0 ? filteredClients.map(booking => (
                            <ClientCard 
                                key={booking.id} 
                                booking={booking} 
                                onUpdateStatus={handleUpdateStatus} 
                                staffName={staffMap.get(booking.staffMemberId!)}
                            />
                        )) : (
                            <div className="text-center py-10 text-muted-foreground">
                                {t('noClientsFound')}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default Bookings;