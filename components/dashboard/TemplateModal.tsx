import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { supabase } from '../../supabaseClient';

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    salonId: string;
    templateType: 'confirmation' | 'reminder' | 'owner';
}

const DEFAULT_TEMPLATE = `تأكيد موعدكم
مرحباً {{customerName}}،

تم تأكيد حجزكم في {{businessName}}! تفاصيل الموعد أدناه:

الخدمة: {{serviceName}}
السعر: {{servicePrice}}
التاريخ والوقت: {{bookingDate}} الساعة {{bookingTime}}
مع: {{staffName}}
الفرع: {{locationName}}
الموقع: {{locationAddress}}

لأي استفسار، يرجى التواصل معنا عبر واتساب على الرقم: {{businessPhone}}.

نتطلع لرؤيتكم قريباً!`;

const PLACEHOLDERS = [
    { key: '{{customerName}}', label: 'Customer Name', description: "Customer's full name" },
    { key: '{{customerEmail}}', label: 'Customer Email', description: "Customer's email address" },
    { key: '{{customerPhone}}', label: 'Customer Phone', description: "Customer's phone number" },
    { key: '{{serviceName}}', label: 'Service Name', description: 'Name of the booked service' },
    { key: '{{servicePrice}}', label: 'Service Price', description: 'Price of the service' },
    { key: '{{bookingDate}}', label: 'Booking Date', description: 'Date of the booking' },
    { key: '{{bookingTime}}', label: 'Booking Time', description: 'Time of the booking' },
    { key: '{{staffName}}', label: 'Staff Name', description: 'Name of assigned staff member' },
    { key: '{{locationName}}', label: 'Location Name', description: 'Name of the location/branch' },
    { key: '{{locationAddress}}', label: 'Location Address', description: 'Address of the location' },
    { key: '{{businessName}}', label: 'Business Name', description: 'Name of the business' },
    { key: '{{businessPhone}}', label: 'Business Phone', description: 'Business phone number' },
];

const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose, salonId, templateType }) => {
    const [templateText, setTemplateText] = useState(DEFAULT_TEMPLATE);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && salonId) {
            loadTemplate();
        }
    }, [isOpen, salonId, templateType]);

    const loadTemplate = async () => {
        setIsLoading(true);
        try {
            const columnName = `whatsapp_${templateType}_template`;
            const { data, error } = await supabase
                .from('businesses')
                .select(columnName)
                .eq('id', salonId)
                .single();

            if (error) throw error;

            if (data && data[columnName]) {
                // For now, use 'en' language, can be made dynamic later
                const template = data[columnName]['en'] || data[columnName]['ar'] || DEFAULT_TEMPLATE;
                setTemplateText(template);
            } else {
                setTemplateText(DEFAULT_TEMPLATE);
            }
        } catch (err) {
            console.error('Failed to load template:', err);
            setTemplateText(DEFAULT_TEMPLATE);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const columnName = `whatsapp_${templateType}_template`;

            // Save as JSONB with language support
            const templateData = {
                en: templateText,
                ar: templateText, // For now, same template for all languages
            };

            const { error } = await supabase
                .from('businesses')
                .update({ [columnName]: templateData })
                .eq('id', salonId);

            if (error) throw error;

            // Show success notification
            alert('تم حفظ القالب بنجاح');
            onClose();
        } catch (err: any) {
            console.error('Failed to save template:', err);
            alert('فشل حفظ القالب. حاول مرة أخرى.');
        } finally {
            setIsSaving(false);
        }
    };

    const copyPlaceholder = (placeholder: string) => {
        navigator.clipboard.writeText(placeholder);
        setCopiedKey(placeholder);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="6xl">
            <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Template Preview</h2>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Template Editor - Left Side */}
                        <div className="lg:col-span-2">
                            <label className="block text-sm font-medium mb-2">
                                Template Text
                            </label>
                            <textarea
                                value={templateText}
                                onChange={(e) => setTemplateText(e.target.value)}
                                className="w-full h-96 p-3 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                                placeholder="Enter your template text..."
                                dir="rtl"
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Use placeholders like {'{{customerName}}'} to insert dynamic data
                            </p>
                        </div>

                        {/* Placeholders List - Right Side */}
                        <div className="border border-border rounded-md p-4 max-h-96 overflow-y-auto">
                            <h3 className="font-semibold mb-3 sticky top-0 bg-white pb-2">
                                Available Placeholders
                            </h3>
                            <div className="space-y-2">
                                {PLACEHOLDERS.map((placeholder) => (
                                    <div
                                        key={placeholder.key}
                                        className="p-2 border border-border rounded hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{placeholder.label}</p>
                                                <p className="text-xs text-muted-foreground">{placeholder.description}</p>
                                                <code className="text-xs bg-gray-100 px-1 py-0.5 rounded mt-1 inline-block">
                                                    {placeholder.key}
                                                </code>
                                            </div>
                                            <button
                                                onClick={() => copyPlaceholder(placeholder.key)}
                                                className="flex-shrink-0 p-1.5 hover:bg-primary hover:text-white rounded transition-colors"
                                                title="Click to copy"
                                            >
                                                {copiedKey === placeholder.key ? (
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                ) : (
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                    <Button
                        onClick={onClose}
                        variant="secondary"
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        variant="primary"
                        isLoading={isSaving}
                    >
                        Save Template
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default TemplateModal;
