import React, { useState, useRef, useEffect } from 'react';
import Input from './Input';

const languages = [
  { name: 'Arabic', code: 'ar' }, { name: 'Bengali', code: 'bn' }, { name: 'Czech', code: 'cs' },
  { name: 'Danish', code: 'da' }, { name: 'German', code: 'de' }, { name: 'English', code: 'en' },
  { name: 'English (UK)', code: 'en_GB' }, { name: 'English (US)', code: 'en_US' }, { name: 'Spanish', code: 'es' },
  { name: 'Spanish (Argentina)', code: 'es_AR' }, { name: 'Spanish (Spain)', code: 'es_ES' },
  { name: 'Spanish (Mexico)', code: 'es_MX' }, { name: 'French', code: 'fr' }, { name: 'Indonesian', code: 'id' },
  { name: 'Italian', code: 'it' }, { name: 'Hebrew', code: 'he' }, { name: 'Japanese', code: 'ja' },
  { name: 'Korean', code: 'ko' }, { name: 'Dutch', code: 'nl' }, { name: 'Polish', code: 'pl' },
  { name: 'Portuguese (Brazil)', code: 'pt_BR' }, { name: 'Portuguese (Portugal)', code: 'pt_PT' },
  { name: 'Russian', code: 'ru' }, { name: 'Swedish', code: 'sv' }, { name: 'Thai', code: 'th' },
  { name: 'Turkish', code: 'tr' }, { name: 'Vietnamese', code: 'vi' },
  { name: 'Chinese (Simplified)', code: 'zh_CN' }, { name: 'Chinese (Traditional)', code: 'zh_TW' },
];

interface LanguageCodeSelectorProps {
  label: string;
  value: string;
  onChange: (code: string) => void;
}

const LanguageCodeSelector: React.FC<LanguageCodeSelectorProps> = ({ label, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLanguage = languages.find(lang => lang.code === value) || null;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredLanguages = languages.filter(lang =>
    lang.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lang.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 bg-card border border-input rounded-md shadow-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm"
      >
        <span>{selectedLanguage ? `${selectedLanguage.name} (${selectedLanguage.code})` : 'Select language'}</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded-md shadow-lg bg-popover text-popover-foreground ring-1 ring-black ring-opacity-5 border border-border">
          <div className="p-2 border-b border-border">
            <Input
              type="search"
              placeholder="Search language..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full"
              autoFocus
            />
          </div>
          <ul className="max-h-60 overflow-y-auto p-1">
            {filteredLanguages.map(lang => (
              <li
                key={lang.code}
                onClick={() => {
                  onChange(lang.code);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`p-2 text-sm rounded-md cursor-pointer hover:bg-accent ${value === lang.code ? 'bg-accent font-semibold' : ''}`}
              >
                {lang.name} <span className="text-muted-foreground">({lang.code})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LanguageCodeSelector;
