import React, { useState, useEffect, useRef } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { supabase } from '../../supabaseClient';

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    salonId: string;
    templateType: 'confirmation' | 'reminder' | 'owner';
}

const DEFAULT_TEMPLATE = `مرحباً {{customerName}}،

تم تأكيد حجزكم في {{businessName}}! 

الخدمة: {{serviceName}}
السعر: {{servicePrice}}
التاريخ: {{bookingDate}} 
الوقت: {{bookingTime}}
مع: {{staffName}}

الفرع: {{locationName}}
الموقع: {{locationAddress}}

للتواصل: {{businessPhone}}

نتطلع لرؤيتكم! 💚`;

const PLACEHOLDERS = [
    { key: '{{customerName}}', label: 'Customer Name', example: 'أحمد محمد' },
    { key: '{{customerEmail}}', label: 'Customer Email', example: 'ahmed@example.com' },
    { key: '{{customerPhone}}', label: 'Customer Phone', example: '+966501234567' },
    { key: '{{serviceName}}', label: 'Service Name', example: 'قص شعر' },
    { key: '{{servicePrice}}', label: 'Service Price', example: '50 ريال' },
    { key: '{{bookingDate}}', label: 'Booking Date', example: '2024-12-25' },
    { key: '{{bookingTime}}', label: 'Booking Time', example: '14:00' },
    { key: '{{staffName}}', label: 'Staff Name', example: 'محمد علي' },
    { key: '{{locationName}}', label: 'Location Name', example: 'الفرع الرئيسي' },
    { key: '{{locationAddress}}', label: 'Location Address', example: 'شارع الملك فهد، الرياض' },
    { key: '{{businessName}}', label: 'Business Name', example: 'صالون النجوم' },
    { key: '{{businessPhone}}', label: 'Business Phone', example: '+966501234567' },
];

const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose, salonId, templateType }) => {
    const [templateText, setTemplateText] = useState(DEFAULT_TEMPLATE);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

            const templateData = {
                en: templateText,
                ar: templateText,
            };

            const { error } = await supabase
                .from('businesses')
                .update({ [columnName]: templateData })
                .eq('id', salonId);

            if (error) throw error;

            alert('✅ تم حفظ القالب بنجاح');
            onClose();
        } catch (err: any) {
            console.error('Failed to save template:', err);
            alert('❌ فشل حفظ القالب. حاول مرة أخرى.');
        } finally {
            setIsSaving(false);
        }
    };

    const insertPlaceholder = (placeholder: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = templateText;
        const before = text.substring(0, start);
        const after = text.substring(end);

        const newText = before + placeholder + after;
        setTemplateText(newText);

        // Set cursor position after inserted placeholder
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
        }, 0);
    };

    // Generate live preview by replacing placeholders with example data
    const generatePreview = () => {
        let preview = templateText;
        PLACEHOLDERS.forEach(({ key, example }) => {
            preview = preview.replaceAll(key, example);
        });
        return preview;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} widthClass="max-w-5xl" scrollable={true}>
            <div className="p-6">
                <h2 className="text-2xl font-bold mb-6 text-foreground">Customize Template</h2>

                {isLoading ? (
                    <div className="flex justify-center items-center h-96">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* LEFT SIDE - Template Editor + Tags */}
                        <div className="space-y-4">
                            {/* Template Text Fieldset */}
                            <fieldset className="border border-border rounded-lg p-4">
                                <legend className="text-sm font-semibold text-foreground px-2">Template Text</legend>
                                <textarea
                                    ref={textareaRef}
                                    value={templateText}
                                    onChange={(e) => setTemplateText(e.target.value)}
                                    className="w-full h-48 p-3 border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm bg-background text-foreground"
                                    placeholder="Enter template text here..."
                                    dir="auto"
                                />
                            </fieldset>

                            {/* Tags Fieldset */}
                            <fieldset className="border border-border rounded-lg p-4">
                                <legend className="text-sm font-semibold text-foreground px-2">Tags - Click to Insert</legend>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                    {PLACEHOLDERS.map((placeholder) => (
                                        <button
                                            key={placeholder.key}
                                            onClick={() => insertPlaceholder(placeholder.key)}
                                            className="px-3 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground border border-border rounded-md text-xs font-medium transition-colors"
                                            title={`${placeholder.label} - Example: ${placeholder.example}`}
                                        >
                                            {placeholder.label}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                        </div>

                        {/* RIGHT SIDE - Live Phone Preview */}
                        <div className="flex flex-col">
                            <label className="text-sm font-semibold mb-3 text-foreground text-center">
                                Live Preview
                            </label>

                            {/* Phone Mockup */}
                            <div className="flex-1 flex items-center justify-center">
                                <div className="relative w-72 h-[500px]">
                                    {/* Phone Frame */}
                                    <div className="absolute inset-0 border-[14px] border-gray-800 rounded-[3rem] shadow-2xl bg-white">
                                        {/* Notch */}
                                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-2xl"></div>

                                        {/* Screen Content */}
                                        <div className="h-full w-full overflow-hidden rounded-[2.2rem] bg-[#e5ddd5] p-3 pt-8">
                                            {/* WhatsApp Message Bubble */}
                                            <div className="flex justify-start">
                                                <div className="bg-white rounded-lg rounded-tl-none p-3 max-w-[85%] shadow-sm">
                                                    <pre className="text-xs whitespace-pre-wrap font-sans text-gray-800" style={{ fontFamily: 'inherit' }}>
                                                        {generatePreview()}
                                                    </pre>
                                                    <div className="text-[10px] text-gray-500 mt-1 text-right">
                                                        {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Home Indicator */}
                                    <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gray-700 rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-border">
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
                        Save Changes
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default TemplateModal;
