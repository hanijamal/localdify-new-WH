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
مرحباً أليكس،

تم تأكيد حجزكم في الصالون الحديث! تفاصيل الموعد أدناه:

الخدمة: قص وتصفيف شعر الرجال
السعر: 50.00 دولارًا أمريكيًا
التاريخ والوقت: 26 أكتوبر 2024 الساعة 02:30 مساءً
مع: جون
الفرع: فرع وسط المدينة
الموقع: 123 شارع مين، فرع وسط المدينة

لأي استفسار، يرجى التواصل معنا عبر واتساب على الرقم: +15551234567.

نتطلع لرؤيتكم قريباً!`;

const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose, salonId, templateType }) => {
    const [templateText, setTemplateText] = useState(DEFAULT_TEMPLATE);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && salonId) {
            loadTemplate();
        }
    }, [isOpen, salonId, templateType]);

    const loadTemplate = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('notification_templates')
                .select('template_text')
                .eq('salon_id', salonId)
                .eq('type', templateType)
                .single();

            if (error) {
                // If no template exists, use default
                if (error.code === 'PGRST116') {
                    setTemplateText(DEFAULT_TEMPLATE);
                } else {
                    throw error;
                }
            } else if (data) {
                setTemplateText(data.template_text);
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
            const { error } = await supabase
                .from('notification_templates')
                .upsert({
                    salon_id: salonId,
                    type: templateType,
                    template_text: templateText,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'salon_id,type'
                });

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

    return (
        <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
            <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Template Preview</h2>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">
                                Template Text
                            </label>
                            <textarea
                                value={templateText}
                                onChange={(e) => setTemplateText(e.target.value)}
                                className="w-full h-96 p-3 border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Enter your template text..."
                                dir="rtl"
                            />
                        </div>

                        <div className="flex justify-end gap-3">
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
                    </>
                )}
            </div>
        </Modal>
    );
};

export default TemplateModal;
