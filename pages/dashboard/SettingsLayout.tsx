

import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';

const SettingsLayout: React.FC = () => {
    const { t } = useLanguage();

    const navLinks = [
        { to: '/dashboard/settings/details', label: t('businessDetails') },
        { to: '/dashboard/settings/locations', label: t('locationsTab') },
        { to: '/dashboard/settings/services', label: t('manageServices') },
        { to: '/dashboard/settings/staff', label: t('manageStaff') },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">{t('sidebarSettings')}</h1>
                <p className="text-muted-foreground">{t('settingsPageDescription')}</p>
            </div>

            <div className="border-b border-border">
                <nav className="-mb-px flex space-x-6 rtl:space-x-reverse overflow-x-auto" aria-label="Tabs">
                    {navLinks.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end
                            className={({ isActive }) =>
                                `whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                                isActive
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                }`
                            }
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className="pt-2">
                <Outlet />
            </div>
        </div>
    );
};

export default SettingsLayout;