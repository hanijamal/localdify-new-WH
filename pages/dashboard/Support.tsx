
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useBusiness } from '../../hooks/useBusiness';
import { SupportTicket, TicketStatus } from '../../types';
import { getTicketsForUser, createTicket } from '../../services/supabaseService';
import Spinner from '../../components/ui/Spinner';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import TicketModal from '../../components/TicketModal';
import { useLanguage } from '../../hooks/useLanguage';

const StatusBadge: React.FC<{ status: TicketStatus }> = ({ status }) => {
    const { t } = useLanguage();
    const baseClasses = "px-2.5 py-0.5 text-xs font-medium leading-5 rounded-full inline-block";
    const statusClasses = {
        [TicketStatus.Open]: "bg-blue-400/20 text-blue-500",
        [TicketStatus.InProgress]: "bg-yellow-400/20 text-yellow-500",
        [TicketStatus.Closed]: "bg-gray-400/20 text-gray-500",
    };
    const textMap = {
        [TicketStatus.Open]: t('openStatus'),
        [TicketStatus.InProgress]: t('inProgressStatus'),
        [TicketStatus.Closed]: t('closedStatus'),
    }
    return (
        <span className={`${baseClasses} ${statusClasses[status]}`}>
            {textMap[status]}
        </span>
    );
};

const Support: React.FC = () => {
    const { user } = useAuth();
    const { business } = useBusiness();
    const { t } = useLanguage();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchTickets = async () => {
            if (!user) return;
            try {
                const userTickets = await getTicketsForUser(user.id);
                setTickets(userTickets);
            } catch (error: any) {
                console.error("Failed to fetch support tickets:", error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTickets();
    }, [user]);
    
    const handleTicketSubmit = async (subject: string, message: string) => {
        const newTicket = await createTicket(subject, message);
        setTickets(prev => [newTicket, ...prev]);
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-3xl font-bold text-foreground">{t('supportCenter')}</h1>
                    <Button onClick={() => setIsModalOpen(true)}>{t('createNewTicket')}</Button>
                </div>

                <Card>
                    <CardHeader>
                        <h2 className="text-xl font-semibold">{t('yourSupportTickets')}</h2>
                        <p className="text-sm text-muted-foreground">{t('yourSupportTicketsDesc')}</p>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('userHeader')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('businessHeader')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('subjectHeader')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('statusHeader')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('lastUpdatedHeader')}</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('actionsHeader')}</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                    {tickets.length > 0 ? tickets.map(ticket => (
                                        <tr key={ticket.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-foreground">{user?.name}</div>
                                                <div className="text-xs text-muted-foreground">{user?.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{business?.name || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{ticket.subject}</td>
                                            <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={ticket.status} /></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{new Date(ticket.updatedAt).toLocaleString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Link to={`/dashboard/support/${ticket.id}`}>
                                                    <Button variant="ghost">{t('viewAction')}</Button>
                                                </Link>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="text-center py-10 text-muted-foreground">{t('noTicketsYet')}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <TicketModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleTicketSubmit}
            />
        </>
    );
};

export default Support;
