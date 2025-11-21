import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { BookingStatus } from '../../types';
import Spinner from '../../components/ui/Spinner';
import StatCard from '../../components/ui/StatCard';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Chart from '../../components/ui/Chart';
import Select from '../../components/ui/Select';
import { useBusiness } from '../../hooks/useBusiness';
import { useLanguage } from '../../hooks/useLanguage';
import { formatPrice } from '../../contexts/BusinessContext';
import { getSystemSetting } from '../../services/supabaseService';
import Modal from '../../components/ui/Modal';

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const { business, bookings, loading } = useBusiness();
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    
    const [chartMetric, setChartMetric] = useState<'appointments' | 'revenue' | 'clients'>('appointments');
    const [dateRangeFilter, setDateRangeFilter] = useState('last7days');
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

    useEffect(() => {
        const fetchVideoUrl = async () => {
            try {
                const setting = await getSystemSetting<string>('dashboard_video_url');
                const url = setting?.value;
                if (url && typeof url === 'string' && url.trim()) {
                    setVideoUrl(url);
                }
            } catch (e) {
                console.error("Failed to load video URL setting", e);
            }
        };
        fetchVideoUrl();
    }, []);
    
    const todayFormatted = useMemo(() => {
      const locale = language === 'pt-BR' ? 'pt-BR' : language === 'ar' ? 'ar-SA' : 'en-US';
      const options: Intl.DateTimeFormatOptions = {
        month: 'long',
        day: 'numeric',
      };
      if (language === 'ar') {
        options.calendar = 'gregory';
        options.numberingSystem = 'latn';
      }
      return t('todayDate', { date: new Intl.DateTimeFormat(locale, options).format(new Date()) });
    }, [language, t]);


    const todaysAppointmentsCount = useMemo(() => {
        if (!bookings) return 0;
        const today = new Date().toISOString().split('T')[0];
        return bookings.filter(b => b.date === today && b.status !== BookingStatus.Canceled).length;
    }, [bookings]);

    const todaysBookingsCount = useMemo(() => {
        if (!bookings) return 0;
        const today = new Date().toISOString().split('T')[0];
        return bookings.filter(b => new Date(b.createdAt).toISOString().split('T')[0] === today).length;
    }, [bookings]);
    
    const dashboardStats = useMemo(() => {
        if (!bookings) return null;

        const now = new Date();
        const thirtyDaysAgo = new Date(new Date().setDate(now.getDate() - 30));
        const sixtyDaysAgo = new Date(new Date().setDate(now.getDate() - 60));

        const approvedBookings = bookings.filter(b => b.status === BookingStatus.Approved);
        const nonCanceledBookings = bookings.filter(b => b.status !== BookingStatus.Canceled);

        // --- Revenue ---
        const currentRevenue = approvedBookings
            .filter(b => new Date(b.date) >= thirtyDaysAgo)
            .reduce((sum, b) => sum + b.priceAtBooking, 0);
        
        const previousRevenue = approvedBookings
            .filter(b => new Date(b.date) >= sixtyDaysAgo && new Date(b.date) < thirtyDaysAgo)
            .reduce((sum, b) => sum + b.priceAtBooking, 0);

        const revenuePercentageChange = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : (currentRevenue > 0 ? 100 : 0);
        
        // --- Appointments ---
        const currentAppointments = nonCanceledBookings.filter(b => new Date(b.date) >= thirtyDaysAgo).length;
        const previousAppointments = nonCanceledBookings.filter(b => new Date(b.date) >= sixtyDaysAgo && new Date(b.date) < thirtyDaysAgo).length;
        const appointmentsPercentageChange = previousAppointments > 0 ? ((currentAppointments - previousAppointments) / previousAppointments) * 100 : (currentAppointments > 0 ? 100 : 0);

        return {
            revenue: {
                value: currentRevenue,
                percentageChange: revenuePercentageChange
            },
            appointments: {
                value: currentAppointments.toString(),
                percentageChange: appointmentsPercentageChange
            }
        };
    }, [bookings]);

    const topServices = useMemo(() => {
        if (!bookings || bookings.length === 0) return [];

        const serviceCounts = new Map<string, number>();

        bookings
            .filter(b => b.status !== BookingStatus.Canceled)
            .forEach(booking => {
                const name = booking.serviceName;
                serviceCounts.set(name, (serviceCounts.get(name) || 0) + 1);
            });
        
        const sortedServices = Array.from(serviceCounts.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);
        
        return sortedServices.slice(0, 5);
    }, [bookings]);

    const chartData = useMemo(() => {
        if (!bookings || bookings.length === 0) return [];

        const now = new Date();
        const endDate = new Date();
        let startDate = new Date();

        switch (dateRangeFilter) {
            case 'last7days':
                startDate.setDate(now.getDate() - 6);
                break;
            case 'last14days':
                startDate.setDate(now.getDate() - 13);
                break;
            case 'last30days':
                startDate.setDate(now.getDate() - 29);
                break;
            case 'today':
                startDate = new Date(now);
                break;
            case 'yesterday':
                startDate.setDate(now.getDate() - 1);
                endDate.setDate(now.getDate() - 1);
                break;
        }

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        // Create a map to hold the data for each day in the range
        const dataByDate = new Map<string, number>();
        const tempDate = new Date(startDate);
        while (tempDate <= endDate) {
            const dateKey = tempDate.toISOString().split('T')[0];
            dataByDate.set(dateKey, 0);
            tempDate.setDate(tempDate.getDate() + 1);
        }

        if (chartMetric === 'appointments') {
            bookings
                .filter(b => b.status !== BookingStatus.Canceled)
                .forEach(b => {
                    const bookingDate = new Date(b.date.replace(/-/g, '/'));
                    bookingDate.setHours(0,0,0,0);
                    if (bookingDate >= startDate && bookingDate <= endDate) {
                        const dateKey = bookingDate.toISOString().split('T')[0];
                        if (dataByDate.has(dateKey)) {
                            dataByDate.set(dateKey, (dataByDate.get(dateKey) || 0) + 1);
                        }
                    }
                });
        } else if (chartMetric === 'revenue') {
            bookings
                .filter(b => b.status === BookingStatus.Approved)
                .forEach(b => {
                    const bookingDate = new Date(b.date.replace(/-/g, '/'));
                    bookingDate.setHours(0,0,0,0);
                     if (bookingDate >= startDate && bookingDate <= endDate) {
                        const dateKey = bookingDate.toISOString().split('T')[0];
                        if (dataByDate.has(dateKey)) {
                            dataByDate.set(dateKey, (dataByDate.get(dateKey) || 0) + b.priceAtBooking);
                        }
                    }
                });
        } else if (chartMetric === 'clients') {
            const firstBookingByClient = new Map<string, Date>();
            const sortedByCreation = [...bookings].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            sortedByCreation.forEach(b => {
                if (!firstBookingByClient.has(b.customerEmail)) {
                    firstBookingByClient.set(b.customerEmail, new Date(b.createdAt));
                }
            });

            Array.from(firstBookingByClient.values()).forEach(creationDate => {
                const creationDateDay = new Date(creationDate);
                creationDateDay.setHours(0,0,0,0);
                if (creationDateDay >= startDate && creationDateDay <= endDate) {
                    const dateKey = creationDateDay.toISOString().split('T')[0];
                    if (dataByDate.has(dateKey)) {
                        dataByDate.set(dateKey, (dataByDate.get(dateKey) || 0) + 1);
                    }
                }
            });
        }
        
        const locale = language === 'pt-BR' ? 'pt-BR' : language === 'ar' ? 'ar-SA' : 'en-US';
        const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
        if (language === 'ar') {
            options.calendar = 'gregory';
            options.numberingSystem = 'latn';
        }

        // Convert map to the format expected by the Chart component
        return Array.from(dataByDate.entries())
            .sort((a,b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
            .map(([date, value]) => ({
                label: new Date(`${date}T00:00:00`).toLocaleDateString(locale, options),
                value: value
            }));
    }, [bookings, dateRangeFilter, chartMetric, language]);

    const handleTodaysAppointmentsClick = () => {
        const today = new Date().toISOString().split('T')[0];
        navigate('/dashboard/clients', { state: { defaultDate: today } });
    };

    const handleTodaysBookingsClick = () => {
        const today = new Date().toISOString().split('T')[0];
        navigate('/dashboard/clients', { state: { defaultCreationDate: today } });
    };
    
    const videoModalContent = (
        <div className="p-1">
            <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
                {videoUrl ? (
                    <iframe 
                        src={videoUrl} 
                        title="Video player" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen
                        className="absolute top-0 left-0 w-full h-full rounded-lg"
                    ></iframe>
                ) : (
                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center h-full text-muted-foreground bg-black rounded-lg">
                        <p>Video could not be loaded.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderContent = () => {
        if (loading) {
            return <div className="flex justify-center items-center h-full"><Spinner /></div>;
        }

        if (!business) {
            return (
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-foreground">{t('welcomeBack', { name: user?.name })}</h1>
                    <p className="mt-2 text-muted-foreground">{t('setupBusinessPrompt')}</p>
                    <div className="mt-6 flex justify-center items-center gap-4">
                        <Button onClick={() => navigate('/dashboard/settings')}>
                            {t('goToSettingsPrompt')}
                        </Button>
                        {videoUrl && (
                            <Button variant="secondary" onClick={() => setIsVideoModalOpen(true)}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                                {t('videoTutorial')}
                            </Button>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">{t('welcomeBack', { name: user?.name })}</h1>
                        <p className="text-muted-foreground">{todayFormatted}</p>
                    </div>
                    {videoUrl && (
                        <Button variant="secondary" onClick={() => setIsVideoModalOpen(true)}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            {t('videoTutorial')}
                        </Button>
                    )}
                </div>
                
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                     <StatCard 
                        title={t('todaysAppointments')} 
                        value={todaysAppointmentsCount.toString()} 
                        description={t('viewTodaysClients')}
                        onClick={handleTodaysAppointmentsClick}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                    />
                    <StatCard
                        title={t('todaysBookings')}
                        value={todaysBookingsCount.toString()}
                        description={t('viewTodaysBookings')}
                        onClick={handleTodaysBookingsClick}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
                    />
                    {dashboardStats && (
                        <>
                            <StatCard 
                                title={t('totalRevenue')} 
                                value={formatPrice(dashboardStats.revenue.value, business?.currency)} 
                                percentageChange={dashboardStats.revenue.percentageChange}
                                changePeriod={t('fromLast30Days')}
                            />
                            <StatCard 
                                title={t('totalAppointments')} 
                                value={dashboardStats.appointments.value}
                                percentageChange={dashboardStats.appointments.percentageChange}
                                changePeriod={t('fromLast30Days')}
                            />
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h2 className="text-xl font-semibold">{t('activityOverview')}</h2>
                                <p className="text-sm text-muted-foreground">{t('activityOverviewDesc')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Select value={chartMetric} onChange={(e) => setChartMetric(e.target.value as any)} className="w-40">
                                    <option value="appointments">{t('appointmentsChart')}</option>
                                    <option value="revenue">{t('revenueChart')}</option>
                                    <option value="clients">{t('newClientsChart')}</option>
                                </Select>
                                <Select value={dateRangeFilter} onChange={(e) => setDateRangeFilter(e.target.value)} className="w-40">
                                    <option value="last7days">{t('last7Days')}</option>
                                    <option value="last14days">{t('last14Days')}</option>
                                    <option value="last30days">{t('last30Days')}</option>
                                    <option value="today">{t('today')}</option>
                                    <option value="yesterday">{t('yesterday')}</option>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Chart data={chartData} metric={chartMetric} currency={business?.currency || 'USD'} />
                        </CardContent>
                    </Card>
                    <Card className="lg:col-span-1 flex flex-col">
                        <CardHeader>
                            <h2 className="text-xl font-semibold">{t('topServices')}</h2>
                            <p className="text-sm text-muted-foreground">{t('topServicesDesc')}</p>
                        </CardHeader>
                        <CardContent className="flex-grow">
                            {topServices.length > 0 ? (
                                <ul className="space-y-4">
                                    {topServices.map((service, index) => {
                                        const topCount = topServices[0].count;
                                        const percentage = topCount > 0 ? (service.count / topCount) * 100 : 0;
                                        return (
                                            <li key={index}>
                                                <div className="flex justify-between items-center mb-1 gap-4">
                                                    <p className="text-sm font-medium text-foreground truncate" title={service.name}>{service.name}</p>
                                                    <p className="text-sm font-semibold text-foreground flex-shrink-0">{service.count}</p>
                                                </div>
                                                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                                    <div 
                                                        className="bg-primary h-2 rounded-full" 
                                                        style={{ width: `${percentage}%` }}
                                                        role="progressbar"
                                                        aria-valuenow={service.count}
                                                        aria-valuemin={0}
                                                        aria-valuemax={topCount}
                                                        aria-label={`${service.name}: ${service.count} bookings`}
                                                    ></div>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                    <p>{t('noBookingData')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div>
            {renderContent()}
            <Modal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} title={t('videoTutorial')} widthClass="max-w-4xl">
                {videoModalContent}
            </Modal>
        </div>
    );
};

export default Dashboard;
