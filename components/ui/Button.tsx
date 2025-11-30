import React from 'react';

// FIX: Refactored Button to be polymorphic, supporting `as="a"` for links.
// This resolves the error where `as` and `href` props were passed to a component
// that only supported button attributes.

// Base props common to all variants of the button
interface ButtonBaseProps {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  isLoading?: boolean;
  children?: React.ReactNode;
  className?: string;
}

// Props for a standard <button>
type ButtonAsButtonProps = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    as?: 'button';
  };

// Props for an <a> tag styled as a button
type ButtonAsAnchorProps = ButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> & {
    as: 'a';
  };

// The component's props are a union of the two types, discriminated by 'as'
type ButtonProps = ButtonAsButtonProps | ButtonAsAnchorProps;


const Button: React.FC<ButtonProps> = (props) => {
  // Destructure common layout/style props from the union type.
  const {
    variant = 'primary',
    size = 'default',
    className = '',
    isLoading = false,
  } = props;

  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none';

  const variantStyles = {
    primary: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
  };

  const sizeStyles = {
    default: 'px-4 py-2 text-sm',
    sm: 'px-3 py-1.5 text-xs',
    lg: 'px-10 py-4 text-lg',
  };
  
  const combinedClasses = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;
  
  const spinner = isLoading && (
    <svg className="animate-spin -ml-1 mr-3 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  if (props.as === 'a') {
    // Destructure out element-specific props. We rename the common ones to avoid using them,
    // as they are already applied in `combinedClasses`. The rest operator `...anchorProps` gets href, target, etc.
    const { as, children, className: _c, variant: _v, size: _s, isLoading: _i, ...anchorProps } = props;
    return (
      <a className={combinedClasses} {...anchorProps}>
        {spinner}
        {children}
      </a>
    );
  }

  // Handle the button case. The rest operator `...buttonProps` gets disabled, type, onClick, etc.
  const { as, children, className: _c, variant: _v, size: _s, isLoading: _i, ...buttonProps } = props;
  return (
    <button
      className={combinedClasses}
      disabled={isLoading || buttonProps.disabled}
      {...buttonProps}
    >
      {spinner}
      {children}
    </button>
  );
};

export default Button;
