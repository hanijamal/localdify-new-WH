import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
}

const Dropdown: React.FC<DropdownProps> = ({ trigger, children, align = 'end' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const alignmentClasses = align === 'start'
    ? 'ltr:origin-top-left rtl:origin-top-right ltr:left-0 rtl:right-0'
    : 'ltr:origin-top-right rtl:origin-top-left ltr:right-0 rtl:left-0';

  return (
    <div className="relative inline-block ltr:text-left rtl:text-right" ref={dropdownRef}>
      <div onClick={toggleDropdown} className="cursor-pointer">
        {trigger}
      </div>
      {isOpen && (
        <div
          className={`${alignmentClasses} absolute mt-2 w-56 rounded-md shadow-lg bg-popover text-popover-foreground ring-1 ring-black ring-opacity-5 focus:outline-none z-10 border border-border`}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
           onClick={() => setIsOpen(false)}
        >
          <div className="py-1" role="none">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export const DropdownItem: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, className, ...props }) => {
  return (
    <button
      className={`block w-full ltr:text-left rtl:text-right px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 ${className}`}
      role="menuitem"
      {...props}
    >
      {children}
    </button>
  );
};

export const DropdownHeader: React.FC<{ children: ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${className || ''}`}>
      {children}
    </div>
);
  
export const DropdownSeparator: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`my-1 h-px bg-border ${className || ''}`} />
);

export default Dropdown;