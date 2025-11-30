import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
// FIX: Import the new Page type.
import { User, SupportTicket, TicketStatus, Template, Page, Plan } from '../types';
import { 
    getAllUsersWithBusiness, 
    getAllStats, 
    adminDeleteUser, 
    adminCreateUser, 
    adminUpdateUser,
    getAllTicketsForAdmin,
    addMessageToTicket,
    updateTicketStatus as apiUpdateTicketStatus,
    getTemplates,
    createTemplate as apiCreateTemplate,
    updateTemplate as apiUpdateTemplate,
    deleteTemplate as apiDeleteTemplate,
    // FIX: Import page management functions from the service.
    getPages,
    addPage as apiAddPage,
    updatePage as apiUpdatePage,
    deletePage as apiDeletePage,
    getPlans,
    addPlan as apiAddPlan,
    updatePlan as apiUpdatePlan,
    deletePlan as apiDeletePlan
} from '../services/supabaseService';

interface AdminStats {
    totalUsers: number;
    totalBusinesses: number;
    totalBookings: number;
}

// FIX: Update context type to include page management properties.
interface AdminContextType {
    stats: AdminStats | null;
    users: User[];
    tickets: SupportTicket[];
    templates: Template[];
    pages: Page[];
    plans: Plan[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    addUser: (userData: any) => Promise<void>;
    updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
    addTicketReply: (ticketId: string, content: string) => Promise<void>;
    updateTicketStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
    addTemplate: (templateData: Omit<Template, 'id' | 'createdAt'>) => Promise<void>;
    updateTemplate: (templateId: string, updates: Partial<Omit<Template, 'id' | 'createdAt'>>) => Promise<void>;
    deleteTemplate: (templateId: string) => Promise<void>;
    addPage: (pageData: Partial<Page>) => Promise<void>;
    updatePage: (pageId: string, updates: Partial<Page>) => Promise<void>;
    deletePage: (pageId: string) => Promise<void>;
    addPlan: (planData: Partial<Plan>) => Promise<void>;
    updatePlan: (planId: string, updates: Partial<Plan>) => Promise<void>;
    deletePlan: (planId: string) => Promise<void>;
}

export const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, isAdmin } = useAuth();
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    // FIX: Add state for managing pages.
    const [pages, setPages] = useState<Page[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!isAdmin) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // FIX: Fetch pages data along with other admin data.
            const [statsData, usersData, ticketsData, templatesData, pagesData, plansData] = await Promise.all([
                getAllStats(),
                getAllUsersWithBusiness(),
                getAllTicketsForAdmin(),
                getTemplates(),
                getPages(),
                getPlans(),
            ]);
            setStats(statsData);
            setUsers(usersData);
            setTickets(ticketsData);
            setTemplates(templatesData);
            setPages(pagesData);
            setPlans(plansData);
        } catch (err: any) {
            console.error("Failed to fetch admin data:", err.message);
            const errorMessage = err?.message || (typeof err === 'object' ? JSON.stringify(err) : "An unexpected error occurred.");
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        if(isAdmin) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [fetchData, isAdmin]);
    
    const deleteUser = async (userId: string) => {
        await adminDeleteUser(userId);
        await fetchData();
    };
    
    const addUser = async (userData: any) => {
        await adminCreateUser(userData);
        await fetchData();
    }
    
    const updateUser = async (userId: string, updates: Partial<User>) => {
        await adminUpdateUser(userId, updates);
        await fetchData();
    }
    
    const addTicketReply = async (ticketId: string, content: string) => {
        const newMessage = await addMessageToTicket(ticketId, content);
        setTickets(prevTickets => prevTickets.map(ticket => {
            if (ticket.id === ticketId) {
                return { ...ticket, messages: [...ticket.messages, newMessage], updatedAt: new Date().toISOString() };
            }
            return ticket;
        }));
    };
    
    const updateTicketStatus = async (ticketId: string, status: TicketStatus) => {
        await apiUpdateTicketStatus(ticketId, status);
        setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status, updatedAt: new Date().toISOString() } : t));
    };

    const addTemplate = async (templateData: Omit<Template, 'id' | 'createdAt'>) => {
        await apiCreateTemplate(templateData);
        await fetchData();
    };

    const updateTemplate = async (templateId: string, updates: Partial<Omit<Template, 'id' | 'createdAt'>>) => {
        await apiUpdateTemplate(templateId, updates);
        await fetchData();
    };

    const deleteTemplate = async (templateId: string) => {
        await apiDeleteTemplate(templateId);
        await fetchData();
    };

    // FIX: Implement page management functions.
    const addPage = async (pageData: Partial<Page>) => {
        await apiAddPage(pageData);
        await fetchData();
    };

    const updatePage = async (pageId: string, updates: Partial<Page>) => {
        await apiUpdatePage(pageId, updates);
        await fetchData();
    };

    const deletePage = async (pageId: string) => {
        await apiDeletePage(pageId);
        await fetchData();
    };

    const addPlan = async (planData: Partial<Plan>) => {
        await apiAddPlan(planData);
        await fetchData();
    };

    const updatePlan = async (planId: string, updates: Partial<Plan>) => {
        await apiUpdatePlan(planId, updates);
        await fetchData();
    };

    const deletePlan = async (planId: string) => {
        await apiDeletePlan(planId);
        await fetchData();
    };

    return (
        <AdminContext.Provider value={{ 
            stats, 
            users, 
            tickets,
            templates,
            // FIX: Provide page state and functions through the context.
            pages,
            plans,
            loading, 
            error, 
            refetch: fetchData, 
            deleteUser, 
            addUser, 
            updateUser,
            addTicketReply,
            updateTicketStatus,
            addTemplate,
            updateTemplate,
            deleteTemplate,
            addPage,
            updatePage,
            deletePage,
            addPlan,
            updatePlan,
            deletePlan,
        }}>
            {children}
        </AdminContext.Provider>
    );
};