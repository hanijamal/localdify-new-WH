import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  // FIX: Add helperText prop to support displaying help text below the select element.
  helperText?: string;
}

const Select: React.FC<SelectProps> = ({ label, id, children, className = '', helperText, ...props }) => {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`block w-full px-3 py-2 bg-card border border-input rounded-md shadow-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm ${className}`}
        {...props}
      >
        {children}
      </select>
      {/* FIX: Render helperText if it is provided. */}
      {helperText && <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
};

export default Select;
