import { supabase } from '../supabaseClient';
import { User, Business, Service, Booking, BookingStatus, ShortLink, SupportTicket, TicketMessage, TicketStatus, PayPalConfig, SystemSetting, PaymentHistory, StaffMember, Template } from '../types';

// Helper to map Supabase's snake_case to our camelCase, especially for dates.
export const mapBookingFromDb = (dbBooking: any): Booking => ({
  id: dbBooking.id,
  businessId: dbBooking.business_id,
  customerName: dbBooking.customer_name,
  customerEmail: dbBooking.customer_email,
  customerPhone: dbBooking.customer_phone,
  serviceId: dbBooking.service_id,
  serviceName: dbBooking.service_name,
  priceAtBooking: dbBooking.price_at_booking,
  date: dbBooking.date,
  time: dbBooking.time,
  status: dbBooking.status,
  notes: dbBooking.notes,
  createdAt: new Date(dbBooking.created_at),
  confirmation_token: dbBooking.confirmation_token,
  cancellation_token: dbBooking.cancellation_token,
  reminder_sent_at: dbBooking.reminder_sent_at,
  staffMemberId: dbBooking.staff_member_id,
});

export const mapServiceFromDb = (dbService: any): Service => ({
  id: dbService.id,
  businessId: dbService.business_id,
  name: dbService.name,
  duration: dbService.duration,
  price: dbService.price,
  description: dbService.description,
  imageUrl: dbService.image_url,
  staffMemberIds: dbService.staff_members?.map((s: any) => s.staff_id) || [],
});

export const mapStaffMemberFromDb = (dbStaff: any): StaffMember => ({
    id: dbStaff.id,
    businessId: dbStaff.business_id,
    name: dbStaff.name,
    email: dbStaff.email,
    imageUrl: dbStaff.image_url,
    workingHours: dbStaff.working_hours,
    closedDays: dbStaff.closed_days,
    serviceIds: dbStaff.staff_services?.map((s: any) => s.service_id) || [],
});

export const mapBusinessFromDb = (dbBusiness: any): Business | null => {
    if (!dbBusiness) return null;
    return {
        id: dbBusiness.id,
        userId: dbBusiness.user_id,
        name: dbBusiness.name,
        slug: dbBusiness.slug,
        description: dbBusiness.description,
        imageUrl: dbBusiness.image_url,
        galleryImages: dbBusiness.gallery_images,
        currency: dbBusiness.currency || 'USD',
        calendarSettings: dbBusiness.calendar_settings,
        htmlContent: dbBusiness.html_content,
        cssContent: dbBusiness.css_content,
        // FIX: Map the theme_settings field from the database to the themeSettings property.
        themeSettings: dbBusiness.theme_settings,
        emailTemplates: dbBusiness.email_templates,
        google_access_token: dbBusiness.google_access_token,
        google_refresh_token: dbBusiness.google_refresh_token,
        google_integration_active: dbBusiness.google_integration_active,
        whatsapp_access_token: dbBusiness.whatsapp_access_token,
        whatsapp_phone_number_id: dbBusiness.whatsapp_phone_number_id,
        whatsapp_integration_active: dbBusiness.whatsapp_integration_active,
        socials: dbBusiness.socials,
    };
};

export const mapTemplateFromDb = (dbTemplate: any): Template => ({
  id: dbTemplate.id,
  name: dbTemplate.name,
  description: dbTemplate.description,
  imageUrl: dbTemplate.image_url,
  htmlContent: dbTemplate.html_content,
  cssContent: dbTemplate.css_content,
  createdAt: dbTemplate.created_at,
});


// --- AUTH & USER ---
export const loginUser = async (email: string, pass: string): Promise<User | null> => {
    const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    if (!user) return null;
    return await getUserProfile(user.id);
};

export const registerUser = async (name: string, email: string, pass: string): Promise<void> => {
    const { error } = await supabase.auth.signUp({ 
      email, 
      password: pass,
      options: {
        data: {
          name,
        },
        emailRedirectTo: `${window.location.origin}/#/email-confirmed`
      }
    });
    if (error) throw error;
};

export const logoutUser = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
};

export const getUserProfile = async (id: string): Promise<User | null> => {
    const { data, error } = await supabase.rpc('get_user_profile_by_id', { p_user_id: id });
    if (error) {
        console.error("Error fetching user profile via RPC:", error.message);
        return null;
    }
    // The RPC returns a single JSON object which might be null if not found/authorized.
    // The JSON object is already in camelCase because of json_build_object.
    return data as User | null;
};

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<User> => {
    const updates: { [key: string]: any } = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.imageUrl !== undefined) updates.image_url = data.imageUrl;
    if (data.subscriptionStatus !== undefined) updates.subscription_status = data.subscriptionStatus;
    if (data.trialEndsAt !== undefined) updates.trial_ends_at = data.trialEndsAt;
    if (data.paypalSubscriptionId !== undefined) updates.paypal_subscription_id = data.paypalSubscriptionId;

    if (Object.keys(updates).length === 0) {
        const currentUserProfile = await getUserProfile(userId);
        if(!currentUserProfile) throw new Error("User not found");
        return currentUserProfile;
    }
    
    const { error } = await supabase.from('users').update(updates).eq('id', userId);
    if (error) throw error;

    // After updating, refetch the full profile using the RPC to ensure camelCase and data consistency.
    const updatedProfile = await getUserProfile(userId);
    if (!updatedProfile) throw new Error("Failed to refetch user profile after update.");

    return updatedProfile;
};

export const updateUserPassword = async (newPass: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) throw error;
};

export const sendPasswordResetEmail = async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/update-password`,
    });
    if (error) throw error;
};


// --- BUSINESS ---

export const getBusinessForUser = async (userId: string): Promise<Business | null> => {
    // This function calls the 'get-business-for-authed-user' Edge Function.
    // The Supabase client automatically includes the user's auth token.
    const { data, error } = await supabase.functions.invoke('get-business-for-authed-user');

    if (error) {
        console.error('Error invoking get-business-for-authed-user function:', error.message);
        throw error;
    }

    // The function returns the business object directly on success, or null if not found.
    return data as Business | null;
};

export const getBusinessBySlug = async (slug: string): Promise<Business | null> => {
    const { data, error } = await supabase.from('businesses').select('*').eq('slug', slug).single();
    if (error) {
        console.error(`Error fetching business by slug ${slug}:`, error.message);
        if (error.code === 'PGRST116') return null; // Not found is not an error here
        throw error;
    }
    return mapBusinessFromDb(data);
};

export const createOrUpdateBusiness = async (businessData: Partial<Business>): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('update-business', {
      body: { businessData },
    });
  
    if (error) {
      console.error("Error invoking update-business function:", error.message);
      throw error;
    }
  
    if (data.error) {
      console.error("Server-side error in update-business:", data.error);
      // Propagate specific, user-friendly errors
      if (data.error.includes('duplicate key') || data.error.includes('already in use')) {
        throw new Error('This page link is already in use. Please choose another.');
      }
      throw new Error(data.error);
    }
  
    return data.businessId;
};


// --- SERVICES ---

export const getServicesForBusiness = async (businessId: string): Promise<Service[]> => {
    const { data, error } = await supabase
        .from('services')
        .select('*, staff_members:staff_services(staff_id)')
        .eq('business_id', businessId)
        .order('name');

    if (error) throw error;
    return (data || []).map(mapServiceFromDb);
};

export const addService = async (serviceData: Partial<Service>): Promise<string> => {
    const { data, error } = await supabase.from('services').insert({
        business_id: serviceData.businessId,
        name: serviceData.name,
        duration: serviceData.duration,
        price: serviceData.price,
        description: serviceData.description,
        image_url: serviceData.imageUrl,
    }).select('id').single();
    if (error) throw error;
    return data.id;
};

export const updateService = async (serviceId: string, updates: Partial<Service>): Promise<Service> => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;

    const { data, error } = await supabase
        .from('services')
        .update(dbUpdates)
        .eq('id', serviceId)
        .select('*, staff_members:staff_services(staff_id)')
        .single();
    
    if (error) throw error;
    return mapServiceFromDb(data);
};


export const deleteService = async (serviceId: string): Promise<void> => {
    const { error } = await supabase.from('services').delete().eq('id', serviceId);
    if (error) throw error;
};

// --- STAFF ---

export const getStaffForBusiness = async (businessId: string): Promise<StaffMember[]> => {
    const { data, error } = await supabase
        .from('staff_members')
        .select('*, staff_services(service_id)')
        .eq('business_id', businessId)
        .order('name');
        
    if (error) throw error;
    return (data || []).map(mapStaffMemberFromDb);
};

export const addStaffMember = async (staffData: Omit<StaffMember, 'id'>): Promise<StaffMember> => {
    const { serviceIds, ...rest } = staffData;
    const { data, error } = await supabase.from('staff_members').insert({
        business_id: rest.businessId,
        name: rest.name,
        email: rest.email,
        image_url: rest.imageUrl,
        working_hours: rest.workingHours,
        closed_days: rest.closedDays,
    }).select().single();

    if (error) throw error;

    const newStaffMember = mapStaffMemberFromDb(data);

    if (serviceIds && serviceIds.length > 0) {
        const relations = serviceIds.map(service_id => ({
            staff_id: newStaffMember.id,
            service_id: service_id
        }));
        const { error: relationError } = await supabase.from('staff_services').insert(relations);
        if (relationError) {
            // Attempt to clean up if relation fails
            await supabase.from('staff_members').delete().eq('id', newStaffMember.id);
            throw relationError;
        }
        newStaffMember.serviceIds = serviceIds;
    }
    
    return newStaffMember;
};

export const updateStaffMember = async (staffId: string, updates: Partial<StaffMember>): Promise<StaffMember> => {
    const { serviceIds, ...restOfUpdates } = updates;

    // Manually construct the update payload to ensure only snake_case keys are used.
    // This fixes the "column not found" error caused by the Supabase client
    // receiving unexpected camelCase keys from a generic spread.
    const dbUpdates: { [key: string]: any } = {};
    if (restOfUpdates.name !== undefined) dbUpdates.name = restOfUpdates.name;
    if (restOfUpdates.email !== undefined) dbUpdates.email = restOfUpdates.email;
    if (restOfUpdates.imageUrl !== undefined) dbUpdates.image_url = restOfUpdates.imageUrl;
    if (restOfUpdates.workingHours !== undefined) dbUpdates.working_hours = restOfUpdates.workingHours;
    if (restOfUpdates.closedDays !== undefined) dbUpdates.closed_days = restOfUpdates.closedDays;

    // Only update the main table if there are changes.
    if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase.from('staff_members').update(dbUpdates).eq('id', staffId);
        if (error) throw error;
    }

    // Only sync services if the `serviceIds` property was part of the update payload.
    // This prevents accidental wiping of service assignments.
    if (serviceIds !== undefined) {
        // First, remove all existing service associations for this staff member.
        const { error: deleteError } = await supabase.from('staff_services').delete().eq('staff_id', staffId);
        if (deleteError) throw deleteError;

        // Then, if new service IDs are provided, insert them.
        if (serviceIds.length > 0) {
            const relations = serviceIds.map(service_id => ({
                staff_id: staffId,
                service_id
            }));
            const { error: insertError } = await supabase.from('staff_services').insert(relations);
            if (insertError) throw insertError;
        }
    }
    
    // After all updates, refetch the complete and current state of the staff member to return.
    // This ensures the returned data is consistent with the database.
    const { data: refetchedData, error: refetchError } = await supabase
        .from('staff_members')
        .select('*, staff_services(service_id)')
        .eq('id', staffId)
        .single();
    
    if (refetchError) throw refetchError;
    if (!refetchedData) throw new Error("Could not find staff member after update.");

    return mapStaffMemberFromDb(refetchedData);
};

export const deleteStaffMember = async (staffId: string): Promise<void> => {
    const { error } = await supabase.from('staff_members').delete().eq('id', staffId);
    if (error) throw error;
};


// --- BOOKINGS ---

export const getBookingsForBusiness = async (businessId: string): Promise<Booking[]> => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapBookingFromDb);
};

export const getBookingsForDay = async (businessId: string, date: string): Promise<Booking[]> => {
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('business_id', businessId)
        .eq('date', date)
        .neq('status', BookingStatus.Canceled);
    if (error) throw error;
    return (data || []).map(mapBookingFromDb);
};

export const createBooking = async (bookingData: Omit<Booking, 'id' | 'createdAt'>): Promise<string> => {
    const { data, error } = await supabase.from('bookings').insert({
        business_id: bookingData.businessId,
        customer_name: bookingData.customerName,
        customer_email: bookingData.customerEmail,
        customer_phone: bookingData.customerPhone,
        service_id: bookingData.serviceId,
        service_name: bookingData.serviceName,
        price_at_booking: bookingData.priceAtBooking,
        date: bookingData.date,
        time: bookingData.time,
        status: bookingData.status,
        notes: bookingData.notes,
        staff_member_id: bookingData.staffMemberId,
    }).select('id').single();

    if (error) throw error;
    return data.id;
};

export const updateBookingStatus = async (bookingId: string, status: BookingStatus): Promise<void> => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId);
    if (error) throw error;
};

// --- PAYMENT HISTORY ---
export const getPaymentHistoryForUser = async (userId: string): Promise<PaymentHistory[]> => {
    const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(p => ({
        id: p.id,
        userId: p.user_id,
        createdAt: p.created_at,
        amount: p.amount,
        currency: p.currency,
        paymentProvider: p.payment_provider,
        providerTransactionId: p.provider_transaction_id,
        description: p.description
    }));
};

export const createPaymentRecord = async (record: Omit<PaymentHistory, 'id' | 'createdAt' | 'currency'>): Promise<void> => {
    // FIX: Manually map camelCase properties to snake_case columns to ensure the insert succeeds,
    // as the Supabase client's automatic mapping can be unreliable.
    const { userId, paymentProvider, providerTransactionId, ...rest } = record;
    const dbRecord = {
        ...rest,
        user_id: userId,
        payment_provider: paymentProvider,
        provider_transaction_id: providerTransactionId
    };

    const { error } = await supabase.from('payment_history').insert(dbRecord).select();
    
    if (error) {
        console.error("Supabase insert error in createPaymentRecord:", JSON.stringify(error, null, 2));
        throw error;
    }
};


// --- URL SHORTENER ---

export const createShortLink = async (longUrl: string): Promise<ShortLink> => {
    const { data, error } = await supabase.functions.invoke('create-short-link', {
        body: { long_url: longUrl },
    });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    return data.link;
};

export const getLongUrlForRedirect = async (shortCode: string): Promise<string | null> => {
    const { data, error } = await supabase
        .from('short_links')
        .select('long_url')
        .eq('short_code', shortCode)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data?.long_url;
};

// --- ADMIN ---

export const getAllUsersWithBusiness = async (): Promise<User[]> => {
    const { data, error } = await supabase.rpc('get_all_users_with_business');
    if (error) throw error;
    return (data as any[]).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.created_at,
        businessName: u.business_name,
        subscriptionStatus: u.subscription_status,
        trialEndsAt: u.trial_ends_at,
        paypalSubscriptionId: u.paypal_subscription_id,
    }));
};

export const getAllStats = async (): Promise<{ totalUsers: number; totalBusinesses: number; totalBookings: number; }> => {
    const { data, error } = await supabase.rpc('get_admin_stats');
    if (error) throw error;
    return data;
};

export const adminDeleteUser = async (userId: string): Promise<void> => {
    const { error } = await supabase.functions.invoke('admin-delete-user', { body: { userId } });
    if (error) throw error;
};

export const adminCreateUser = async (userData: any): Promise<void> => {
    const { data, error } = await supabase.functions.invoke('admin-create-user', { body: userData });
    if (error) throw new Error(error.message);
    if (data.error) throw new Error(data.error);
};

export const adminUpdateUser = async (userId: string, updates: Partial<User>): Promise<void> => {
    const { data, error } = await supabase.functions.invoke('admin-update-user', { body: { userId, updates } });
    if (error) throw new Error(error.message);
    if (data.error) throw new Error(data.error);
};

// --- SUPPORT TICKETS ---

const mapTicketMessageFromDb = (dbMsg: any): TicketMessage => ({
    id: dbMsg.id,
    ticketId: dbMsg.ticket_id,
    userId: dbMsg.user_id,
    userName: dbMsg.user_name,
    content: dbMsg.content,
    createdAt: dbMsg.created_at
});

const mapSupportTicketFromDb = (dbTicket: any): SupportTicket => ({
    id: dbTicket.id,
    userId: dbTicket.user_id,
    userEmail: dbTicket.user_email,
    userName: dbTicket.user_name,
    subject: dbTicket.subject,
    status: dbTicket.status,
    createdAt: dbTicket.created_at,
    updatedAt: dbTicket.updated_at,
    messages: dbTicket.messages ? dbTicket.messages.map(mapTicketMessageFromDb) : [],
    businessName: dbTicket.business_name, // Will be undefined for user-side queries, which is OK
});


const mapAdminTicketListItem = (dbTicket: any): SupportTicket => ({
    id: dbTicket.id,
    userId: dbTicket.user_id,
    userEmail: dbTicket.user_email,
    userName: dbTicket.user_name,
    subject: dbTicket.subject,
    status: dbTicket.status,
    createdAt: dbTicket.created_at,
    updatedAt: dbTicket.updated_at,
    messages: [], // List view doesn't have messages.
    businessName: dbTicket.business_name,
});


export const getTicketsForUser = async (userId: string): Promise<SupportTicket[]> => {
    const { data, error } = await supabase.from('support_tickets').select('*, messages:support_ticket_messages(*)').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapSupportTicketFromDb);
};

export const getTicketByIdForUser = async (ticketId: string, userId: string): Promise<SupportTicket | null> => {
    const { data, error } = await supabase.from('support_tickets').select('*, messages:support_ticket_messages(*)').eq('id', ticketId).eq('user_id', userId).single();
    if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
    }
    return data ? mapSupportTicketFromDb(data) : null;
};

export const createTicket = async (subject: string, message: string): Promise<SupportTicket> => {
    const { data, error } = await supabase.functions.invoke('create-ticket', {
        body: { subject, message }
    });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    return data.ticket;
};

export const addMessageToTicket = async (ticketId: string, content: string): Promise<TicketMessage> => {
     const { data, error } = await supabase.functions.invoke('add-ticket-message', {
        body: { ticket_id: ticketId, content }
    });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    return data.message;
};

export const getAllTicketsForAdmin = async (): Promise<SupportTicket[]> => {
    const { data, error } = await supabase.rpc('get_admin_tickets_with_business');
    if (error) throw error;
    return data?.map(mapAdminTicketListItem) || [];
};

export const getTicketByIdForAdmin = async (ticketId: string): Promise<SupportTicket | null> => {
     const { data, error } = await supabase.rpc('get_admin_ticket_detail_by_id', { p_ticket_id: ticketId });
    if (error) {
        console.error("Error fetching admin ticket detail:", error.message);
        return null;
    }
    // RPC returns a single json object. If no ticket found, it returns null.
    return data as SupportTicket | null;
};

export const updateTicketStatus = async (ticketId: string, status: TicketStatus): Promise<void> => {
    const { error } = await supabase.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', ticketId);
    if (error) throw error;
};

// --- SYSTEM SETTINGS ---

export const getSystemSetting = async <T>(key: string): Promise<SystemSetting<T> | null> => {
    const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .eq('key', key)
        .single();
    
    if (error) {
        if (error.code === 'PGRST116') return null; // Not found is not an error
        console.error(`Error fetching system setting '${key}':`, error.message);
        throw error;
    }
    return data as SystemSetting<T> | null;
};

export const updateSystemSetting = async <T>(key: string, value: T): Promise<SystemSetting<T>> => {
    const { data, error } = await supabase
        .from('system_settings')
        .upsert({ key, value })
        .select()
        .single();
        
    if (error) {
        console.error(`Error updating system setting '${key}':`, error.message);
        throw error;
    }
    return data;
};

// --- TEMPLATES ---
export const getTemplates = async (): Promise<Template[]> => {
    const { data, error } = await supabase.from('templates').select('*').order('created_at');
    if (error) throw error;
    return (data || []).map(mapTemplateFromDb);
};

export const createTemplate = async (templateData: Omit<Template, 'id' | 'createdAt'>): Promise<Template> => {
    const { data, error } = await supabase.from('templates').insert({
        name: templateData.name,
        description: templateData.description,
        image_url: templateData.imageUrl,
        html_content: templateData.htmlContent,
        css_content: templateData.cssContent,
    }).select().single();
    if (error) throw error;
    return mapTemplateFromDb(data);
};

export const updateTemplate = async (templateId: string, updates: Partial<Omit<Template, 'id' | 'createdAt'>>): Promise<Template> => {
    const dbUpdates: { [key: string]: any } = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
    if (updates.htmlContent !== undefined) dbUpdates.html_content = updates.htmlContent;
    if (updates.cssContent !== undefined) dbUpdates.css_content = updates.cssContent;

    const { data, error } = await supabase
        .from('templates')
        .update(dbUpdates)
        .eq('id', templateId)
        .select()
        .single();
    if (error) throw error;
    return mapTemplateFromDb(data);
};

export const deleteTemplate = async (templateId: string): Promise<void> => {
    const { error } = await supabase.from('templates').delete().eq('id', templateId);
    if (error) throw error;
};