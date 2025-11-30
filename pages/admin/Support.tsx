
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SupportTicket, TicketStatus } from '../../types';
import Spinner from '../../components/ui/Spinner';
import Card, { CardContent, CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useAdmin } from '../../hooks/useAdmin';
import { useLanguage } from '../../hooks/useLanguage';

const AdminSupport: React.FC = () => {
    const { tickets, loading, updateTicketStatus } = useAdmin();
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');

    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            const statusMatch = statusFilter === 'all' || ticket.status === statusFilter;
            const searchMatch = !searchTerm ||
                ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.businessName?.toLowerCase().includes(searchTerm.toLowerCase());
            return statusMatch && searchMatch;
        });
    }, [tickets, statusFilter, searchTerm]);

    const handleStatusChange = async (ticketId: string, status: TicketStatus) => {
        try {
            await updateTicketStatus(ticketId, status);
        } catch (error: any) {
            console.error('Failed to update status:', error.message);
            alert('Failed to update ticket status. Please try again.');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-foreground">{t('adminSupportTickets')}</h1>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-semibold">{t('allTickets')}</h2>
                            <p className="text-sm text-muted-foreground">{t('allTicketsDesc')}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Input
                                type="search"
                                placeholder={t('searchTicketsPlaceholder')}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full sm:w-64"
                            />
                            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="w-full sm:w-40">
                                <option value="all">{t('allStatuses')}</option>
                                <option value={TicketStatus.Open}>{t('openStatus')}</option>
                                <option value={TicketStatus.InProgress}>{t('inProgressStatus')}</option>
                                <option value={TicketStatus.Closed}>{t('closedStatus')}</option>
                            </Select>
                        </div>
                    </div>
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
                                {filteredTickets.length > 0 ? filteredTickets.map(ticket => (
                                    <tr key={ticket.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-foreground">{ticket.userName}</div>
                                            <div className="text-xs text-muted-foreground">{ticket.userEmail}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{ticket.businessName || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{ticket.subject}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                             <Select
                                                value={ticket.status}
                                                onChange={(e) => handleStatusChange(ticket.id, e.target.value as TicketStatus)}
                                                className="w-full sm:w-40 text-sm"
                                                aria-label={`Current status: ${ticket.status}. Change status.`}
                                            >
                                                <option value={TicketStatus.Open}>{t('openStatus')}</option>
                                                <option value={TicketStatus.InProgress}>{t('inProgressStatus')}</option>
                                                <option value={TicketStatus.Closed}>{t('closedStatus')}</option>
                                            </Select>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{new Date(ticket.updatedAt).toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link to={`/admin/support/${ticket.id}`}>
                                                <Button variant="ghost">{t('viewAction')}</Button>
                                            </Link>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="text-center py-10 text-muted-foreground">{t('noTicketsFound')}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminSupport;
