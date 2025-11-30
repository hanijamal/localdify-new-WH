
import React from 'react';
import { useLanguage } from '../hooks/useLanguage';
import Dropdown, { DropdownItem } from './ui/Dropdown';

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

const LanguageSelector: React.FC<{ className?: string }> = ({ className }) => {
    const { language, setLanguage } = useLanguage();
    const currentLanguage = languages.find(l => l.code === language) || languages[0];

    return (
        <div className={className}>
            <Dropdown
                trigger={
                    <button className="flex items-center space-x-2 p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none">
                        <span className="text-lg">{currentLanguage.flag}</span>
                        <span className="text-sm font-medium">{currentLanguage.name}</span>
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
        </div>
    );
};

export default LanguageSelector;
