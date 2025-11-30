import { Business, Service, Booking, BookingStatus, User, StaffMember } from '../types';

// In-memory database
let users: User[] = [
    // FIX: Add missing required properties to the User object.
    { 
        id: 'mock-user-1', 
        name: 'John Doe', 
        email: 'owner@business.com', 
        role: 'business_owner', 
        imageUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=1480&auto=format&fit=crop',
        subscriptionStatus: 'trialing',
        trialStartsAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
        trialEndsAt: new Date(new Date().setDate(new Date().getDate() + 13)).toISOString(),
    }
];

let passwords: Record<string, string> = {
    'mock-user-1': 'password123',
};


let businesses: Business[] = [
    {
        id: 'mock-business-1',
        userId: 'mock-user-1',
        name: "John's Barbershop",
        description: "Classic cuts and modern styles. Your local grooming expert.",
        imageUrl: 'https://images.unsplash.com/photo-1559599238-308793207b83?q=80&w=1287&auto=format&fit=crop',
        galleryImages: [
            'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?q=80&w=1470&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1632345031435-8727f6897f53?q=80&w=1287&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1596701062351-8c2c14d1fdd0?q=80&w=1287&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1549296236-83c03a0134de?q=80&w=1287&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1599335623235-333d4a6de142?q=80&w=1287&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1621607512214-68297480165e?q=80&w=1287&auto=format&fit=crop'
        ],
        currency: 'USD',
        calendarSettings: {
            bookingInAdvanceDays: 90,
            minBookingNoticeHours: 4,
            bufferTimeMinutes: 15,
            timeSlotInterval: 30,
        },
        themeSettings: {
            templateId: 'classic-template',
            primaryColor: '#644a40',
            backgroundColor: '#f9f9f9',
            cardColor: '#fcfcfc',
            textColor: '#202020',
            fontFamily: 'Lora',
            borderRadius: 8,
            customCss: '',
        },
        socials: {
            website: 'https://localdify.com',
            instagram: 'https://instagram.com/localdify',
            facebook: 'https://facebook.com/localdify',
            whatsapp: '+15551234567'
        },
    }
];
let services: Service[] = [
    { 
        id: 'mock-service-1', 
        businessId: 'mock-business-1', 
        name: 'Haircut', 
        duration: 30, 
        price: 25,
        description: 'A classic haircut tailored to your style, includes a wash and dry.',
        imageUrl: 'https://images.unsplash.com/photo-1599335622283-e354f19b5b63?q=80&w=1287&auto=format&fit=crop',
        staffMemberIds: ['mock-staff-1', 'mock-staff-2']
    },
    { 
        id: 'mock-service-2', 
        businessId: 'mock-business-1', 
        name: 'Beard Trim', 
        duration: 15, 
        price: 15,
        description: 'Shape and clean up your beard with precision trimmers and a straight razor finish.',
        imageUrl: 'https://images.unsplash.com/photo-1621607512214-68297480165e?q=80&w=1287&auto=format&fit=crop',
        staffMemberIds: ['mock-staff-1']
    },
    { 
        id: 'mock-service-3', 
        businessId: 'mock-business-1', 
        name: 'Haircut & Beard Trim', 
        duration: 45, 
        price: 35,
        description: 'The full grooming experience. Get a perfect haircut and a sharp beard trim.',
        imageUrl: 'https://images.unsplash.com/photo-16222888432453-24161882c560?q=80&w=1287&auto=format&fit=crop',
        staffMemberIds: ['mock-staff-1']
    },
];
let staff: StaffMember[] = [
    {
        id: 'mock-staff-1',
        businessId: 'mock-business-1',
        name: 'John Doe',
        email: 'john.doe@example.com',
        imageUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=1480&auto=format&fit=crop',
        workingHours: { start: '09:00', end: '18:00' },
        closedDays: ['sunday', 'monday'],
        serviceIds: ['mock-service-1', 'mock-service-2', 'mock-service-3']
    },
    {
        id: 'mock-staff-2',
        businessId: 'mock-business-1',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1287&auto=format&fit=crop',
        workingHours: { start: '10:00', end: '17:00' },
        closedDays: ['sunday', 'wednesday'],
        serviceIds: ['mock-service-1']
    },
];
let bookings: Booking[] = [
    {
        id: 'mock-booking-1',
        businessId: 'mock-business-1',
        customerName: 'Alice',
        customerEmail: 'alice@example.com',
        customerPhone: '123-456-7890',
        serviceId: 'mock-service-1',
        serviceName: 'Haircut',
        priceAtBooking: 25,
        date: '2024-07-15',
        time: '10:00',
        status: BookingStatus.Approved,
        createdAt: new Date('2024-07-10T09:00:00Z'),
        notes: "Allergic to certain hair products.",
        staffMemberId: 'mock-staff-1'
    },
    {
        id: 'mock-booking-2',
        businessId: 'mock-business-1',
        customerName: 'Bob',
        customerEmail: 'bob@example.com',
        customerPhone: '234-567-8901',
        serviceId: 'mock-service-3',
        serviceName: 'Haircut & Beard Trim',
        priceAtBooking: 35,
        date: '2024-07-16',
        time: '14:00',
        status: BookingStatus.Pending,
        createdAt: new Date('2024-07-11T11:30:00Z'),
        staffMemberId: 'mock-staff-2'
    }
];

// Helper to simulate async operations
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- Business Functions ---
export const getBusinessForUser = async (userId: string): Promise<Business | null> => {
  await delay(200);
  const business = businesses.find(b => b.userId === userId);
  return business ? { ...business } : null;
};

export const getBusinessById = async (businessId: string): Promise<Business | null> => {
  await delay(200);
  const business = businesses.find(b => b.id === businessId);
  return business ? { ...business } : null;
};

export const createOrUpdateBusiness = async (businessData: Omit<Business, 'id'> | Partial<Business> & { userId: string }): Promise<string> => {
    await delay(500);
    const existingIndex = businesses.findIndex(b => b.userId === businessData.userId);
    if (existingIndex > -1) {
        const existingBusiness = businesses[existingIndex];

        const updatedBusinessData = { ...businessData };
        if (updatedBusinessData.themeSettings) {
            updatedBusinessData.themeSettings = {
                ...existingBusiness.themeSettings,
                ...updatedBusinessData.themeSettings
            };
        }
        if (updatedBusinessData.calendarSettings) {
            updatedBusinessData.calendarSettings = {
                ...existingBusiness.calendarSettings,
                ...updatedBusinessData.calendarSettings
            };
        }
        if (updatedBusinessData.socials) {
            updatedBusinessData.socials = {
                ...existingBusiness.socials,
                ...updatedBusinessData.socials
            };
        }

        businesses[existingIndex] = { ...existingBusiness, ...updatedBusinessData } as Business;
        return businesses[existingIndex].id;
    } else {
        const newBusiness: Business = {
            id: `mock-business-${Date.now()}`,
            userId: businessData.userId,
            name: businessData.name || '',
            description: businessData.description || '',
            galleryImages: businessData.galleryImages || [],
            currency: businessData.currency || 'USD',
            // FIX: Added missing required properties `closedDays` and `calendarSettings`.
            calendarSettings: businessData.calendarSettings || {
                bookingInAdvanceDays: 90,
                minBookingNoticeHours: 4,
                bufferTimeMinutes: 15,
                timeSlotInterval: 30,
            },
            themeSettings: businessData.themeSettings || {
                templateId: 'classic-template',
                primaryColor: '#644a40',
                backgroundColor: '#f9f9f9',
                cardColor: '#fcfcfc',
                textColor: '#202020',
                fontFamily: 'Lora',
                borderRadius: 8,
                customCss: '',
            },
            socials: businessData.socials,
        };
        businesses.push(newBusiness);
        return newBusiness.id;
    }
};

// --- Service Functions ---
export const getServicesForBusiness = async (businessId: string): Promise<Service[]> => {
  await delay(200);
  return services.filter(s => s.businessId === businessId).map(s => ({ ...s }));
};

export const addService = async (serviceData: Omit<Service, 'id'>): Promise<string> => {
  await delay(400);
  const newService: Service = {
    id: `mock-service-${Date.now()}`,
    ...serviceData,
  };
  services.push(newService);
  return newService.id;
};

export const updateService = async (serviceId: string, updates: Partial<Service>): Promise<Service> => {
    await delay(400);
    const index = services.findIndex(s => s.id === serviceId);
    if (index === -1) throw new Error("Service not found");
    services[index] = { ...services[index], ...updates };
    return services[index];
};

export const deleteService = async (serviceId: string): Promise<void> => {
  await delay(300);
  const initialLength = services.length;
  services = services.filter(s => s.id !== serviceId);
  if (services.length === initialLength) {
      throw new Error("Service not found");
  }
};

// --- Staff Functions ---
export const getStaffForBusiness = async (businessId: string): Promise<StaffMember[]> => {
  await delay(200);
  return staff.filter(s => s.businessId === businessId).map(s => ({ ...s }));
};

export const addStaffMember = async (staffData: Omit<StaffMember, 'id'>): Promise<StaffMember> => {
    await delay(400);
    const newStaff: StaffMember = { id: `mock-staff-${Date.now()}`, ...staffData };
    staff.push(newStaff);
    return newStaff;
};

export const updateStaffMember = async (staffId: string, updates: Partial<StaffMember>): Promise<StaffMember> => {
    await delay(400);
    const index = staff.findIndex(s => s.id === staffId);
    if (index === -1) throw new Error("Staff member not found");
    staff[index] = { ...staff[index], ...updates };
    return staff[index];
};

export const deleteStaffMember = async (staffId: string): Promise<void> => {
    await delay(300);
    const initialLength = staff.length;
    staff = staff.filter(s => s.id !== staffId);
    if (staff.length === initialLength) throw new Error("Staff member not found");
};

// --- Booking Functions ---
export const createBooking = async (bookingData: Omit<Booking, 'id' | 'createdAt'>): Promise<string> => {
    await delay(600);
    const newBooking: Booking = {
        id: `mock-booking-${Date.now()}`,
        ...bookingData,
        createdAt: new Date(),
    };
    bookings.push(newBooking);
    return newBooking.id;
};

export const getBookingsForBusiness = async (businessId: string): Promise<Booking[]> => {
    await delay(300);
    const businessBookings = bookings.filter(b => b.businessId === businessId);
    // Sort by creation date, descending
    return businessBookings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const updateBookingStatus = async (bookingId: string, status: BookingStatus): Promise<void> => {
    await delay(150);
    const bookingIndex = bookings.findIndex(b => b.id === bookingId);
    if (bookingIndex > -1) {
        bookings[bookingIndex].status = status;
    } else {
        throw new Error("Booking not found");
    }
};

export const getBookingsForDay = async (businessId: string, date: string): Promise<Booking[]> => {
    await delay(200);
    // Exclude canceled bookings from availability checks
    return bookings.filter(b => b.businessId === businessId && b.date === date && b.status !== BookingStatus.Canceled);
};

// --- User/Auth Functions ---
export const loginUser = async (email: string, pass: string): Promise<User> => {
    await delay(300);
    const user = users.find(u => u.email === email);
    if (!user || passwords[user.id] !== pass) {
        throw new Error("Invalid email or password");
    }
    return { ...user };
};

export const registerUser = async (name: string, email: string, pass: string): Promise<User> => {
    await delay(300);
    if (users.find(u => u.email === email)) {
        throw new Error("User with this email already exists.");
    }
    // FIX: Add missing required properties to the User object.
    const trialStartsAt = new Date().toISOString();
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);
    const newUser: User = {
        id: `mock-user-${Date.now()}`,
        name,
        email,
        role: 'business_owner',
        subscriptionStatus: 'trialing',
        trialStartsAt: trialStartsAt,
        trialEndsAt: trialEndsAt.toISOString(),
    };
    users.push(newUser);
    passwords[newUser.id] = pass;
    return newUser;
};

export const updateUserProfile = async (userId: string, data: Partial<Pick<User, 'name' | 'imageUrl'>>): Promise<User> => {
    await delay(400);
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        throw new Error("User not found");
    }
    users[userIndex] = { ...users[userIndex], ...data };
    return { ...users[userIndex] };
};

export const updateUserPassword = async (userId: string, oldPass: string, newPass: string): Promise<void> => {
    await delay(500);
    const storedPassword = passwords[userId];
    if (storedPassword !== oldPass) {
        throw new Error("Incorrect current password.");
    }
    passwords[userId] = newPass;
};

export const createUserProfile = async (uid: string, name: string, email: string): Promise<void> => {
    await delay(100);
    // FIX: Add missing required properties to the User object.
    const trialStartsAt = new Date().toISOString();
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);
    const newUser: User = {
        id: uid,
        name,
        email,
        role: 'business_owner',
        subscriptionStatus: 'trialing',
        trialStartsAt: trialStartsAt,
        trialEndsAt: trialEndsAt.toISOString(),
    };
    users.push(newUser);
};