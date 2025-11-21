

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import ThemeToggle from '../../components/ThemeToggle';
import ProfileModal from '../../components/ProfileModal';
import { AdminProvider } from '../../contexts/AdminContext';
import Dropdown, { DropdownItem } from '../../components/ui/Dropdown';
import { useLanguage } from '../../hooks/useLanguage';

// FIX: Changed icon type from JSX.Element to React.ReactNode to resolve namespace error.
const SidebarLink: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`
    }
  >
    {icon}
    <span className="ml-3">{label}</span>
  </NavLink>
);

const MobileSidebarLink: React.FC<{ to: string; icon: React.ReactNode; label: string, onClick: () => void }> = ({ to, icon, label, onClick }) => (
    <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) =>
        `flex items-center p-3 rounded-lg text-base font-medium transition-colors ${
            isActive
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        }`
        }
    >
        {icon}
        <span className="ml-4">{label}</span>
    </NavLink>
);


const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
] as const;

const ChevronDownIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);


const AdminLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const { t, language, setLanguage } = useLanguage();
    const navigate = useNavigate();
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/admin/login');
    };

    const navItems = [
        { to: '/admin/dashboard', label: t('adminDashboard'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg> },
        { to: '/admin/revenue', label: t('sidebarRevenue'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.5 2.5 0 00-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM10 2a8 8 0 100 16 8 8 0 000-16zm-1 14a1 1 0 11-2 0 1 1 0 012 0zm0-4a1 1 0 11-2 0 1 1 0 012 0zm2-4a1 1 0 11-2 0 1 1 0 012 0zm3 4a1 1 0 11-2 0 1 1 0 012 0zm1-4a1 1 0 11-2 0 1 1 0 012 0z" /></svg> },
        { to: '/admin/plans', label: t('planManagement'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
        { to: '/admin/pages', label: t('pages'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
        { to: '/admin/support', label: t('adminSupportTickets'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
        { to: '/admin/settings', label: t('sidebarSettings'), icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01-.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg> },
    ];

    const currentLanguage = languages.find(l => l.code === language) || languages[0];

  return (
    <div className="flex h-screen bg-background text-foreground">
        {/* Mobile Sidebar */}
        <div className={`fixed inset-0 z-40 flex md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
            <div className="w-64 bg-card border-r border-border p-4 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center">
                        <h1 className="text-xl font-bold text-primary">{t('adminPanel')}</h1>
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
      <aside className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-border bg-card">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <h1 className="text-xl font-bold text-primary">{t('adminPanel')}</h1>
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

      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <header className="relative z-10 flex-shrink-0 flex h-16 bg-card shadow-sm border-b border-border">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="px-4 border-r border-border text-muted-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary md:hidden"
          >
            <span className="sr-only">Open sidebar</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
          </button>
          <div className="flex-1 px-4 flex justify-end items-center">
            <div className="flex items-center space-x-4">
              <Dropdown
                trigger={
                    <button className="flex items-center space-x-2 p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:focus:ring-offset-background">
                        <span className="text-lg">{currentLanguage.flag}</span>
                        <span className="text-sm font-medium hidden sm:inline">{currentLanguage.name}</span>
                        <ChevronDownIcon />
                    </button>
                }
                >
                    {languages.map(lang => (
                        <DropdownItem
                            key={lang.code}
                            onClick={() => setLanguage(lang.code)}
                            className={`flex items-center space-x-2 ${language === lang.code ? 'bg-accent font-semibold text-accent-foreground' : ''}`}
                        >
                            <span className="text-lg">{lang.flag}</span>
                            <span>{lang.name}</span>
                        </DropdownItem>
                    ))}
                </Dropdown>
              <ThemeToggle />
               <Dropdown
                trigger={
                  <button className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:focus:ring-offset-background rounded-md px-2 py-1">
                    <img className="h-8 w-8 rounded-full object-cover" src={user?.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || '')}&background=random`} alt="User avatar" />
                    <span className="text-sm font-medium hidden sm:block pr-2">{user?.name}</span>
                  </button>
                }
              >
                <DropdownItem onClick={() => setIsProfileModalOpen(true)} className="flex items-center">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                   {t('editProfile')}
                </DropdownItem>
                <DropdownItem onClick={handleLogout} className="flex items-center text-destructive hover:bg-destructive/10">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                   {t('logout')}
                </DropdownItem>
              </Dropdown>
            </div>
          </div>
        </header>

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                <AdminProvider>
                    <Outlet />
                </AdminProvider>
            </div>
          </div>
        </main>
      </div>
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    </div>
  );
};

export default AdminLayout;