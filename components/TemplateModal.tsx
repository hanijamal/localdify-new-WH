import React, { useState, useEffect } from 'react';
import { Template } from '../types';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import { useAdmin } from '../hooks/useAdmin';
import { useLanguage } from '../hooks/useLanguage';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: Template | null;
}

const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose, template }) => {
  const { addTemplate, updateTemplate } = useAdmin();
  const { t } = useLanguage();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [cssContent, setCssContent] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = !!template;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        setName(template.name);
        setDescription(template.description || '');
        setImageUrl(template.imageUrl || '');
        setHtmlContent(template.htmlContent || '');
        setCssContent(template.cssContent || '');
      } else {
        setName('');
        setDescription('');
        setImageUrl('');
        setHtmlContent('<div class="container mx-auto p-8">\n  <h1 class="text-3xl font-bold mb-4">{{business_name}}</h1>\n  <p class="mb-8">{{business_description}}</p>\n  <div class="bg-white p-6 rounded-lg shadow-md">\n    {{booking_app}}\n  </div>\n</div>');
        setCssContent('body {\n  background-color: #f3f4f6;\n}');
      }
      setError('');
    }
  }, [template, isOpen, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (!htmlContent.includes('{{booking_app}}')) {
      setError('HTML content must include the {{booking_app}} placeholder.');
      setIsSubmitting(false);
      return;
    }

    try {
      const templateData = { name, description, imageUrl, htmlContent, cssContent };
      if (isEditMode) {
        await updateTemplate(template.id, templateData);
      } else {
        await addTemplate(templateData);
      }
      onClose();
    } catch (err: any) {
      setError(t('templateError', { error: err.message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const optionalPlaceholders = [
    '{{business_name}}',
    '{{business_description}}',
    '{{business_image_url}}',
    '{{business_address}}',
    '{{socials_website}}',
    '{{socials_instagram}}',
    '{{socials_facebook}}',
    '{{socials_whatsapp}}'
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? t('editTemplate') : t('addTemplate')} widthClass="max-w-4xl" scrollable>
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-4">
          <Input label={t('templateName')} value={name} onChange={e => setName(e.target.value)} required />
          <Input label={t('templateDescription')} value={description} onChange={e => setDescription(e.target.value)} />
          <Input label={t('previewImageUrl')} value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" />

          <div className="pt-4 border-t border-border">
            <label htmlFor="html-content" className="block text-sm font-medium text-foreground">{t('htmlContent')}</label>
            <textarea
              id="html-content"
              value={htmlContent}
              onChange={e => setHtmlContent(e.target.value)}
              rows={12}
              className="mt-1 block w-full px-3 py-2 bg-card border border-input rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm font-mono text-xs"
              placeholder="Enter your HTML template here..."
            />
            <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border">
                <h4 className="text-sm font-semibold text-foreground mb-2">{t('availablePlaceholders')}</h4>
                
                <div className="mb-3">
                    <p className="text-xs text-muted-foreground"><span className="font-bold text-destructive">{t('required')}:</span> {t('templateBookingAppDesc')}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        <button
                            type="button"
                            onClick={() => copyToClipboard('{{booking_app}}')}
                            className="px-2 py-1 text-xs font-mono bg-accent text-accent-foreground rounded-md hover:bg-primary/20 transition-colors"
                            title={t('clickToCopy')}
                        >
                            {'{{booking_app}}'}
                        </button>
                    </div>
                </div>

                <div>
                    <p className="text-xs text-muted-foreground"><span className="font-bold">{t('optional')}:</span> {t('templateBusinessInfoDesc')}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {optionalPlaceholders.map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => copyToClipboard(p)}
                                className="px-2 py-1 text-xs font-mono bg-accent text-accent-foreground rounded-md hover:bg-primary/20 transition-colors"
                                title={t('clickToCopy')}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
          </div>

           <div>
            <label htmlFor="css-content" className="block text-sm font-medium text-foreground">{t('cssContent')}</label>
            <textarea
              id="css-content"
              value={cssContent}
              onChange={e => setCssContent(e.target.value)}
              rows={8}
              className="mt-1 block w-full px-3 py-2 bg-card border border-input rounded-md shadow-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:text-sm font-mono text-xs"
              placeholder="Enter your CSS styles here..."
            />
          </div>

          {error && <p className="text-destructive text-sm text-center">{error}</p>}
        </div>
        <div className="p-4 sm:p-6 bg-muted/50 border-t border-border text-right flex justify-end items-center space-x-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>{t('cancelButton')}</Button>
          <Button type="submit" isLoading={isSubmitting}>{isEditMode ? t('saveChangesButton') : t('createTemplate')}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default TemplateModal;