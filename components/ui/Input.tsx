import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
}

const Input: React.FC<InputProps> = ({ label, id, className = '', helperText, ...props }) => {
  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`block w-full px-3 py-2 bg-card border border-input rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm ${className}`}
        {...props}
      />
      {helperText && <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
};

export default Input;