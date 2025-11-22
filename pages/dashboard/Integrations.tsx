
// FIX: Import useState from React to resolve 'Cannot find name' errors.
import React, { useState, useEffect } from 'react';
import { useBusiness } from '../../hooks/useBusiness';
import Card, { CardContent, CardHeader, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import Input from '../../components/ui/Input';
import Toggle from '../../components/ui/Toggle';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import WhatsappConnector from '../../components/dashboard/WhatsappConnector';
import TemplateModal from '../../components/dashboard/TemplateModal';

// Ensure this URL matches your Railway deployment
const WHATSAPP_BACKEND_URL = 'https://localdify-whatsapp-backend-service-production.up.railway.app';

const WhatsAppIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.06 21.94L7.31 20.58C8.75 21.31 10.36 21.72 12.04 21.72C17.5 21.72 21.95 17.27 21.95 11.81C21.95 6.35 17.5 2 12.04 2ZM12.04 20.13C10.56 20.13 9.12 19.75 7.89 19.05L7.54 18.86L4.42 19.71L5.29 16.69L5.09 16.34C4.31 15.03 3.88 13.51 3.88 11.91C3.88 7.37 7.54 3.61 12.04 3.61C16.54 3.61 20.2 7.37 20.2 11.81C20.2 16.25 16.54 20.13 12.04 20.13ZM17.43 14.22C17.19 14.1 16.1 13.58 15.88 13.5C15.67 13.43 15.51 13.39 15.34 13.64C15.18 13.88 14.78 14.38 14.63 14.54C14.49 14.7 14.34 14.72 14.09 14.6C13.84 14.48 13.04 14.21 12.09 13.38C11.32 12.72 10.78 11.89 10.63 11.64C10.49 11.4 10.6 11.27 10.71 11.16C10.81 11.05 10.95 10.87 11.08 10.73C11.21 10.59 11.25 10.48 11.32 10.32C11.4 10.15 11.35 10.01 11.29 9.9C11.23 9.78 10.74 8.56 10.55 8.11C10.36 7.66 10.17 7.71 10.04 7.7H9.79C9.54 7.7 9.24 7.78 9 8.03C8.76 8.27 8.15 8.84 8.15 10.05C8.15 11.26 9.03 12.42 9.15 12.58C9.27 12.74 11.69 16.24 14.88 17.65C15.58 17.94 16.11 18.09 16.51 18.23C17.13 18.45 17.63 18.41 18.01 18.15C18.43 17.86 18.91 17.3 19.06 16.85C19.22 16.4 19.22 16.01 19.16 15.9C19.1 15.78 18.86 15.66 18.63 15.55C18.4 15.43 17.67 15.34 17.43 14.22Z" />
    </svg>
);

const EmailIcon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" />
    </svg>
);

export const Integrations: React.FC = () => {
    const { business, loading: businessLoading, refetch, setBusiness } = useBusiness();
    const { t } = useLanguage();

    // WhatsApp Test State
    const [testWhatsAppNumber, setTestWhatsAppNumber] = useState('');
    const [isSendingWhatsAppTest, setIsSendingWhatsAppTest] = useState(false);
    const [whatsappStatus, setWhatsappStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Notification Settings State
    const [clientConfirmationEnabled, setClientConfirmationEnabled] = useState(true);
    const [clientReminderEnabled, setClientReminderEnabled] = useState(true);
    const [ownerNotificationEnabled, setOwnerNotificationEnabled] = useState(true);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Template Modal State
    const [openModal, setOpenModal] = useState<'confirmation' | 'reminder' | 'owner' | null>(null);

    const loading = businessLoading;

    // Load notification settings from business data
    useEffect(() => {
        if (business) {
            setClientConfirmationEnabled(business.clientconfirmationenabled !== false);
            setClientReminderEnabled(business.clientreminderenabled !== false);
            setOwnerNotificationEnabled(business.ownernotificationenabled !== false);
            setHasUnsavedChanges(false);
            setSaveStatus(null);
        }
    }, [business]);

    const handleSendTestWhatsApp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!testWhatsAppNumber || !business) return;
        setIsSendingWhatsAppTest(true);
        setWhatsappStatus(null);

        try {
            const response = await fetch(`${WHATSAPP_BACKEND_URL}/api/whatsapp/send-test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    salon_id: business.id,
                    number: testWhatsAppNumber,
                    message: "Hello from localDify! 🎉 Your WhatsApp integration is working correctly."
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to send WhatsApp message');
            }

            setWhatsappStatus({ type: 'success', text: 'WhatsApp test message sent!' });
        } catch (err: any) {
            setWhatsappStatus({ type: 'error', text: err.message || 'Failed to send WhatsApp message.' });
        } finally {
            setIsSendingWhatsAppTest(false);
        }
    };

    const handleToggleChange = (field: 'clientConfirmationEnabled' | 'clientReminderEnabled' | 'ownerNotificationEnabled', value: boolean) => {
        // Just update local state, don't save to database yet
        if (field === 'clientConfirmationEnabled') setClientConfirmationEnabled(value);
        if (field === 'clientReminderEnabled') setClientReminderEnabled(value);
        if (field === 'ownerNotificationEnabled') setOwnerNotificationEnabled(value);

        setHasUnsavedChanges(true);
        setSaveStatus(null);
    };

    const handleSaveSettings = async () => {
        if (!business) return;

        setIsSavingSettings(true);
        setSaveStatus(null);

        try {
            const { error } = await supabase
                .from('businesses')
                .update({
                    clientconfirmationenabled: clientConfirmationEnabled,
                    clientreminderenabled: clientReminderEnabled,
                    ownernotificationenabled: ownerNotificationEnabled
                })
                .eq('id', business.id);

            if (error) throw error;

            // Update business context with optimistic update instead of refetching
            // This prevents race condition that was resetting toggles
            const updatedBusiness = {
                ...business,
                clientconfirmationenabled: clientConfirmationEnabled,
                clientreminderenabled: clientReminderEnabled,
                ownernotificationenabled: ownerNotificationEnabled
            };

            setBusiness(updatedBusiness);

            setHasUnsavedChanges(false);
            setSaveStatus({ type: 'success', text: 'Settings saved successfully!' });
        } catch (err: any) {
            console.error('Failed to update notification settings:', err);
            setSaveStatus({ type: 'error', text: 'Failed to save settings. Please try again.' });
        } finally {
            setIsSavingSettings(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-foreground">{t('automationTitle')}</h1>
                <p className="text-muted-foreground">{t('sidebarAutomation')}</p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-48"><Spinner /></div>
            ) : (
                <div className="space-y-8">
                    {/* WhatsApp Section */}
                    <div className="space-y-4">
                        {/* WhatsApp Header */}
                        <div className="flex items-center gap-3">
                            <WhatsAppIcon />
                            <div>
                                <h2 className="text-xl font-semibold">{t('whatsapp')}</h2>
                                <p className="text-sm text-muted-foreground">{t('whatsappDesc')}</p>
                            </div>
                        </div>

                        {/* Cards Grid - Side by Side */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* CARD 1: Connection Status */}
                            <Card className="w-full">
                                <CardContent className="p-6">
                                    {business ? <WhatsappConnector salonId={business.id} /> : <div className="flex justify-center items-center h-full"><Spinner /></div>}
                                </CardContent>
                            </Card>

                            {/* CARD 2: Test Message Section */}
                            <Card className="w-full">
                                <CardContent className="p-6">
                                    <form onSubmit={handleSendTestWhatsApp} className="space-y-3">
                                        <p className="text-sm font-medium">Send a Test WhatsApp Message</p>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <Input
                                                type="tel"
                                                placeholder="+1234567890"
                                                value={testWhatsAppNumber}
                                                onChange={e => setTestWhatsAppNumber(e.target.value)}
                                                required
                                                className="flex-grow"
                                            />
                                            <Button type="submit" variant="secondary" isLoading={isSendingWhatsAppTest} className="w-full sm:w-auto">Send Test</Button>
                                        </div>
                                        {whatsappStatus && <p className={`text-xs mt-1 ${whatsappStatus.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>{whatsappStatus.text}</p>}
                                    </form>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Template Customization Section */}
                    <div className="space-y-4">
                        {/* Template Header */}
                        <div className="flex items-center gap-3">
                            <EmailIcon />
                            <div>
                                <h2 className="text-xl font-semibold">Template Customization</h2>
                                <p className="text-sm text-muted-foreground">Configure notification settings for your business</p>
                            </div>
                        </div>

                        {/* Notification Settings Card */}
                        <Card className="w-full">
                            <CardContent className="p-6 space-y-6">
                                <div>
                                    <h3 className="text-base font-semibold mb-4">Client Notifications</h3>
                                    <div className="space-y-4">
                                        {/* Confirmation Toggle with Customize Button */}
                                        <div className="space-y-2">
                                            <Toggle
                                                checked={clientConfirmationEnabled}
                                                onChange={(value) => handleToggleChange('clientConfirmationEnabled', value)}
                                                disabled={isSavingSettings}
                                                label="Send Confirmation Messages"
                                                description="Automatically send booking confirmation to clients when they make a reservation"
                                            />
                                            <button
                                                onClick={() => setOpenModal('confirmation')}
                                                className="ml-auto flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                                </svg>
                                                Customize Template
                                            </button>
                                        </div>

                                        {/* Reminder Toggle with Customize Button */}
                                        <div className="space-y-2">
                                            <Toggle
                                                checked={clientReminderEnabled}
                                                onChange={(value) => handleToggleChange('clientReminderEnabled', value)}
                                                disabled={isSavingSettings}
                                                label="Send Reminder Messages"
                                                description="Send appointment reminders to clients before their scheduled time"
                                            />
                                            <button
                                                onClick={() => setOpenModal('reminder')}
                                                className="ml-auto flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                                </svg>
                                                Customize Template
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-border"></div>

                                {/* Salon Owner Notifications */}
                                <div>
                                    <h3 className="text-base font-semibold mb-4">Salon Owner Notifications</h3>
                                    <div className="space-y-2">
                                        <Toggle
                                            checked={ownerNotificationEnabled}
                                            onChange={(value) => handleToggleChange('ownerNotificationEnabled', value)}
                                            disabled={isSavingSettings}
                                            label="Receive Owner Notifications"
                                            description="Get notified when new bookings are made or existing bookings are updated"
                                        />
                                        <button
                                            onClick={() => setOpenModal('owner')}
                                            className="ml-auto flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                            </svg>
                                            Customize Template
                                        </button>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-border"></div>

                                {/* Save Button and Status */}
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        {saveStatus && (
                                            <p className={`text-sm ${saveStatus.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                                                {saveStatus.text}
                                            </p>
                                        )}
                                        {hasUnsavedChanges && !saveStatus && (
                                            <p className="text-sm text-muted-foreground">
                                                You have unsaved changes
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        onClick={handleSaveSettings}
                                        variant="primary"
                                        isLoading={isSavingSettings}
                                        disabled={!hasUnsavedChanges}
                                    >
                                        Save Changes
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Template Modals */}
            {business && (
                <>
                    <TemplateModal
                        isOpen={openModal === 'confirmation'}
                        onClose={() => setOpenModal(null)}
                        salonId={business.id}
                        templateType="confirmation"
                    />
                    <TemplateModal
                        isOpen={openModal === 'reminder'}
                        onClose={() => setOpenModal(null)}
                        salonId={business.id}
                        templateType="reminder"
                    />
                    <TemplateModal
                        isOpen={openModal === 'owner'}
                        onClose={() => setOpenModal(null)}
                        salonId={business.id}
                        templateType="owner"
                    />
                </>
            )}
        </div>
    );
};
