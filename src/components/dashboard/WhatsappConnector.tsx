
import React, { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import { useLanguage } from '../../hooks/useLanguage';
import Spinner from '../ui/Spinner';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';

const BACKEND_URL = 'https://localdify-whatsapp-backend-service-production.up.railway.app';

interface WhatsappConnectorProps {
    salonId: string;
}

type ConnectionStatus = 'disconnected' | 'pending' | 'connected' | 'error' | 'loading' | 'disconnecting';

const WhatsappConnector: React.FC<WhatsappConnectorProps> = ({ salonId }) => {
    const { t } = useLanguage();
    const [status, setStatus] = useState<ConnectionStatus>('loading');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const isCancellingRef = useRef(false);
    const intervalRef = useRef<number | null>(null);

    // Pairing Code State
    const [modalView, setModalView] = useState<'qr' | 'phoneInput' | 'codeDisplay'>('qr');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [isRequestingCode, setIsRequestingCode] = useState(false);

    const handleFetchError = async (response: Response, defaultMessage: string) => {
        try {
            const errorJson = await response.json();
            return (errorJson as any).error || defaultMessage;
        } catch (e) {
            const errorText = await response.text();
            if (errorText.trim().startsWith('<')) {
                return `${defaultMessage} (Server Error: ${response.status} ${response.statusText})`;
            }
            return errorText || defaultMessage;
        }
    };

    const endSession = useCallback(() => {
        isCancellingRef.current = true;
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setStatus('disconnecting');
        setIsQrModalOpen(false);
        setErrorMessage(null);
        
        // Reset pairing state
        setModalView('qr');
        setPhoneNumber('');
        setPairingCode(null);

        fetch(`${BACKEND_URL}/api/whatsapp/disconnect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ salon_id: salonId }),
        }).catch(e => console.error("Error sending disconnect request:", e))
        .finally(() => {
            setTimeout(() => setStatus('disconnected'), 500);
        });
    }, [salonId]);

    const getStatus = useCallback(async () => {
        if (isConnecting || isCancellingRef.current) return 'loading';

        try {
            const response = await fetch(`${BACKEND_URL}/api/whatsapp/status?salon_id=${salonId}&_t=${Date.now()}`);
            if (!response.ok) {
                const errorMsg = await handleFetchError(response, `Failed to fetch status (${response.status})`);
                throw new Error(errorMsg);
            }
            const data = await response.json();
            
            if (isCancellingRef.current) return 'error';

            if (data.status === 'connected') {
                setStatus('connected');
                setIsQrModalOpen(false);
            } else if (data.qr) {
                if (modalView === 'qr') {
                    const qrDataUrl = await QRCode.toDataURL(data.qr, { width: 256, margin: 1 });
                    setQrCode(qrDataUrl);
                }
                if (status === 'loading' || status === 'pending') {
                    setStatus('pending');
                    setIsQrModalOpen(true); // Open modal if we get a QR
                }
            } else if (data.status === 'loading') {
                setStatus('loading');
            } else if (data.status === 'disconnected') {
                setStatus('disconnected');
                setIsQrModalOpen(false);
            }
            
            return data.status;
        } catch (err: any) {
            console.error('Status fetch error:', err);
            if (!isCancellingRef.current) {
                setStatus('error');
                setErrorMessage(err.message);
            }
            return 'error';
        }
    }, [salonId, isConnecting, status, modalView]);

    const connect = async (force = false) => {
        isCancellingRef.current = false;
        setStatus('loading');
        setIsConnecting(true);
        setQrCode(null);
        setErrorMessage(null);
        setModalView('qr');
        setPairingCode(null);
        
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
            } else if (data.status === 'loading') {
                setStatus('loading');
            } else {
                setStatus('disconnected');
            }
        } catch (err: any) {
            console.error('Connect error:', err);
            setStatus('error');
            setErrorMessage(err.message);
        } finally {
            setIsConnecting(false);
        }
    };
    
    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phoneNumber) return;
        setIsRequestingCode(true);
        setErrorMessage(null);
        
        try {
            const response = await fetch(`${BACKEND_URL}/api/whatsapp/pair-with-phone`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ salon_id: salonId, phone_number: phoneNumber }),
            });

            if (!response.ok) {
                const errorMsg = await handleFetchError(response, 'Failed to get pairing code');
                throw new Error(errorMsg);
            }

            const data = await response.json();
            if (data.success && data.pairingCode) {
                const formatted = data.pairingCode.replace(/(.{4})/, '$1 - ');
                setPairingCode(formatted);
                setModalView('codeDisplay');
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (err: any) {
            setErrorMessage(err.message);
        } finally {
            setIsRequestingCode(false);
        }
    };

    useEffect(() => {
        getStatus();
         // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [salonId]);

    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (!isConnecting && (status === 'pending' || status === 'loading')) {
            intervalRef.current = window.setInterval(async () => {
                if (isCancellingRef.current) {
                    if(intervalRef.current) clearInterval(intervalRef.current);
                    return;
                }
                const currentStatus = await getStatus();
                if (currentStatus === 'connected' || currentStatus === 'disconnected' || currentStatus === 'error') {
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            }, 3000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [status, getStatus, isConnecting]);

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
                        <Button variant="destructive" onClick={endSession}>Disconnect</Button>
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
                        {/* Force true here to prevent zombie sessions */}
                        <Button onClick={() => connect(true)}>Connect Now</Button>
                    </div>
                );
        }
    };
    
    return (
        <>
            {renderMainContent()}

            <Modal
                isOpen={isQrModalOpen}
                onClose={endSession}
                title="Link New Session"
                footer={<Button variant="ghost" onClick={endSession}>Cancel</Button>}
                scrollable
            >
                <div className="p-6 text-center space-y-4">
                    {modalView === 'qr' && (
                        <>
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
                            
                            <button 
                                type="button"
                                onClick={() => setModalView('phoneInput')}
                                className="text-sm text-primary hover:underline font-medium cursor-pointer focus:outline-none"
                            >
                                Link with phone number instead
                            </button>
                        </>
                    )}

                    {modalView === 'phoneInput' && (
                         <form onSubmit={handleRequestCode} className="space-y-4 text-left">
                            <h3 className="text-lg font-semibold text-center">Enter Phone Number</h3>
                            <p className="text-sm text-muted-foreground text-center">
                                Enter your phone number with country code (e.g., +1234567890).
                            </p>
                            <Input 
                                placeholder="+1234567890"
                                value={phoneNumber}
                                onChange={e => setPhoneNumber(e.target.value)}
                                required
                            />
                            {errorMessage && <p className="text-destructive text-sm text-center">{errorMessage}</p>}
                            <div className="flex gap-2 justify-center mt-4">
                                <Button type="button" variant="secondary" onClick={() => setModalView('qr')}>Back to QR</Button>
                                <Button type="submit" isLoading={isRequestingCode}>Get Pairing Code</Button>
                            </div>
                        </form>
                    )}

                    {modalView === 'codeDisplay' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Enter Code on WhatsApp</h3>
                            <p className="text-sm text-muted-foreground">
                                Open WhatsApp on your phone, go to <strong>Linked Devices &gt; Link a Device &gt; Link with phone number</strong> and enter this code:
                            </p>
                            <div className="bg-muted p-4 rounded-lg">
                                <p className="text-3xl font-mono tracking-wider font-bold text-foreground">{pairingCode}</p>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                                <Spinner />
                                <span>Waiting for connection...</span>
                            </div>
                            <Button type="button" variant="secondary" onClick={() => setModalView('phoneInput')}>Try Different Number</Button>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
};

export default WhatsappConnector;
