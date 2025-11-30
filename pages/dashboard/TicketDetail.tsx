
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { SupportTicket, TicketMessage, TicketStatus } from '../../types';
import { getTicketByIdForUser, addMessageToTicket } from '../../services/supabaseService';
import Spinner from '../../components/ui/Spinner';
import Card, { CardContent, CardHeader, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
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
    return <span className={`${baseClasses} ${statusClasses[status]}`}>{textMap[status]}</span>;
};

const TicketDetail: React.FC = () => {
    const { ticketId } = useParams<{ ticketId: string }>();
    const { user } = useAuth();
    const { t } = useLanguage();
    const [ticket, setTicket] = useState<SupportTicket | null>(null);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchTicket = async () => {
            if (!ticketId || !user) return;
            try {
                const fetchedTicket = await getTicketByIdForUser(ticketId, user.id);
                setTicket(fetchedTicket);
            } catch (error: any) {
                console.error("Failed to fetch ticket details:", error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTicket();
    }, [ticketId, user]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [ticket?.messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !ticket) return;
        setIsSubmitting(true);
        try {
            const addedMessage = await addMessageToTicket(ticket.id, newMessage);
            setTicket(prev => prev ? { ...prev, messages: [...prev.messages, addedMessage] } : null);
            setNewMessage('');
        } catch (error: any) {
            console.error("Failed to send message:", error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    if (!ticket) {
        return (
            <div className="text-center">
                <p className="text-muted-foreground">{t('noTicketFound')}</p>
                <Link to="/dashboard/support" className="mt-4 inline-block">
                    <Button>{t('sidebarSupport')}</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <Link to="/dashboard/support" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                {t('backToTickets')}
            </Link>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{ticket.subject}</h1>
                            <p className="text-sm text-muted-foreground">
                                {t('openedOn', { date: new Date(ticket.createdAt).toLocaleString() })}
                            </p>
                        </div>
                        <StatusBadge status={ticket.status} />
                    </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 h-[50vh] overflow-y-auto bg-muted/30">
                    <div className="space-y-6">
                        {ticket.messages
                            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                            .map((msg) => {
                                const isUserMessage = msg.userId === user?.id;
                                return (
                                    <div key={msg.id} className={`flex w-full ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`flex items-start gap-3 ${isUserMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm ${isUserMessage ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'}`}>
                                                {(msg.userName || (isUserMessage ? (user?.name || 'U') : 'S')).charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col max-w-xs sm:max-w-md">
                                                <div className={`flex items-baseline gap-2 ${isUserMessage ? 'justify-end' : 'justify-start'}`}>
                                                    <p className={`text-xs font-semibold text-foreground`}>
                                                        {isUserMessage ? (user?.name || 'You') : (msg.userName || 'Support')}
                                                    </p>
                                                </div>
                                                <div className={`p-3 rounded-lg mt-1 ${isUserMessage ? 'bg-primary text-primary-foreground' : 'bg-card border border-border'}`}>
                                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                                    <p className={`text-xs mt-2 opacity-70 ${isUserMessage ? 'text-right' : 'text-left'}`}>
                                                        {new Date(msg.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                </CardContent>
                <CardFooter>
                    {ticket.status === TicketStatus.Closed ? (
                        <p className="text-sm text-muted-foreground w-full text-center">{t('ticketClosedMessage')}</p>
                    ) : (
                        <form onSubmit={handleSendMessage} className="w-full flex items-start gap-4">
                            <textarea
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                rows={3}
                                required
                                placeholder={t('typeYourReply')}
                                className="flex-1 block w-full px-3 py-2 bg-card border border-input rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm"
                            />
                            <Button type="submit" isLoading={isSubmitting}>{t('sendReplyButton')}</Button>
                        </form>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
};

export default TicketDetail;
