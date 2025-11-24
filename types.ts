// This file contains all the core type definitions for the application.

// FIX: Import React to provide types for React.Dispatch and React.SetStateAction.
import type * as React from 'react';

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
  subscriptionPlan?: string | null;
  status?: 'active' | 'suspended'; // For admin management
  createdAt?: string;
  businessName?: string;
  whatsappNumber?: string | null;
  totalBookings?: number;
  emailMessagesSent?: number;
  whatsappMessagesSent?: number;
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

export interface Location {
  id: string;
  businessId: string;
  name: string;
  slug: string;
  address?: string | null;
  workingHours?: { start: string; end: string; } | null;
  closedDays?: DayOfWeek[] | null;
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
  locationIds?: string[];
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
  enabledEmailLanguages?: string[];
  defaultLanguage?: string;
  allowLanguageSelection?: boolean;
  google_access_token?: string | null;
  google_refresh_token?: string | null;
  google_integration_active?: boolean;
  whatsappNotificationsEnabled?: boolean;
  customDomain?: string | null;
  customDomainStatus?: 'pending' | 'active' | 'error' | null;
  socials?: {
    whatsapp?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    website?: string | null;
  };
  email_messages_sent?: number;
  whatsapp_messages_sent?: number;
  // Notification settings
  clientconfirmationenabled?: boolean;
  clientreminderenabled?: boolean;
  ownernotificationenabled?: boolean;
}

export interface ServiceCategory {
  id: string;
  businessId: string;
  name: string;
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
  categoryId?: string | null;
  locationIds?: string[];
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
  locationId?: string | null;
  language?: string;
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

export interface PlanSetting {
  price: string;
  status: 'available' | 'coming_soon';
}

export interface SubscriptionPlansSetting {
  pro: PlanSetting;
  business: PlanSetting;
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
// FIX: Add Page interface for CMS functionality
export interface Page {
  id: string;
  slug: string;
  title: { [key: string]: string } | string;
  content: any; // JSONB
  is_published: boolean;
  show_in_header: boolean;
  show_in_footer: boolean;
  created_at?: string;
}
export interface RegistrationCounterSetting {
  enabled: boolean;
  message: string;
  current: number;
  total: number;
}

export interface PublicSystemSettings {
  registrationCounter?: Partial<RegistrationCounterSetting>;
  dashboardVideoUrl?: string | null;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  staff_limit: number;
  services_limit: number;
  locations_limit: number;
  email_quota: number;
  whatsapp_quota: number;
  is_active: boolean;
  created_at: string;
}

export interface BusinessContextType {
  business: Business | null;
  // Filtered data for display on pages like dashboard, clients, revenue
  services: Service[];
  bookings: Booking[];
  staff: StaffMember[];
  // Unfiltered data for management pages
  allServices: Service[];
  allBookings: Booking[];
  allStaff: StaffMember[];
  categories: ServiceCategory[];
  locations: Location[];
  plans: Plan[];
  loading: boolean;
  refetch: () => Promise<void>;
  setBusiness: React.Dispatch<React.SetStateAction<Business | null>>;
  selectedLocationId: string | 'all';
  setSelectedLocationId: React.Dispatch<React.SetStateAction<string | 'all'>>;
  // Granular state updaters
  addLocationContext: (location: Location) => void;
  updateLocationContext: (location: Location) => void;
  deleteLocationContext: (locationId: string) => void;
  addStaffContext: (staffMember: StaffMember) => void;
  updateStaffContext: (staffMember: StaffMember) => void;
  deleteStaffContext: (staffId: string) => void;
  addServiceContext: (service: Service) => void;
  updateServiceContext: (service: Service) => void;
  deleteServiceContext: (serviceId: string) => void;
  addCategoryContext: (category: ServiceCategory) => void;
  updateCategoryContext: (category: ServiceCategory) => void;
  deleteCategoryContext: (categoryId: string) => void;
}