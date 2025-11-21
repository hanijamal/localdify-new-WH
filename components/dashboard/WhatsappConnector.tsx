
import React, { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import { useLanguage } from '../../hooks/useLanguage';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';

// Re-instated the absolute URL to the backend. The relative path approach
// caused 404 errors as the hosting environment does not support proxying.
const BACKEND_URL = 'https://localdify-whatsapp-backend-service-production.up.railway.app';

interface WhatsappConnectorProps {
    salonId: string;
}

type ConnectionStatus = 'disconnected' | 'pending' | 'connected' | 'error' | 'loading' | 'disconnecting';

const WhatsappConnector: React.FC<WhatsappConnectorProps> = ({ salonId }) => {
    const { t } = useLanguage();
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [checkingStatus, setCheckingStatus] = useState(false); // Changed from true to false for instant UI
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [pairingError, setPairingError] = useState<string | null>(null);
    const [isPairing, setIsPairing] = useState(false);
    const intervalRef = useRef<number | null>(null);

    // Generic error handler for fetch responses
    const handleFetchError = async (response: Response, defaultMessage: string) => {
        try {
            const errorJson = await response.json();
            return (errorJson as any).error || defaultMessage;
        } catch (e) {
            const errorText = await response.text();
            // If the body is HTML (like a 404 page), don't show the whole page.
            if (errorText.trim().startsWith('<')) {
                return `${defaultMessage} (${response.status} ${response.statusText})`;
            }
            return errorText || defaultMessage;
        }
    };


    const getStatus = useCallback(async () => {
        if (BACKEND_URL.includes('YOUR_BACKEND_URL_HERE')) {
            setStatus('error');
            setErrorMessage('Backend URL is not configured. Please update the WhatsappConnector.tsx file.');
            setCheckingStatus(false);
            return 'error';
        }

        try {
            // Add timeout to prevent hanging
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

            const response = await fetch(`${BACKEND_URL}/api/whatsapp/status?salon_id=${salonId}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorMsg = await handleFetchError(response, `Failed to fetch status (${response.status})`);
                throw new Error(errorMsg);
            }
            const data = await response.json();
            setStatus(data.status);
            setCheckingStatus(false);
            return data.status;
        } catch (err: any) {
            console.error('Status fetch error:', err);
            // On error, assume disconnected instead of showing error
            if (err.name === 'AbortError') {
                setStatus('disconnected');
            } else {
                setStatus('disconnected'); // Optimistic: assume disconnected on error
            }
            setCheckingStatus(false);
            return 'disconnected';
        }
    }, [salonId]); // Removed 'status' dependency to prevent infinite loops


    const connect = async (force = false) => {
        if (BACKEND_URL.includes('YOUR_BACKEND_URL_HERE')) {
            setStatus('error');
            setErrorMessage('Backend URL is not configured. Please update the WhatsappConnector.tsx file.');
            return;
        }
        setStatus('loading');
        setQrCode(null);
        setErrorMessage(null);
        try {
            const response = await fetch(`${BACKEND_URL}/api/whatsapp/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salon_id: salonId, force_reconnect: force }),
            });

            if (!response.ok) {
                const errorMsg = await handleFetchError(response, `Connection failed (${response.status})`);
                throw new Error(errorMsg);
            }

            const data = await response.json();
            if (data.qr) {
                const qrDataUrl = await QRCode.toDataURL(data.qr, { width: 256, margin: 1 });
                setQrCode(qrDataUrl);
                setStatus('pending');
                setIsQrModalOpen(true);
            } else if (data.status === 'connected') {
                setStatus('connected');
            } else {
                await getStatus();
            }
        } catch (err: any) {
            console.error('Connect error:', err);
            setStatus('error');
            setErrorMessage(err.message);
        }
    };

    const disconnect = async () => {
        setStatus('disconnecting');
        setErrorMessage(null);
        setIsQrModalOpen(false);

        try {
            const response = await fetch(`${BACKEND_URL}/api/whatsapp/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salon_id: salonId }),
            });

            if (!response.ok) {
                const errorMsg = await handleFetchError(response, `Disconnect failed (${response.status})`);
                throw new Error(errorMsg);
            }
            // Assume success and set status directly. The backend will clean up.
            setStatus('disconnected');

        } catch (err: any) {
            console.error('Disconnect error:', err);
            setStatus('error');
            setErrorMessage(err.message);
        }
    };

    useEffect(() => {
        // Only show checking status briefly on initial load
        setCheckingStatus(true);
        getStatus().finally(() => setCheckingStatus(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [salonId]);

    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (status === 'pending') {
            intervalRef.current = window.setInterval(async () => {
                const currentStatus = await getStatus();
                if (currentStatus !== 'pending') {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    intervalRef.current = null;
                    setQrCode(null);
                    setIsQrModalOpen(false);
                }
            }, 5000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [status, getStatus]);

    const handleLinkWithPhoneNumber = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        setPairingError(null);
        setPairingCode(null);
        setPhoneNumber('');
        setIsPhoneModalOpen(true);
    };

    const requestPairing = async () => {
        if (!phoneNumber.trim()) {
            setPairingError('Enter a phone number');
            return;
        }

        setIsPairing(true);
        setPairingError(null);
        setPairingCode(null);
        try {
            const response = await fetch(`${BACKEND_URL}/api/whatsapp/pair-number`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salonId, salon_id: salonId, phoneNumber }),
            });

            if (!response.ok) {
                const errorMsg = await handleFetchError(response, `Pairing failed (${response.status})`);
                throw new Error(errorMsg);
            }

            const data = await response.json();
            setPairingCode(data.pairingCode || data.pairing_code || null);
        } catch (err: any) {
            console.error('Pairing error:', err);
            setPairingError(err.message);
        } finally {
            setIsPairing(false);
        }
    };

    const renderMainContent = () => {
        switch (status) {
            case 'loading':
            case 'pending':
                return <div className="flex flex-col items-center justify-center p-8"><Spinner /><p className="mt-2 text-sm text-muted-foreground">Connecting...</p></div>;
            case 'disconnecting':
                return <div className="flex flex-col items-center justify-center p-8"><Spinner /><p className="mt-2 text-sm text-muted-foreground">Disconnecting...</p></div>;
            case 'connected':
                return (
                    <div className="text-center p-8 space-y-3">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-lg font-semibold">WhatsApp Connected</h3>
                        <p className="text-sm text-muted-foreground">Your account is active and ready to send automated messages.</p>
                        <Button variant="destructive" onClick={disconnect}>Disconnect</Button>
                    </div>
                );
            case 'error':
                return (
                    <div className="text-center p-8 space-y-4">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="text-lg font-semibold text-destructive">Connection Error</h3>
                        <p className="text-sm text-muted-foreground">{errorMessage || 'An unknown error occurred.'}</p>
                        <Button onClick={() => connect(true)}>Try Again</Button>
                    </div>
                );

            case 'disconnected':
            default:
                return (
                    <div className="text-center p-8 space-y-3">
                        <div className="w-16 h-16 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636a9 9 0 010 12.728m-12.728 0a9 9 0 010-12.728m12.728 0L5.636 18.364" /></svg>
                        </div>
                        <h3 className="text-lg font-semibold">WhatsApp Disconnected</h3>
                        <p className="text-sm text-muted-foreground">Connect your account to enable automated confirmations and reminders.</p>
                        <div className="flex flex-col items-center space-y-2">
                            <Button onClick={() => connect(false)}>Connect Now</Button>
                            {checkingStatus && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Spinner size="sm" />
                                    <span>Checking status…</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
        }
    };

    return (
        <>
            {renderMainContent()}

            <Modal
                isOpen={isQrModalOpen}
                onClose={() => setIsQrModalOpen(false)}
                title="Link New Session"
                footer={<Button variant="ghost" onClick={() => setIsQrModalOpen(false)}>Cancel</Button>}
            >
                <div className="p-6 text-center space-y-4">
                    {qrCode ? (
                        <img src={qrCode} alt="WhatsApp QR Code" className="mx-auto p-2 bg-white rounded-lg shadow-md" />
                    ) : (
                        <div className="flex justify-center items-center h-64"><Spinner /></div>
                    )}
                    <h3 className="text-lg font-semibold">Scan the QR code to sync with WhatsApp</h3>
                    <ol className="text-sm text-muted-foreground text-left list-decimal list-inside space-y-2">
                        <li>Open WhatsApp on your phone</li>
                        <li>Tap Menu on Android, or Settings on iPhone</li>
                        <li>Tap Linked devices and then Link a device</li>
                        <li>Point your phone at this screen to capture the QR code</li>
                    </ol>
                    <a href="#" className="text-sm text-primary hover:underline" onClick={handleLinkWithPhoneNumber}>
                        Link with phone number
                    </a>
                </div>
            </Modal>

            <Modal
                isOpen={isPhoneModalOpen}
                onClose={() => setIsPhoneModalOpen(false)}
                title="Link with phone number"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setIsPhoneModalOpen(false)}>Close</Button>
                        <Button onClick={requestPairing} disabled={isPairing}>
                            {isPairing ? 'Requesting...' : 'Request pairing code'}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <Input
                        label="Phone number"
                        placeholder="e.g. +447912345678"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                    />
                    {pairingError && <p className="text-sm text-destructive">{pairingError}</p>}
                    {isPairing && !pairingCode && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size="sm" /> <span>Generating code...</span></div>}
                    {pairingCode && (
                        <div className="p-4 bg-muted rounded-lg text-center space-y-2">
                            <p className="text-sm text-muted-foreground">Enter this code on your phone:</p>
                            <p className="text-2xl font-semibold tracking-widest">{pairingCode}</p>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
};

export default WhatsappConnector;