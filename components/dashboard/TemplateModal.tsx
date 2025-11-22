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
        <Modal isOpen={isOpen} onClose={onClose} widthClass="max-w-7xl">
            <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">Customize Template</h2>

                {isLoading ? (
                    <div className="flex justify-center items-center h-96">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* LEFT SIDE - Template Editor + Tags */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2">
                                    Template Text
                                </label>
                                <textarea
                                    ref={textareaRef}
                                    value={templateText}
                                    onChange={(e) => setTemplateText(e.target.value)}
                                    className="w-full h-64 p-4 border-2 border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                    placeholder="أدخل نص القالب هنا..."
                                    dir="rtl"
                                />
                            </div>

                            {/* Clickable Placeholder Tags */}
                            <div>
                                <label className="block text-sm font-semibold mb-3">
                                    Tags - Click to Insert
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {PLACEHOLDERS.map((placeholder) => (
                                        <button
                                            key={placeholder.key}
                                            onClick={() => insertPlaceholder(placeholder.key)}
                                            className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-md text-xs font-medium transition-colors"
                                            title={placeholder.label}
                                        >
                                            {placeholder.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT SIDE - Live WhatsApp Preview */}
                        <div>
                            <label className="block text-sm font-semibold mb-3">
                                Live Preview
                            </label>
                            <div className="bg-[#0a1014] rounded-lg p-4 h-[400px] flex flex-col">
                                {/* WhatsApp-style header */}
                                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700">
                                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                                        J
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-white font-semibold text-sm">صالون النجوم</div>
                                        <div className="text-green-400 text-xs">online now</div>
                                    </div>
                                </div>

                                {/* Chat message bubble */}
                                <div className="flex-1 overflow-y-auto">
                                    <div className="flex justify-end mb-2">
                                        <div className="bg-[#005c4b] text-white rounded-lg p-3 max-w-[85%] shadow-md">
                                            <pre className="text-sm whitespace-pre-wrap font-sans" dir="rtl" style={{ fontFamily: 'inherit' }}>
                                                {generatePreview()}
                                            </pre>
                                            <div className="text-xs text-gray-300 mt-2 text-left">
                                                {new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-xs text-gray-400 text-center mt-2">
                                    Preview with example data
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
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
