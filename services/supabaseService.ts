import { supabase } from '../supabaseClient';
// FIX: Import the new Page, ServiceCategory and Plan types.
import { User, Business, Service, Booking, BookingStatus, ShortLink, SupportTicket, TicketMessage, TicketStatus, PayPalConfig, SystemSetting, PaymentHistory, StaffMember, Template, Page, ServiceCategory, RegistrationCounterSetting, Location, PublicSystemSettings, Plan } from '../types';

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
    locationId: dbBooking.location_id,
    language: dbBooking.language,
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
    // FIX: Map category_id from the database to the categoryId property.
    categoryId: dbService.category_id,
    locationIds: dbService.service_locations?.map((l: any) => l.location_id) || dbService.location_ids,
});

export const mapStaffMemberFromDb = (dbStaff: any): StaffMember => ({
    id: dbStaff.id,
    businessId: dbStaff.business_id,
    name: dbStaff.name,
    email: dbStaff.email,
    imageUrl: dbStaff.image_url,
    workingHours: dbStaff.working_hours,
    closedDays: dbStaff.closed_days,
    serviceIds: dbStaff.staff_services?.map((s: any) => s.service_id) || dbStaff.service_ids,
    locationIds: dbStaff.staff_locations?.map((l: any) => l.location_id) || dbStaff.location_ids,
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
        enabledEmailLanguages: dbBusiness.enabled_email_languages,
        defaultLanguage: dbBusiness.default_language,
        allowLanguageSelection: dbBusiness.allow_language_selection,
        google_access_token: dbBusiness.google_access_token,
        google_refresh_token: dbBusiness.google_refresh_token,
        google_integration_active: dbBusiness.google_integration_active,
        whatsappNotificationsEnabled: dbBusiness.whatsapp_notifications_enabled,
        customDomain: dbBusiness.custom_domain,
        customDomainStatus: dbBusiness.custom_domain_status,
        socials: dbBusiness.socials,
        email_messages_sent: dbBusiness.email_messages_sent,
        whatsapp_messages_sent: dbBusiness.whatsapp_messages_sent,
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
    // Step 1: Fetch the user profile from the 'users' table.
    const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

    if (userError) {
        console.error("Error fetching user profile:", userError.message);
        // Throw the error to be caught by the calling function (e.g., in AuthContext)
        throw userError;
    }

    // If no user data is found, return null.
    if (!userData) return null;

    // Step 2: Fetch the associated business name from the 'businesses' table.
    const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select('name')
        .eq('user_id', id)
        .single();

    // An error fetching the business is not critical if the user exists but hasn't created a business yet.
    // 'PGRST116' is the code for "NOT_FOUND", which is expected for new users.
    if (businessError && businessError.code !== 'PGRST116') {
        console.warn("Could not fetch business name for user profile:", businessError.message);
        // We can still proceed and return the user profile without the business name.
    }

    // Step 3: Combine the data into the User object.
    return {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        imageUrl: userData.image_url,
        role: userData.role,
        status: userData.status,
        createdAt: userData.created_at,
        subscriptionStatus: userData.subscription_status,
        trialStartsAt: userData.trial_starts_at,
        trialEndsAt: userData.trial_ends_at,
        paypalSubscriptionId: userData.paypal_subscription_id,
        subscriptionPlan: userData.subscription_plan,
        businessName: businessData?.name || undefined, // Use undefined or empty string as fallback
    };
};

export const updateUserProfile = async (userId: string, data: Partial<User>): Promise<User> => {
    const updates: { [key: string]: any } = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.imageUrl !== undefined) updates.image_url = data.imageUrl;
    if (data.subscriptionStatus !== undefined) updates.subscription_status = data.subscriptionStatus;
    if (data.trialEndsAt !== undefined) updates.trial_ends_at = data.trialEndsAt;
    if (data.paypalSubscriptionId !== undefined) updates.paypal_subscription_id = data.paypalSubscriptionId;
    if (data.subscriptionPlan !== undefined) updates.subscription_plan = data.subscriptionPlan;

    if (Object.keys(updates).length === 0) {
        const currentUserProfile = await getUserProfile(userId);
        if (!currentUserProfile) throw new Error("User not found");
        return currentUserProfile;
    }

    const { error } = await supabase.from('users').update(updates).eq('id', userId);
    if (error) throw error;

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
    const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        console.error('Error fetching business for user:', error.message);
        throw error;
    }

    return mapBusinessFromDb(data);
};

// FIX: Added missing getBusinessBySlug function to resolve import error.
export const getBusinessBySlug = async (slug: string): Promise<Business | null> => {
    const { data, error } = await supabase.from('businesses').select('*').eq('slug', slug).single();
    if (error) {
        console.error(`Error fetching business by slug ${slug}:`, error.message);
        if (error.code === 'PGRST116') return null; // Not found is not an error here
        throw error;
    }
    return mapBusinessFromDb(data);
};

export const getPublicBusinessDataBySlug = async (slug: string): Promise<{ business: Business, locations: Location[] } | null> => {
    const { data, error } = await supabase
        .from('businesses')
        .select('*, locations(*)')
        .eq('slug', slug)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error(`Error fetching public business data by slug ${slug}:`, error.message);
        throw error;
    }

    if (!data) return null;

    const { locations, ...businessData } = data;

    return {
        business: mapBusinessFromDb(businessData)!,
        locations: locations || [],
    };
};

export const createOrUpdateBusiness = async (businessData: Partial<Business> & { userId: string }): Promise<string> => {
    const { id, userId, ...updateData } = businessData;

    const toSnakeCase = (obj: any) => {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                newObj[snakeKey] = obj[key];
            }
        }
        return newObj;
    };
    const updatePayload = toSnakeCase(updateData);

    let businessId = id;

    if (id) {
        const { error } = await supabase
            .from('businesses')
            .update(updatePayload)
            .eq('id', id);

        if (error) {
            if (error.code === '23505' && error.details?.includes('slug')) {
                throw new Error('This page link is already in use. Please choose another.');
            }
            throw error;
        }
    } else {
        const { data: newBusiness, error } = await supabase
            .from('businesses')
            .insert({ ...updatePayload, user_id: userId })
            .select('id')
            .single();
        if (error) throw error;
        businessId = newBusiness.id;
    }

    if (!businessId) throw new Error("Could not create or update business.");

    return businessId;
};

// FIX: Added missing verifyCustomDomain function to resolve import error.
export const verifyCustomDomain = async (domain: string): Promise<{ success: boolean; message: string }> => {
    const { data, error } = await supabase.functions.invoke('verify-custom-domain', {
        body: { domain },
    });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    return data;
};


// --- SERVICES ---

export const getServicesForBusiness = async (businessId: string): Promise<Service[]> => {
    const { data, error } = await supabase
        .from('services')
        .select('*, staff_members:staff_services(staff_id), service_locations(location_id)')
        .eq('business_id', businessId)
        .order('name');

    if (error) throw error;
    return (data || []).map(mapServiceFromDb);
};

export const addService = async (serviceData: Partial<Service>): Promise<Service> => {
    const { locationIds, ...restOfData } = serviceData;
    const { data: newServiceData, error } = await supabase.from('services').insert({
        business_id: restOfData.businessId,
        name: restOfData.name,
        duration: restOfData.duration,
        price: restOfData.price,
        description: restOfData.description,
        image_url: restOfData.imageUrl,
        category_id: restOfData.categoryId
    }).select().single();

    if (error) throw error;

    if (locationIds && locationIds.length > 0) {
        const relations = locationIds.map(location_id => ({ service_id: newServiceData.id, location_id }));
        const { error: relationError } = await supabase.from('service_locations').insert(relations);
        if (relationError) {
            console.error('Failed to link service to locations, but service was created:', relationError.message);
        }
    }

    return mapServiceFromDb({ ...newServiceData, location_ids: locationIds });
};

export const updateService = async (serviceId: string, updates: Partial<Service>): Promise<Service> => {
    const { locationIds, ...restOfUpdates } = updates;
    const dbUpdates: any = {};
    if (restOfUpdates.name !== undefined) dbUpdates.name = restOfUpdates.name;
    if (restOfUpdates.duration !== undefined) dbUpdates.duration = restOfUpdates.duration;
    if (restOfUpdates.price !== undefined) dbUpdates.price = restOfUpdates.price;
    if (restOfUpdates.description !== undefined) dbUpdates.description = restOfUpdates.description;
    if (restOfUpdates.imageUrl !== undefined) dbUpdates.image_url = restOfUpdates.imageUrl;
    if (restOfUpdates.categoryId !== undefined) dbUpdates.category_id = restOfUpdates.categoryId;

    if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase.from('services').update(dbUpdates).eq('id', serviceId);
        if (error) throw error;
    }

    if (locationIds !== undefined) {
        const { error: deleteError } = await supabase.from('service_locations').delete().eq('service_id', serviceId);
        if (deleteError) throw deleteError;

        if (locationIds.length > 0) {
            const relations = locationIds.map(location_id => ({ service_id: serviceId, location_id }));
            const { error: insertError } = await supabase.from('service_locations').insert(relations);
            if (insertError) throw insertError;
        }
    }

    const { data: refetchedData, error: refetchError } = await supabase
        .from('services')
        .select('*, service_locations(location_id)')
        .eq('id', serviceId)
        .single();
    if (refetchError) throw refetchError;
    return mapServiceFromDb(refetchedData);
};


export const deleteService = async (serviceId: string): Promise<void> => {
    const { error } = await supabase.from('services').delete().eq('id', serviceId);
    if (error) throw error;
};

// --- STAFF ---

export const getStaffForBusiness = async (businessId: string): Promise<StaffMember[]> => {
    const { data, error } = await supabase
        .from('staff_members')
        .select('*, staff_services(service_id), staff_locations(location_id)')
        .eq('business_id', businessId)
        .order('name');

    if (error) throw error;
    return (data || []).map(mapStaffMemberFromDb);
};

export const addStaffMember = async (staffData: Omit<StaffMember, 'id'>): Promise<StaffMember> => {
    const { serviceIds, locationIds, ...rest } = staffData;
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

    try {
        if (serviceIds && serviceIds.length > 0) {
            const serviceRelations = serviceIds.map(service_id => ({ staff_id: newStaffMember.id, service_id }));
            const { error: serviceError } = await supabase.from('staff_services').insert(serviceRelations);
            if (serviceError) throw serviceError;
        }
        if (locationIds && locationIds.length > 0) {
            const locationRelations = locationIds.map(location_id => ({ staff_id: newStaffMember.id, location_id }));
            const { error: locationError } = await supabase.from('staff_locations').insert(locationRelations);
            if (locationError) throw locationError;
        }
    } catch (relationError) {
        console.error("Failed to create staff relations, rolling back...", relationError);
        // Attempt to delete the just-created staff member to avoid orphaned data
        await supabase.from('staff_members').delete().eq('id', newStaffMember.id);
        // Re-throw the original error to be handled by the caller
        throw relationError;
    }

    newStaffMember.serviceIds = serviceIds || [];
    newStaffMember.locationIds = locationIds || [];
    return newStaffMember;
};


export const updateStaffMember = async (staffId: string, updates: Partial<StaffMember>): Promise<StaffMember> => {
    const { serviceIds, locationIds, ...restOfUpdates } = updates;

    const dbUpdates: { [key: string]: any } = {};
    if (restOfUpdates.name !== undefined) dbUpdates.name = restOfUpdates.name;
    if (restOfUpdates.email !== undefined) dbUpdates.email = restOfUpdates.email;
    if (restOfUpdates.imageUrl !== undefined) dbUpdates.image_url = restOfUpdates.imageUrl;
    if (restOfUpdates.workingHours !== undefined) dbUpdates.working_hours = restOfUpdates.workingHours;
    if (restOfUpdates.closedDays !== undefined) dbUpdates.closed_days = restOfUpdates.closedDays;

    if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase.from('staff_members').update(dbUpdates).eq('id', staffId);
        if (error) throw error;
    }

    if (serviceIds !== undefined) {
        const { error: deleteError } = await supabase.from('staff_services').delete().eq('staff_id', staffId);
        if (deleteError) throw deleteError;

        if (serviceIds.length > 0) {
            const relations = serviceIds.map(service_id => ({ staff_id: staffId, service_id }));
            const { error: insertError } = await supabase.from('staff_services').insert(relations);
            if (insertError) throw insertError;
        }
    }

    if (locationIds !== undefined) {
        const { error: deleteError } = await supabase.from('staff_locations').delete().eq('staff_id', staffId);
        if (deleteError) throw deleteError;

        if (locationIds.length > 0) {
            const relations = locationIds.map(location_id => ({ staff_id: staffId, location_id }));
            const { error: insertError } = await supabase.from('staff_locations').insert(relations);
            if (insertError) throw insertError;
        }
    }

    const { data: refetchedData, error: refetchError } = await supabase
        .from('staff_members')
        .select('*, staff_services(service_id), staff_locations(location_id)')
        .eq('id', staffId)
        .single();
    if (refetchError) throw refetchError;
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

export const getBookingsForDay = async (businessId: string, locationId: string, date: string): Promise<Booking[]> => {
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('business_id', businessId)
        .eq('location_id', locationId)
        .eq('date', date)
        .neq('status', BookingStatus.Canceled);
    if (error) throw error;
    return (data || []).map(mapBookingFromDb);
};

export const createBooking = async (bookingData: Omit<Booking, 'id' | 'createdAt'>): Promise<string> => {
    const { data, error } = await supabase.from('bookings').insert({
        business_id: bookingData.businessId,
        location_id: bookingData.locationId,
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
        language: bookingData.language,
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
    const { userId, paymentProvider, providerTransactionId, ...rest } = record;
    const dbRecord = {
        ...rest,
        user_id: userId,
        payment_provider: paymentProvider,
        provider_transaction_id: providerTransactionId
    };

    const { error } = await supabase.from('payment_history').insert(dbRecord);

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
    // RPC returns snake_case, so we must map to camelCase for the frontend.
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
        subscriptionPlan: u.subscription_plan,
        whatsappNumber: u.whatsapp_number,
        totalBookings: u.total_bookings,
        emailMessagesSent: u.email_messages_sent,
        whatsappMessagesSent: u.whatsapp_messages_sent,
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

// FIX: Added implementation for getPublicSystemSettings to resolve export error.
export const getPublicSystemSettings = async (): Promise<PublicSystemSettings | null> => {
    try {
        const { data, error } = await supabase.rpc('get_public_system_settings');
        if (error) throw error;
        return data as PublicSystemSettings | null;
    } catch (e: unknown) {
        // FIX: Safely handle unknown error to provide a more descriptive console log instead of "[object Object]".
        console.error("Failed to fetch public settings via RPC", (e as Error).message || e);
        return null;
    }
};

// FIX: Added implementation for getPublicLocationData to resolve export error.
export const getPublicLocationData = async (businessSlug: string, locationSlug: string): Promise<{ business: Business; location: Location; services: Service[]; staff: StaffMember[]; categories: ServiceCategory[] } | null> => {
    const { data, error } = await supabase.rpc('get_public_location_data', {
        p_business_slug: businessSlug,
        p_location_slug: locationSlug,
    });

    if (error) {
        console.error("Error fetching public location data:", error);
        return null;
    }

    if (!data) return null;

    return {
        business: mapBusinessFromDb(data.business)!,
        location: data.location,
        services: (data.services || []).map(mapServiceFromDb),
        staff: (data.staff || []).map(mapStaffMemberFromDb),
        categories: data.categories || [],
    };
};

// FIX: Added implementation for getCategoriesForBusiness to resolve export error.
export const getCategoriesForBusiness = async (businessId: string): Promise<ServiceCategory[]> => {
    const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('business_id', businessId)
        .order('name');
    if (error) throw error;
    return data || [];
};

// FIX: Added implementation for getLocationsForBusiness to resolve export error.
export const getLocationsForBusiness = async (businessId: string): Promise<Location[]> => {
    const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('business_id', businessId)
        .order('name');
    if (error) throw error;
    return data || [];
};

// FIX: Added implementation for getPlans to resolve export error.
export const getPlans = async (): Promise<Plan[]> => {
    const { data, error } = await supabase.from('plans').select('*').order('price');
    if (error) throw error;
    return data || [];
};

// FIX: Added implementation for addCategory to resolve export error.
export const addCategory = async (categoryData: Omit<ServiceCategory, 'id'>): Promise<ServiceCategory> => {
    const { data, error } = await supabase.from('service_categories').insert(categoryData).select().single();
    if (error) throw error;
    return data;
};

// FIX: Added implementation for updateCategory to resolve export error.
export const updateCategory = async (categoryId: string, updates: Partial<ServiceCategory>): Promise<ServiceCategory> => {
    const { data, error } = await supabase.from('service_categories').update(updates).eq('id', categoryId).select().single();
    if (error) throw error;
    return data;
};

// FIX: Added implementation for deleteCategory to resolve export error.
export const deleteCategory = async (categoryId: string): Promise<void> => {
    const { error } = await supabase.from('service_categories').delete().eq('id', categoryId);
    if (error) throw error;
};

// FIX: Added implementation for Page management functions to resolve export errors.
export const getPages = async (): Promise<Page[]> => {
    const { data, error } = await supabase.from('pages').select('*').order('created_at');
    if (error) throw error;
    return data || [];
};
export const addPage = async (pageData: Partial<Page>): Promise<void> => {
    const { error } = await supabase.from('pages').insert(pageData);
    if (error) throw error;
};
export const updatePage = async (pageId: string, updates: Partial<Page>): Promise<void> => {
    const { error } = await supabase.from('pages').update(updates).eq('id', pageId);
    if (error) throw error;
};
export const deletePage = async (pageId: string): Promise<void> => {
    const { error } = await supabase.from('pages').delete().eq('id', pageId);
    if (error) throw error;
};

// FIX: Added implementation for Plan management functions to resolve export errors.
export const addPlan = async (planData: Partial<Plan>): Promise<void> => {
    const { error } = await supabase.from('plans').insert(planData);
    if (error) throw error;
};
export const updatePlan = async (planId: string, updates: Partial<Plan>): Promise<void> => {
    const { error } = await supabase.from('plans').update(updates).eq('id', planId);
    if (error) throw error;
};
export const deletePlan = async (planId: string): Promise<void> => {
    const { error } = await supabase.from('plans').delete().eq('id', planId);
    if (error) throw error;
};

// FIX: Added implementation for Location management functions to resolve export errors.
export const addLocation = async (locationData: Omit<Location, 'id'>): Promise<Location> => {
    const { data, error } = await supabase.from('locations').insert({
        business_id: locationData.businessId,
        name: locationData.name,
        slug: locationData.slug,
        address: locationData.address,
        working_hours: locationData.workingHours,
        closed_days: locationData.closedDays
    }).select().single();
    if (error) throw error;
    return data;
};
export const updateLocation = async (locationId: string, updates: Partial<Location>): Promise<Location> => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.workingHours !== undefined) dbUpdates.working_hours = updates.workingHours;
    if (updates.closedDays !== undefined) dbUpdates.closed_days = updates.closedDays;

    const { data, error } = await supabase.from('locations').update(dbUpdates).eq('id', locationId).select().single();
    if (error) throw error;
    return data;
};
export const deleteLocation = async (locationId: string): Promise<void> => {
    const { error } = await supabase.from('locations').delete().eq('id', locationId);
    if (error) throw error;
};