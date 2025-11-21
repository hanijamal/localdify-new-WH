
import React, { useState } from 'react';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import { useLanguage } from '../hooks/useLanguage';

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (subject: string, message: string) => Promise<void>;
}

const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const { t } = useLanguage();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit(subject, message);
      setSubject('');
      setMessage('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('createSupportTicketTitle')}>
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('createSupportTicketDesc')}
          </p>
          <Input
            id="subject"
            label={t('subjectLabel')}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            placeholder={t('subjectPlaceholder')}
          />
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-foreground mb-1">
              {t('messageLabel')}
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
              placeholder={t('messagePlaceholder')}
              className="block w-full px-3 py-2 bg-card border border-input rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm"
            />
          </div>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </div>
        <div className="p-4 sm:p-6 bg-muted/50 border-t border-border flex justify-end items-center space-x-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            {t('cancelButton')}
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {t('submitTicketButton')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TicketModal;
