import React from 'react';

// FIX: Extend from HTMLAttributes<HTMLDivElement> to allow passing standard div props like onClick.
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`bg-card text-card-foreground shadow-sm border border-border rounded-lg overflow-hidden ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return <div className={`p-4 sm:p-6 border-b border-border ${className}`} {...props}>{children}</div>;
};

export const CardContent: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return <div className={`p-4 sm:p-6 ${className}`} {...props}>{children}</div>;
};

export const CardFooter: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return <div className={`p-4 sm:p-6 bg-muted/50 border-t border-border ${className}`} {...props}>{children}</div>;
}


export default Card;
