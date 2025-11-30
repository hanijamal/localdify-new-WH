// This file contains all the core type definitions for the application.

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'business_owner' | 'admin';
  imageUrl?: string | null;
  subscriptionStatus: 'trialing' | 'active' | 'inactive';
  trialStartsAt?: string | null;
  trialEndsAt?: string | null;
  paypalSubscriptionId?: string | null;
  status?: 'active' | 'suspended'; // For admin management
  createdAt?: string;
  businessName?: string;
}

export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface Template {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  htmlContent?: string | null;
  cssContent?: string | null;
  createdAt: string;
}

// FIX: Define and export the ThemeSettings interface for business theme customization.
export interface ThemeSettings {
    templateId: string;
    primaryColor: string;
    backgroundColor: string;
    cardColor: string;
    textColor: string;
    fontFamily: string;
    borderRadius: number;
    customCss: string;
    secondaryColor?: string;
    coverImageUrl?: string;
}

export interface EmailTemplate {
    subject: string;
    body: string;
}

export interface StaffMember {
  id: string;
  businessId: string;
  name: string;
  email?: string | null;
  imageUrl?: string | null;
  workingHours?: { start: string; end: string; };
  closedDays?: DayOfWeek[];
  serviceIds?: string[];
}

export interface Business {
  id: string;
  userId: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  galleryImages?: string[];
  currency: string;
  calendarSettings?: {
    bookingInAdvanceDays: number;
    minBookingNoticeHours: number;
    bufferTimeMinutes: number;
    timeSlotInterval?: number;
  };
  htmlContent?: string | null;
  cssContent?: string | null;
  // FIX: Add the optional themeSettings property to the Business interface.
  themeSettings?: ThemeSettings;
  emailTemplates?: {
      confirmation: EmailTemplate;
      reminder: EmailTemplate;
  };
  google_access_token?: string | null;
  google_refresh_token?: string | null;
  google_integration_active?: boolean;
  whatsapp_access_token?: string | null;
  whatsapp_phone_number_id?: string | null;
  whatsapp_integration_active?: boolean;
  socials?: {
    whatsapp?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    website?: string | null;
  };
}

export interface Service {
  id: string;
  businessId: string;
  name: string;
  duration: number;
  price: number;
  description?: string | null;
  imageUrl?: string | null;
  staffMemberIds?: string[];
}

export enum BookingStatus {
  Pending = "pending",
  Approved = "approved",
  Canceled = "canceled",
}

export interface Booking {
  id: string;
  businessId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  priceAtBooking: number;
  date: string;
  time: string;
  status: BookingStatus;
  notes?: string | null;
  createdAt: Date;
  confirmation_token?: string | null;
  cancellation_token?: string | null;
  reminder_sent_at?: string | null;
  staffMemberId?: string | null;
}

export interface ShortLink {
  id: string;
  shortCode: string;
  longUrl: string;
  userId: string;
  createdAt: string;
}

export enum TicketStatus {
    Open = "open",
    InProgress = "in_progress",
    Closed = "closed"
}

export interface TicketMessage {
    id: string;
    ticketId: string;
    userId: string;
    userName: string;
    content: string;
    createdAt: string;
}

export interface SupportTicket {
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    subject: string;
    status: TicketStatus;
    createdAt: string;
    updatedAt: string;
    messages: TicketMessage[];
    businessName?: string;
}

export interface PayPalConfig {
    clientId: string;
    clientSecret: string;
}

export interface SystemSetting<T> {
    key: string;
    value: T;
}

export interface SubscriptionPriceSetting {
    price: string;
}

export interface PaymentHistory {
    id: string;
    userId: string;
    createdAt: string;
    amount: number;
    currency: string;
    paymentProvider: string;
    providerTransactionId: string;
    description: string;
}