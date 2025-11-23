
// FIX: Import useState from React to resolve 'Cannot find name' errors.
import React, { useState, useEffect, useCallback } from 'react';
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
import Modal from '../../components/ui/Modal';
import QRCode from 'qrcode';

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

type ConnectionStatus = 'disconnected' | 'pending' | 'connected' | 'error' | 'loading';

export const Integrations: React.FC = () => {
    const { business, loading: businessLoading, refetch, setBusiness } = useBusiness();
    const { t } = useLanguage();

    // WhatsApp Connection State
    const [whatsappConnectionStatus, setWhatsappConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);

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

    // Check WhatsApp connection status
    const getWhatsAppStatus = useCallback(async () => {
        if (!business) return;
        try {
            const response = await fetch(`${WHATSAPP_BACKEND_URL}/api/whatsapp/status?salon_id=${business.id}`);
            if (!response.ok) throw new Error('Failed to fetch status');
            const data = await response.json();
            setWhatsappConnectionStatus(data.status);
        } catch (err) {
            console.error('Status fetch error:', err);
            setWhatsappConnectionStatus('disconnected');
        }
    }, [business]);

    // Connect WhatsApp
    const connectWhatsApp = async () => {
        if (!business) return;
        setWhatsappConnectionStatus('loading');
        setQrCode(null);
        setIsQrModalOpen(true);

        try {
            const response = await fetch(`${WHATSAPP_BACKEND_URL}/api/whatsapp/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salon_id: business.id }),
            });

            if (!response.ok) throw new Error('Connection failed');

            const data = await response.json();
            if (data.qr) {
                const qrDataUrl = await QRCode.toDataURL(data.qr, { width: 256, margin: 1 });
                setQrCode(qrDataUrl);
                setWhatsappConnectionStatus('pending');
            } else if (data.status === 'connected') {
                setWhatsappConnectionStatus('connected');
                setIsQrModalOpen(false);
            }
        } catch (err: any) {
            console.error('Connect error:', err);
            setWhatsappConnectionStatus('error');
            setIsQrModalOpen(false);
        }
    };

    // Disconnect WhatsApp
    const disconnectWhatsApp = async () => {
        if (!business) return;
        try {
            const response = await fetch(`${WHATSAPP_BACKEND_URL}/api/whatsapp/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salon_id: business.id }),
            });

            if (!response.ok) throw new Error('Disconnect failed');
            setWhatsappConnectionStatus('disconnected');
        } catch (err: any) {
            console.error('Disconnect error:', err);
        }
    };

    // Load WhatsApp status on mount
    useEffect(() => {
        if (business) {
            getWhatsAppStatus();
        }
    }, [business, getWhatsAppStatus]);

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
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-foreground">Automation</h1>
                <p className="text-muted-foreground">Automation</p>
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
                                <h2 className="text-xl font-semibold text-foreground">WhatsApp</h2>
                                <p className="text-sm text-muted-foreground">Send booking messages via your Business Account.</p>
                            </div>
                        </div>

                        {/* Single WhatsApp Card */}
                        <Card className="w-full">
                            <CardContent className="p-6 space-y-6">
                                {/* Connection Status - Horizontal Layout */}
                                {business ? (
                                    <div className="flex items-center gap-4 p-4 border border-border rounded-lg">
                                        {whatsappConnectionStatus === 'connected' ? (
                                            <>
                                                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-base font-semibold text-foreground">WhatsApp Connected</h3>
                                                    <p className="text-sm text-muted-foreground">Your account is active and ready to send automated messages.</p>
                                                </div>
                                                <Button onClick={disconnectWhatsApp} variant="destructive" className="flex-shrink-0">Disconnect</Button>
                                            </>
                                        ) : whatsappConnectionStatus === 'loading' || whatsappConnectionStatus === 'pending' ? (
                                            <>
                                                <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                                                    <Spinner />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-base font-semibold text-foreground">Connecting...</h3>
                                                    <p className="text-sm text-muted-foreground">Please wait while we establish the connection.</p>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-12 h-12 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m-12.728 0a9 9 0 010-12.728m12.728 0L5.636 18.364" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-base font-semibold text-foreground">WhatsApp Disconnected</h3>
                                                    <p className="text-sm text-muted-foreground">Connect your account to enable automated confirmations and reminders.</p>
                                                </div>
                                                <Button onClick={connectWhatsApp} className="flex-shrink-0">Connect Now</Button>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex justify-center items-center h-20"><Spinner /></div>
                                )}

                                {/* Test Message Section */}
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-foreground">Send a Test WhatsApp Message</p>
                                    <form onSubmit={handleSendTestWhatsApp} className="flex gap-2">
                                        <Input
                                            type="tel"
                                            placeholder="+212 6 ********"
                                            value={testWhatsAppNumber}
                                            onChange={e => setTestWhatsAppNumber(e.target.value)}
                                            required
                                            className="flex-grow"
                                        />
                                        <Button type="submit" variant="secondary" isLoading={isSendingWhatsAppTest}>Send test</Button>
                                    </form>
                                    {whatsappStatus && <p className={`text-xs ${whatsappStatus.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>{whatsappStatus.text}</p>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Template Customization Section */}
                    <div className="space-y-4">
                        {/* Template Header */}
                        <div className="flex items-center gap-3">
                            <EmailIcon />
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">Template Customization</h2>
                                <p className="text-sm text-muted-foreground">Configure notification settings for your business</p>
                            </div>
                        </div>

                        {/* Notification Settings Card */}
                        <Card className="w-full">
                            <CardContent className="p-6 space-y-6">
                                {/* Client Notifications */}
                                <div className="space-y-4">
                                    <h3 className="text-base font-semibold text-foreground">Client Notifications</h3>

                                    {/* Send Confirmation Messages */}
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-foreground">Send Confirmation Messages</p>
                                                    <p className="text-xs text-muted-foreground mt-1">Automatically send booking confirmation to clients when they make a reservation</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setOpenModal('confirmation')}
                                                        className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                                                        type="button"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked={clientConfirmationEnabled}
                                                        disabled={isSavingSettings}
                                                        onClick={() => handleToggleChange('clientConfirmationEnabled', !clientConfirmationEnabled)}
                                                        className={`
                                                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                                                            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                                                            ${isSavingSettings ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                                            ${clientConfirmationEnabled ? 'bg-primary' : 'bg-gray-300'}
                                                        `}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${clientConfirmationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Send Reminder Messages */}
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-foreground">Send Reminder Messages</p>
                                                    <p className="text-xs text-muted-foreground mt-1">Send appointment reminders to clients before their scheduled time</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setOpenModal('reminder')}
                                                        className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                                                        type="button"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked={clientReminderEnabled}
                                                        disabled={isSavingSettings}
                                                        onClick={() => handleToggleChange('clientReminderEnabled', !clientReminderEnabled)}
                                                        className={`
                                                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                                                            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                                                            ${isSavingSettings ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                                            ${clientReminderEnabled ? 'bg-primary' : 'bg-gray-300'}
                                                        `}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${clientReminderEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="border-t border-border"></div>

                                {/* Salon Owner Notifications */}
                                <div className="space-y-4">
                                    <h3 className="text-base font-semibold text-foreground">Salon Owner Notifications</h3>

                                    {/* Receive Owner Notifications */}
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-foreground">Receive Owner Notifications</p>
                                                    <p className="text-xs text-muted-foreground mt-1">Get notified when new bookings are made or existing bookings are updated</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setOpenModal('owner')}
                                                        className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                                                        type="button"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked={ownerNotificationEnabled}
                                                        disabled={isSavingSettings}
                                                        onClick={() => handleToggleChange('ownerNotificationEnabled', !ownerNotificationEnabled)}
                                                        className={`
                                                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                                                            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                                                            ${isSavingSettings ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                                            ${ownerNotificationEnabled ? 'bg-primary' : 'bg-gray-300'}
                                                        `}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ownerNotificationEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
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

            {/* WhatsApp QR Code Modal */}
            <Modal
                isOpen={isQrModalOpen}
                onClose={() => setIsQrModalOpen(false)}
                title="Connect WhatsApp"
                footer={<Button variant="ghost" onClick={() => setIsQrModalOpen(false)}>Cancel</Button>}
            >
                <div className="text-center space-y-4">
                    {qrCode ? (
                        <img
                            src={qrCode}
                            alt="WhatsApp QR Code"
                            className="mx-auto p-2 bg-white rounded-lg shadow-md max-w-[256px] w-full"
                        />
                    ) : (
                        <div className="flex justify-center items-center h-48"><Spinner /></div>
                    )}
                    <h3 className="text-base font-semibold">Scan the QR code to sync with WhatsApp</h3>
                    <ol className="text-sm text-muted-foreground text-left list-decimal list-inside space-y-1.5">
                        <li>Open WhatsApp on your phone</li>
                        <li>Tap Menu on Android, or Settings on iPhone</li>
                        <li>Tap Linked devices and then Link a device</li>
                        <li>Point your phone at this screen to capture the QR code</li>
                    </ol>
                </div>
            </Modal>
        </div>
    );
};
