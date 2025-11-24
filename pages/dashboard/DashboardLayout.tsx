

import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import ThemeToggle from '../../components/ThemeToggle';
import ProfileModal from '../../components/ProfileModal';
import NotificationCenter from '../../components/ui/NotificationCenter';
import Dropdown, { DropdownItem, DropdownHeader, DropdownSeparator } from '../../components/ui/Dropdown';
import { useLanguage } from '../../hooks/useLanguage';
import { useBusiness } from '../../hooks/useBusiness';
import { useTheme } from '../../contexts/ThemeContext';

// FIX: Changed icon type from JSX.Element to React.ReactNode to resolve namespace error.
const SidebarLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`
    }
  >
    {icon}
    <span className="ml-3">{label}</span>
  </NavLink>
);

// FIX: Changed icon type from JSX.Element to React.ReactNode to resolve namespace error.
const MobileSidebarLink: React.FC<{ to: string; icon: React.ReactNode; label: string, onClick: () => void }> = ({ to, icon, label, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center p-3 rounded-lg text-base font-medium transition-colors ${isActive
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`
    }
  >
    {icon}
    <span className="ml-4">{label}</span>
  </NavLink>
);

// FIX: Added Portuguese ('pt-BR') to the list of available languages and added 'as const' to infer literal types, resolving type errors.
const languages = [
  { code: 'ar', name: 'العربية ', flag: '' },
  { code: 'en', name: 'English', flag: '' },
  { code: 'fr', name: 'Français ', flag: '' },
  //{ code: 'pt-BR', name: 'Português ', flag: '' }
] as const;

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);


const DashboardLayout: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const { t, setLanguage, language } = useLanguage();
  const { business, locations, selectedLocationId, setSelectedLocationId } = useBusiness();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [effectiveTheme, setEffectiveTheme] = useState(theme);

  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const updateTheme = () => {
        setEffectiveTheme(mediaQuery.matches ? 'dark' : 'light');
      };
      updateTheme(); // Initial check
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    } else {
      setEffectiveTheme(theme);
    }
  }, [theme]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleViewPublicPage = () => {
    if (business?.slug) {
      window.open(`/b/${business.slug}`, '_blank');
    } else {
      navigate('/dashboard/settings');
    }
  };

  const navItems = [
    { to: '/dashboard/overview', label: t('sidebarDashboard'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> },
    { to: '/dashboard/clients', label: t('sidebarClients'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
    { to: '/dashboard/revenue', label: t('sidebarRevenue'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10"></line><line x1="18" x2="18" y1="20" y2="4"></line><line x1="6" x2="6" y1="20" y2="16"></line></svg> },
    { to: '/dashboard/settings', label: t('sidebarSettings'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg> },
    { to: '/dashboard/templates', label: t('sidebarTemplates'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><line x1="3" x2="21" y1="9" y2="9"></line><line x1="9" x2="9" y1="21" y2="9"></line></svg> },
    { to: '/dashboard/integrations', label: t('sidebarAutomation'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> },
    { to: '/dashboard/support', label: t('sidebarSupport'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" x2="12.01" y1="17" y2="17"></line></svg> },
  ];

  const trialEndDate = user?.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const remainingDays = trialEndDate ? Math.max(0, Math.ceil((trialEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0;
  const showTrialBanner = !isAdmin && user?.subscriptionStatus === 'trialing' && remainingDays > 0;

  const currentLanguage = languages.find(l => l.code === language) || languages[0];

  const selectedLocationName = selectedLocationId === 'all'
    ? t('allLocations')
    : locations.find(loc => loc.id === selectedLocationId)?.name || t('selectLocation');

  return (
    <div className={`flex h-screen bg-background text-foreground ${effectiveTheme === 'dark' ? 'dark' : ''}`}>
      {/* Mobile Sidebar */}
      <div className={`fixed inset-0 z-40 flex md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
        <div className="w-64 bg-card border-r border-border p-4 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary">localDify</h1>
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold tracking-wide text-blue-800 bg-blue-100 dark:bg-blue-700 dark:text-blue-200 rounded-full">
                {t('betaBadge')}
              </span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="p-1 text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <nav className="flex-1 space-y-2">
            {navItems.map(item => <MobileSidebarLink key={item.to} {...item} onClick={() => setIsSidebarOpen(false)} />)}
          </nav>
        </div>
        <div className="flex-1 bg-black/50" onClick={() => setIsSidebarOpen(false)}></div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-border bg-card">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-xl font-bold text-primary">localDify</h1>
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold tracking-wide text-blue-800 bg-blue-100 dark:bg-blue-700 dark:text-blue-200 rounded-full">
                  {t('betaBadge')}
                </span>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navItems.map(item => <SidebarLink key={item.to} {...item} />)}
              </nav>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <header className="relative z-10 flex-shrink-0 flex h-16 bg-card shadow-sm border-b border-border">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="px-4 border-r border-border text-muted-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary md:hidden"
          >
            <span className="sr-only">Open sidebar</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
          </button>
          <div className="flex-1 px-4 flex justify-between items-center">
            <div className="flex items-center gap-x-2 md:gap-x-4">
              <button
                onClick={handleViewPublicPage}
                className="flex items-center gap-x-2 p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none ring-1 ring-border"
                title={t('viewPage')}
                aria-label={t('viewPage')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <NotificationCenter />
              <ThemeToggle />
              <Dropdown
                align="end"
                trigger={
                  <button className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:focus:ring-offset-background rounded-md px-2 py-1 hover:bg-accent">
                    <img className="h-8 w-8 rounded-full object-cover" src={user?.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || '')}&background=random`} alt="User avatar" />
                    <span className="text-sm font-medium hidden sm:block pr-2">{user?.name}</span>
                    <ChevronDownIcon />
                  </button>
                }
              >
                <DropdownHeader>{user?.email}</DropdownHeader>
                <DropdownSeparator />

                {/* Location Row */}
                <Dropdown
                  align="start"
                  trigger={
                    <button className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-accent transition-colors">
                      <div className="flex items-center gap-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-muted-foreground">{t('location') || 'Locations'}</span>
                      </div>
                      <span className="text-primary font-medium">{selectedLocationName}</span>
                    </button>
                  }
                >
                  <DropdownItem onClick={() => setSelectedLocationId('all')} className={selectedLocationId === 'all' ? 'bg-accent' : ''}>
                    {t('allLocations')}
                  </DropdownItem>
                  <DropdownSeparator />
                  {locations.map(loc => (
                    <DropdownItem key={loc.id} onClick={() => setSelectedLocationId(loc.id)} className={selectedLocationId === loc.id ? 'bg-accent' : ''}>
                      {loc.name}
                    </DropdownItem>
                  ))}
                </Dropdown>

                {/* Language Row */}
                <Dropdown
                  align="start"
                  trigger={
                    <button className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-accent transition-colors">
                      <div className="flex items-center gap-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-muted-foreground">{t('language') || 'Language'}</span>
                      </div>
                      <span className="text-primary font-medium">{currentLanguage.name}</span>
                    </button>
                  }
                >
                  {languages.map(lang => (
                    <DropdownItem
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`flex items-center space-x-2 ${language === lang.code ? 'bg-accent font-semibold' : ''}`}
                    >
                      <span className="text-base">{lang.flag}</span>
                      <span>{lang.name}</span>
                    </DropdownItem>
                  ))}
                </Dropdown>

                {/* Mode Row */}
                <button
                  onClick={() => {/* Theme toggle will be handled by ThemeToggle component */ }}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-muted-foreground">{t('mode') || 'Mode'}</span>
                  </div>
                  <span className="text-primary font-medium capitalize">{theme}</span>
                </button>

                <DropdownSeparator />

                {/* Account Actions */}
                <DropdownItem onClick={() => setIsProfileModalOpen(true)} className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  {t('editProfile')}
                </DropdownItem>
                <DropdownItem onClick={() => navigate('/dashboard/billing')} className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  {t('sidebarBilling')}
                </DropdownItem>
                <DropdownItem onClick={handleLogout} className="flex items-center text-destructive hover:bg-destructive/10">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  {t('logout')}
                </DropdownItem>
              </Dropdown>
            </div>
          </div>
        </header>

        {showTrialBanner && (
          <div className="bg-yellow-100 dark:bg-yellow-900/50 border-b border-yellow-200 dark:border-yellow-800 p-3 text-center text-sm text-yellow-800 dark:text-yellow-200">
            {t('trialDaysLeft', { days: remainingDays, day_plural: remainingDays === 1 ? t('day') : t('days') })}
            <button onClick={() => navigate('/trial-ended')} className="ml-2 font-bold underline hover:text-yellow-900 dark:hover:text-yellow-100">{t('upgradeNow')}</button>
          </div>
        )}

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  );
};

export default DashboardLayout;
