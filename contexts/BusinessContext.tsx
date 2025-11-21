import React, { createContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Business, Service, Booking, StaffMember, ServiceCategory, Location, Plan, BusinessContextType } from '../types';
import { getBusinessForUser, getServicesForBusiness, getBookingsForBusiness, getStaffForBusiness, getCategoriesForBusiness, getLocationsForBusiness, getPlans } from '../services/supabaseService';

export const formatPrice = (amount: number, currency = "USD") => {
  const localeMap: { [key: string]: string } = {
    'USD': 'en-US',
    'EUR': 'de-DE',
    'SAR': 'ar-SA',
    'MAD': 'fr-MA',
    'BRL': 'pt-BR'
  };
  
  const locale = localeMap[currency] || 'en-US';

  // Special handling for SAR to display the full currency name
  if (currency === 'SAR') {
      try {
          return new Intl.NumberFormat(locale, {
              style: 'currency',
              currency: currency,
              currencyDisplay: 'name', // Use the full currency name "ريال سعودي"
              numberingSystem: 'latn'
          } as any).format(amount);
      } catch (error) {
          console.warn(`Failed to custom format SAR price. Defaulting to standard format.`, error);
      }
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      numberingSystem: 'latn'
    } as any).format(amount);
  } catch (error) {
    console.warn(`Failed to format price for currency ${currency}. Defaulting to USD format.`, error);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      numberingSystem: 'latn'
    } as any).format(amount);
  }
};

export const formatDuration = (minutes: number) => {
  if (isNaN(minutes) || minutes <= 0) {
    return '0m';
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (remainingMinutes > 0) {
    parts.push(`${remainingMinutes}m`);
  }

  if (parts.length === 0) {
      return '0m';
  }

  return parts.join(' ');
};

export const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export const BusinessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [allStaff, setAllStaff] = useState<StaffMember[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocationId, setSelectedLocationId] = useState<string | 'all'>('all');

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setBusiness(null);
      setAllServices([]);
      setAllBookings([]);
      setAllStaff([]);
      setCategories([]);
      setLocations([]);
      setPlans([]);
      return;
    };

    setLoading(true);
    try {
      const businessData = await getBusinessForUser(user.id);
      setBusiness(businessData);

      const [plansData] = await Promise.all([getPlans()]);
      setPlans(plansData);

      if (businessData) {
        const [servicesData, bookingsData, staffData, categoriesData, locationsData] = await Promise.all([
          getServicesForBusiness(businessData.id),
          getBookingsForBusiness(businessData.id),
          getStaffForBusiness(businessData.id),
          getCategoriesForBusiness(businessData.id),
          getLocationsForBusiness(businessData.id),
        ]);
        setAllServices(servicesData);
        setAllBookings(bookingsData);
        setAllStaff(staffData);
        setCategories(categoriesData);
        setLocations(locationsData);
      } else {
        setAllServices([]);
        setAllBookings([]);
        setAllStaff([]);
        setCategories([]);
        setLocations([]);
      }
    } catch (error: any) {
      console.error("Failed to fetch business data:", error.message);
      setBusiness(null);
      setAllServices([]);
      setAllBookings([]);
      setAllStaff([]);
      setCategories([]);
      setLocations([]);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
        fetchData();
    }
  }, [user, authLoading, fetchData]);

  const refetch = async () => {
    await fetchData();
  };
  
  const bookings = useMemo(() => {
    if (selectedLocationId === 'all') return allBookings;
    return allBookings.filter(b => b.locationId === selectedLocationId);
  }, [allBookings, selectedLocationId]);

  const staff = useMemo(() => {
    if (selectedLocationId === 'all') return allStaff;
    return allStaff.filter(s => s.locationIds?.includes(selectedLocationId));
  }, [allStaff, selectedLocationId]);

  const services = useMemo(() => {
    if (selectedLocationId === 'all') return allServices;
    return allServices.filter(s => s.locationIds?.includes(selectedLocationId));
  }, [allServices, selectedLocationId]);

  // Granular state updaters
  const addLocationContext = (location: Location) => setLocations(prev => [...prev, location].sort((a, b) => a.name.localeCompare(b.name)));
  const updateLocationContext = (location: Location) => setLocations(prev => prev.map(l => l.id === location.id ? location : l));
  const deleteLocationContext = (locationId: string) => setLocations(prev => prev.filter(l => l.id !== locationId));
  
  const addStaffContext = (staffMember: StaffMember) => setAllStaff(prev => [...prev, staffMember].sort((a, b) => a.name.localeCompare(b.name)));
  const updateStaffContext = (staffMember: StaffMember) => setAllStaff(prev => prev.map(s => s.id === staffMember.id ? staffMember : s));
  const deleteStaffContext = (staffId: string) => setAllStaff(prev => prev.filter(s => s.id !== staffId));
  
  const addServiceContext = (service: Service) => setAllServices(prev => [...prev, service].sort((a, b) => a.name.localeCompare(b.name)));
  const updateServiceContext = (service: Service) => setAllServices(prev => prev.map(s => s.id === service.id ? service : s));
  const deleteServiceContext = (serviceId: string) => setAllServices(prev => prev.filter(s => s.id !== serviceId));
  
  const addCategoryContext = (category: ServiceCategory) => setCategories(prev => [...prev, category].sort((a, b) => a.name.localeCompare(b.name)));
  const updateCategoryContext = (category: ServiceCategory) => setCategories(prev => prev.map(c => c.id === category.id ? category : c));
  const deleteCategoryContext = (categoryId: string) => setCategories(prev => prev.filter(c => c.id !== categoryId));

  return (
    <BusinessContext.Provider value={{ 
        business, 
        services, 
        bookings, 
        staff,
        allServices,
        allBookings,
        allStaff,
        categories, 
        locations,
        plans,
        loading, 
        refetch, 
        setBusiness,
        selectedLocationId,
        setSelectedLocationId,
        addLocationContext,
        updateLocationContext,
        deleteLocationContext,
        addStaffContext,
        updateStaffContext,
        deleteStaffContext,
        addServiceContext,
        updateServiceContext,
        deleteServiceContext,
        addCategoryContext,
        updateCategoryContext,
        deleteCategoryContext
    }}>
      {children}
    </BusinessContext.Provider>
  );
};