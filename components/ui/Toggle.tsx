import React from 'react';

interface ToggleProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    label?: string;
    description?: string;
}

const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled = false, label, description }) => {
    return (
        <div className="flex items-center justify-between">
            <div className="flex-1">
                {label && <label className="text-sm font-medium text-foreground">{label}</label>}
                {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${checked ? 'bg-primary' : 'bg-gray-300'}
        `}
            >
                <span
                    className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
                />
            </button>
        </div>
    );
};

export default Toggle;
