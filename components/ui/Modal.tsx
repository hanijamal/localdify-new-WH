import React, { ReactNode } from 'react';
import Card, { CardHeader, CardContent, CardFooter } from './Card';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string;
  scrollable?: boolean;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, widthClass = 'max-w-md', scrollable = false }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-80 z-50 flex justify-center items-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className={`w-full ${widthClass}`}
        onClick={e => e.stopPropagation()}
      >
        <Card className={`animate-in fade-in-0 zoom-in-95 w-full ${scrollable ? 'max-h-[90vh] flex flex-col' : ''}`}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-card-foreground">{title}</h2>
              <button 
                onClick={onClose} 
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close modal"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </CardHeader>
          <CardContent className={scrollable ? 'flex-1 overflow-y-auto' : ''}>
            {children}
          </CardContent>
          {footer && (
            <CardFooter className="flex justify-end space-x-2">
              {footer}
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Modal;