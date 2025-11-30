
import React, { useState, useEffect } from 'react';
import Card, { CardContent, CardHeader, CardFooter } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { getSystemSetting, updateSystemSetting } from '../../services/supabaseService';
import { Template, RegistrationCounterSetting } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { useAdmin } from '../../hooks/useAdmin';
import Dropdown, { DropdownItem } from '../../components/ui/Dropdown';
import TemplateModal from '../../components/TemplateModal';
import { supabase } from '../../supabaseClient';
import LanguageCodeSelector from '../../components/ui/LanguageCodeSelector';


const AdminSettings: React.FC = () => {
    const { t } = useLanguage();
    const { templates, loading: adminLoading, deleteTemplate } = useAdmin();
    
    // Brevo states
    const [brevoApiKey, setBrevoApiKey] = useState('');
    const [brevoSenderName, setBrevoSenderName] = useState('');
    const [brevoSenderEmail, setBrevoSenderEmail] = useState('');
    const [isSavingEmail, setIsSavingEmail] = useState(false);

    // WhatsApp states
    const [whatsappToken, setWhatsappToken] = useState('');
    const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
    const [whatsappAccountId, setWhatsappAccountId] = useState('');
    const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false);
    const [isTestingWhatsapp, setIsTestingWhatsapp] = useState(false);
    const [testWhatsappStatus, setTestWhatsappStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [testWhatsappMessage, setTestWhatsappMessage] = useState('');
    const [testRecipient, setTestRecipient] = useState('');
    
    // WhatsApp Template states
    const [confEn, setConfEn] = useState({ name: '', code: 'en_US' });
    const [confAr, setConfAr] = useState({ name: '', code: 'ar' });
    const [confFr, setConfFr] = useState({ name: '', code: 'fr' });
    const [remEn, setRemEn] = useState({ name: '', code: 'en_US' });
    const [remAr, setRemAr] = useState({ name: '', code: 'ar' });
    const [remFr, setRemFr] = useState({ name: '', code: 'fr' });
    const [isSavingWhatsappTemplates, setIsSavingWhatsappTemplates] = useState(false);


    // Registration Counter states
    const [counterSettings, setCounterSettings] = useState<Partial<RegistrationCounterSetting>>({ enabled: false, message: '🎉 {{current}} out of {{total}} salons have registered!', current: 37, total: 50 });
    const [isSavingCounter, setIsSavingCounter] = useState(false);

    // Template states
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

    // Video Tutorial State
    const [dashboardVideoUrl, setDashboardVideoUrl] = useState('');
    const [isSavingVideoUrl, setIsSavingVideoUrl] = useState(false);

    // General states
    const [configLoading, setConfigLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState<{ id: string, type: 'success' | 'error', text: string } | null>(null);

    const loading = adminLoading || configLoading;

    useEffect(() => {
        const fetchSettings = async () => {
            setConfigLoading(true);
            try {
                const [
                    apiKeySetting, 
                    senderNameSetting, 
                    senderEmailSetting,
                    whatsappTokenSetting,
                    whatsappPhoneIdSetting,
                    whatsappAccountIdSetting,
                    counterEnabledSetting,
                    counterMessageSetting,
                    counterCurrentSetting,
                    counterTotalSetting,
                    videoUrlSetting,
                    confEnSetting,
                    confArSetting,
                    confFrSetting,
                    remEnSetting,
                    remArSetting,
                    remFrSetting
                ] = await Promise.all([
                    getSystemSetting<string>('brevo_api_key'),
                    getSystemSetting<string>('brevo_sender_name'),
                    getSystemSetting<string>('brevo_sender_email'),
                    getSystemSetting<string>('whatsapp_access_token'),
                    getSystemSetting<string>('whatsapp_phone_number_id'),
                    getSystemSetting<string>('whatsapp_business_account_id'),
                    getSystemSetting<boolean>('registration_counter_enabled'),
                    getSystemSetting<string>('registration_counter_message'),
                    getSystemSetting<number>('registration_counter_current'),
                    getSystemSetting<number>('registration_counter_total'),
                    getSystemSetting<string>('dashboard_video_url'),
                    getSystemSetting<{ name: string, code: string }>('whatsapp_template_confirmation_en'),
                    getSystemSetting<{ name: string, code: string }>('whatsapp_template_confirmation_ar'),
                    getSystemSetting<{ name: string, code: string }>('whatsapp_template_confirmation_fr'),
                    getSystemSetting<{ name: string, code: string }>('whatsapp_template_reminder_en'),
                    getSystemSetting<{ name: string, code: string }>('whatsapp_template_reminder_ar'),
                    getSystemSetting<{ name: string, code: string }>('whatsapp_template_reminder_fr'),
                ]);

                
                if (apiKeySetting && apiKeySetting.value !== 'null') setBrevoApiKey(apiKeySetting.value);
                if (senderNameSetting && senderNameSetting.value !== 'null') setBrevoSenderName(senderNameSetting.value);
                if (senderEmailSetting && senderEmailSetting.value !== 'null') setBrevoSenderEmail(senderEmailSetting.value);

                if (whatsappTokenSetting && whatsappTokenSetting.value !== 'null') setWhatsappToken(whatsappTokenSetting.value);
                if (whatsappPhoneIdSetting && whatsappPhoneIdSetting.value !== 'null') setWhatsappPhoneId(whatsappPhoneIdSetting.value);
                if (whatsappAccountIdSetting && whatsappAccountIdSetting.value !== 'null') setWhatsappAccountId(whatsappAccountIdSetting.value);
                
                if (confEnSetting?.value) setConfEn(confEnSetting.value);
                if (confArSetting?.value) setConfAr(confArSetting.value);
                if (confFrSetting?.value) setConfFr(confFrSetting.value);
                if (remEnSetting?.value) setRemEn(remEnSetting.value);
                if (remArSetting?.value) setRemAr(remArSetting.value);
                if (remFrSetting?.value) setRemFr(remFrSetting.value);

                setCounterSettings(prev => ({
                    ...prev,
                    enabled: counterEnabledSetting?.value ?? prev.enabled,
                    message: counterMessageSetting?.value ?? prev.message,
                    current: counterCurrentSetting?.value ?? prev.current,
                    total: counterTotalSetting?.value ?? prev.total,
                }));

                const urlValue = videoUrlSetting?.value;
                if (urlValue && typeof urlValue === 'string' && urlValue !== 'null') {
                    setDashboardVideoUrl(urlValue);
                } else {
                    setDashboardVideoUrl('');
                }

            } catch (error: any) {
                console.error("Failed to fetch system settings:", error.message);
                setStatusMessage({ id: 'fetch', type: 'error', text: 'Could not load system settings.' });
            } finally {
                setConfigLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSaveEmailSettings = async () => {
        setIsSavingEmail(true);
        setStatusMessage(null);
        try {
            if (!brevoApiKey || !brevoSenderEmail || !brevoSenderName) {
                throw new Error("All email fields are required.");
            }
            await Promise.all([
                updateSystemSetting<string>('brevo_api_key', brevoApiKey),
                updateSystemSetting<string>('brevo_sender_name', brevoSenderName),
                updateSystemSetting<string>('brevo_sender_email', brevoSenderEmail),
            ]);
            setStatusMessage({ id: 'email', type: 'success', text: 'Email settings updated successfully!' });
        } catch (error: any) {
            setStatusMessage({ id: 'email', type: 'error', text: error.message });
        } finally {
            setIsSavingEmail(false);
        }
    };

    const handleSaveWhatsappSettings = async () => {
        setIsSavingWhatsapp(true);
        setStatusMessage(null);
        try {
             if (!whatsappToken || (!whatsappPhoneId && !whatsappAccountId)) {
                throw new Error("WhatsApp Access Token and either a Phone Number ID or Business Account ID are required.");
            }
            await Promise.all([
                updateSystemSetting<string>('whatsapp_access_token', whatsappToken),
                updateSystemSetting<string>('whatsapp_phone_number_id', whatsappPhoneId),
                updateSystemSetting<string>('whatsapp_business_account_id', whatsappAccountId),
            ]);
            setStatusMessage({ id: 'whatsapp', type: 'success', text: 'WhatsApp settings updated successfully!' });
        } catch (error: any) {
            setStatusMessage({ id: 'whatsapp', type: 'error', text: error.message });
        } finally {
            setIsSavingWhatsapp(false);
        }
    };

    const handleSendTestWhatsapp = async () => {
        if (!testRecipient) return;
        setIsTestingWhatsapp(true);
        setTestWhatsappStatus('idle');
        setTestWhatsappMessage('');
        try {
            const { data, error } = await supabase.functions.invoke('test-whatsapp-message', {
                body: { to: testRecipient }
            });
    
            if (error) throw error; 
            if (data.error) throw new Error(data.error);

            setTestWhatsappStatus('success');
            setTestWhatsappMessage(`Test message successfully sent to ${testRecipient}. Please check the device.`);
            
        } catch (err: any) {
            setTestWhatsappStatus('error');
            const errorMessage = err.context?.error || err.message || 'An unknown error occurred.';
            setTestWhatsappMessage(errorMessage);
        } finally {
            setIsTestingWhatsapp(false);
        }
    };
    
    const handleSaveWhatsappTemplates = async () => {
        setIsSavingWhatsappTemplates(true);
        setStatusMessage(null);
        try {
            await Promise.all([
                updateSystemSetting('whatsapp_template_confirmation_en', confEn),
                updateSystemSetting('whatsapp_template_confirmation_ar', confAr),
                updateSystemSetting('whatsapp_template_confirmation_fr', confFr),
                updateSystemSetting('whatsapp_template_reminder_en', remEn),
                updateSystemSetting('whatsapp_template_reminder_ar', remAr),
                updateSystemSetting('whatsapp_template_reminder_fr', remFr),
            ]);
            setStatusMessage({ id: 'whatsappTemplates', type: 'success', text: 'WhatsApp templates updated successfully!' });
        } catch (error: any) {
            setStatusMessage({ id: 'whatsappTemplates', type: 'error', text: error.message });
        } finally {
            setIsSavingWhatsappTemplates(false);
        }
    };

    const handleSaveCounter = async () => {
        setIsSavingCounter(true);
        setStatusMessage(null);
        try {
            await Promise.all([
                updateSystemSetting('registration_counter_enabled', counterSettings.enabled ?? false),
                updateSystemSetting('registration_counter_message', counterSettings.message),
                updateSystemSetting('registration_counter_current', counterSettings.current),
                updateSystemSetting('registration_counter_total', counterSettings.total),
            ]);
            setStatusMessage({ id: 'counter', type: 'success', text: 'Counter settings updated!' });
        } catch (error: any) {
            setStatusMessage({ id: 'counter', type: 'error', text: error.message });
        } finally {
            setIsSavingCounter(false);
        }
    };

    const handleSaveVideoUrl = async () => {
        setIsSavingVideoUrl(true);
        setStatusMessage(null);
        try {
            const trimmedUrl = dashboardVideoUrl.trim();
            await updateSystemSetting('dashboard_video_url', trimmedUrl);
            setDashboardVideoUrl(trimmedUrl);
            setStatusMessage({ id: 'video', type: 'success', text: 'Video URL updated successfully!' });
        } catch (error: any) {
            setStatusMessage({ id: 'video', type: 'error', text: error.message });
        } finally {
            setIsSavingVideoUrl(false);
        }
    };

    const handleAddTemplate = () => {
        setEditingTemplate(null);
        setIsTemplateModalOpen(true);
    };

    const handleEditTemplate = (template: Template) => {
        setEditingTemplate(template);
        setIsTemplateModalOpen(true);
    };

    const handleDeleteTemplate = async (templateId: string) => {
        if (window.confirm(t('deleteTemplateConfirm'))) {
            try {
                await deleteTemplate(templateId);
            } catch (err: any) {
                setStatusMessage({ id: 'template', type: 'error', text: t('templateError', { error: err.message }) });
            }
        }
    };

    return (
        <>
        <div className="space-y-6">
            <style>{`.toggle-checkbox{appearance:none;width:3rem;height:1.5rem;background-color:var(--muted);border-radius:9999px;position:relative;cursor:pointer;transition:background-color .2s ease-in-out}.toggle-checkbox::before{content:'';position:absolute;width:1.25rem;height:1.25rem;border-radius:9999px;background-color:#fff;top:.125rem;left:.125rem;transition:transform .2s ease-in-out}.toggle-checkbox:checked{background-color:var(--primary)}.toggle-checkbox:checked::before{transform:translateX(1.5rem)}`}</style>
            <h1 className="text-3xl font-bold text-foreground">{t('systemSettings')}</h1>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-semibold">{t('templateManagement')}</h2>
                            <p className="text-sm text-muted-foreground">{t('templateManagementDesc')}</p>
                        </div>
                        <Button onClick={handleAddTemplate}>{t('addTemplate')}</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-24"><Spinner /></div>
                    ) : (
                        <div className="space-y-3">
                            {templates.length > 0 ? templates.map(template => (
                                <div key={template.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <img src={template.imageUrl || `https://ui-avatars.com/api/?name=${template.name}&background=EAE6E1&color=413F3D`} alt={template.name} className="w-16 h-10 object-cover rounded-md" />
                                        <div>
                                            <p className="font-semibold text-foreground">{template.name}</p>
                                            <p className="text-xs text-muted-foreground">{template.description}</p>
                                        </div>
                                    </div>
                                    <Dropdown
                                        trigger={
                                            <Button variant="ghost" className="p-2 h-auto">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                                            </Button>
                                        }
                                    >
                                        <DropdownItem onClick={() => handleEditTemplate(template)}>{t('editAction')}</DropdownItem>
                                        <DropdownItem onClick={() => handleDeleteTemplate(template.id)} className="text-destructive hover:bg-destructive/10">{t('deleteAction')}</DropdownItem>
                                    </Dropdown>
                                </div>
                            )) : <p className="text-center text-muted-foreground py-4">{t('noTemplatesFound')}</p>}
                        </div>
                    )}
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <h2 className="text-xl font-semibold">Registration Counter</h2>
                    <p className="text-sm text-muted-foreground">Display a promotional counter on the public registration page.</p>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-24"><Spinner /></div>
                    ) : (
                        <div className="space-y-4 max-w-lg">
                             <div className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    id="counter-enabled"
                                    className="toggle-checkbox"
                                    checked={counterSettings.enabled}
                                    onChange={(e) => setCounterSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                                />
                                <label htmlFor="counter-enabled" className="text-sm font-medium text-foreground">
                                    Enable Registration Counter
                                </label>
                            </div>
                            <Input
                                label="Message Template"
                                value={counterSettings.message}
                                onChange={(e) => setCounterSettings(prev => ({ ...prev, message: e.target.value }))}
                                helperText="Use {{current}} and {{total}} as placeholders."
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Current Count" type="number" value={counterSettings.current} onChange={(e) => setCounterSettings(prev => ({ ...prev, current: Number(e.target.value) }))} />
                                <Input label="Total Count" type="number" value={counterSettings.total} onChange={(e) => setCounterSettings(prev => ({ ...prev, total: Number(e.target.value) }))} />
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="justify-between items-center">
                     {statusMessage && statusMessage.id === 'counter' && ( <p className={`text-sm ${statusMessage.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>{statusMessage.text}</p>)}
                    <div className="flex-grow"></div>
                    <Button onClick={handleSaveCounter} isLoading={isSavingCounter} disabled={loading}>
                        Save Counter Settings
                    </Button>
                </CardFooter>
             </Card>

             <Card>
                <CardHeader>
                    <h2 className="text-xl font-semibold">Dashboard Video Tutorial</h2>
                    <p className="text-sm text-muted-foreground">Set the video link that appears for users on their dashboard.</p>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-24"><Spinner /></div>
                    ) : (
                        <Input
                            label="Video URL"
                            value={dashboardVideoUrl}
                            onChange={(e) => setDashboardVideoUrl(e.target.value)}
                            placeholder="https://www.youtube.com/embed/..."
                            helperText="Use an embeddable video link (e.g., from YouTube or Vimeo)."
                        />
                    )}
                </CardContent>
                <CardFooter className="justify-between items-center">
                    {statusMessage && statusMessage.id === 'video' && ( <p className={`text-sm ${statusMessage.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>{statusMessage.text}</p>)}
                    <div className="flex-grow"></div>
                    <Button onClick={handleSaveVideoUrl} isLoading={isSavingVideoUrl} disabled={loading}>
                        Save Video URL
                    </Button>
                </CardFooter>
            </Card>

             <Card>
                <CardHeader>
                    <h2 className="text-xl font-semibold">{t('brevoSettings')}</h2>
                    <p className="text-sm text-muted-foreground">{t('brevoSettingsDesc')}</p>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-24"><Spinner /></div>
                    ) : (
                        <div className="space-y-4 max-w-lg">
                            <Input
                                label={t('brevoApiKeyLabel')}
                                type="password"
                                value={brevoApiKey}
                                onChange={(e) => setBrevoApiKey(e.target.value)}
                                placeholder={t('brevoApiKeyPlaceholder')}
                            />
                            <Input
                                label={t('senderNameLabel')}
                                value={brevoSenderName}
                                onChange={(e) => setBrevoSenderName(e.target.value)}
                                placeholder={t('senderNamePlaceholder')}
                                helperText={t('senderNameHelper')}
                            />
                            <Input
                                label={t('senderEmailLabel')}
                                type="email"
                                value={brevoSenderEmail}
                                onChange={(e) => setBrevoSenderEmail(e.target.value)}
                                placeholder={t('senderEmailPlaceholder')}
                                helperText={t('senderEmailHelper')}
                            />
                        </div>
                    )}
                </CardContent>
                <CardFooter className="justify-between items-center">
                    {statusMessage && statusMessage.id === 'email' && (
                        <p className={`text-sm ${statusMessage.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                            {statusMessage.text}
                        </p>
                    )}
                    <div className="flex-grow"></div>
                    <Button onClick={handleSaveEmailSettings} isLoading={isSavingEmail} disabled={loading}>
                        {t('saveEmailSettings')}
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <h2 className="text-xl font-semibold">WhatsApp Integration (Platform-wide)</h2>
                    <p className="text-sm text-muted-foreground">Configure WhatsApp API for sending messages on behalf of all businesses.</p>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-24"><Spinner /></div>
                    ) : (
                        <div className="space-y-4 max-w-lg">
                            <Input
                                label="WhatsApp Access Token"
                                type="password"
                                value={whatsappToken}
                                onChange={(e) => setWhatsappToken(e.target.value)}
                                placeholder="Begins with EAA..."
                                required
                                helperText="A long-lived token from Meta App -> WhatsApp -> API Setup. Expires every ~60 days."
                            />
                            <Input
                                label="WhatsApp Business Account ID (Recommended)"
                                value={whatsappAccountId}
                                onChange={(e) => setWhatsappAccountId(e.target.value)}
                                placeholder="e.g., 9876543210"
                                required
                                helperText="Found in Meta Business Settings -> WhatsApp Accounts. We'll use this to find your Phone Number ID automatically."
                            />
                             <Input
                                label="WhatsApp Phone Number ID (Fallback)"
                                value={whatsappPhoneId}
                                onChange={(e) => setWhatsappPhoneId(e.target.value)}
                                placeholder="e.g., 1029384756"
                                helperText="Leave blank if using Business Account ID. Found in Meta App -> WhatsApp -> API Setup."
                            />
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex-col items-stretch gap-4">
                     <div className="flex justify-end items-center gap-2">
                         {statusMessage && statusMessage.id === 'whatsapp' && (
                            <p className={`text-sm ${statusMessage.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                                {statusMessage.text}
                            </p>
                        )}
                        <div className="flex-grow"></div>
                        <Button onClick={handleSaveWhatsappSettings} isLoading={isSavingWhatsapp} disabled={loading}>
                            Save WhatsApp Settings
                        </Button>
                    </div>
                    <div className="border-t border-border pt-4">
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Send a Test Message</p>
                            <p className="text-xs text-muted-foreground">This will send the standard "hello_world" template to verify your credentials.</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Input type="tel" placeholder="Recipient WhatsApp Number" value={testRecipient} onChange={e => setTestRecipient(e.target.value)} required className="flex-grow" helperText="Include country code, e.g., +15551234567"/>
                                <Button type="button" variant="secondary" isLoading={isTestingWhatsapp} onClick={handleSendTestWhatsapp} disabled={!whatsappToken || (!whatsappPhoneId && !whatsappAccountId)} className="w-full sm:w-auto">Send Test</Button>
                            </div>
                            {testWhatsappStatus !== 'idle' && (
                                <div className={`mt-2 p-2 text-xs rounded-md ${testWhatsappStatus === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {testWhatsappMessage}
                                </div>
                            )}
                        </div>
                    </div>
                </CardFooter>
            </Card>

             <Card>
                <CardHeader>
                    <h2 className="text-xl font-semibold">Manage WhatsApp Templates</h2>
                    <p className="text-sm text-muted-foreground">Enter the exact names and language codes of your approved Meta templates. These will be used globally for all users.</p>
                </CardHeader>
                <CardContent>
                    {loading ? (
                         <div className="flex justify-center items-center h-24"><Spinner /></div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-medium text-foreground mb-2">Confirmation Templates</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                        <Input label="English Template Name" value={confEn.name} onChange={e => setConfEn(p => ({...p, name: e.target.value}))} />
                                        <LanguageCodeSelector label="Language Code" value={confEn.code} onChange={code => setConfEn(p => ({...p, code}))} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                        <Input label="Arabic Template Name" value={confAr.name} onChange={e => setConfAr(p => ({...p, name: e.target.value}))} />
                                        <LanguageCodeSelector label="Language Code" value={confAr.code} onChange={code => setConfAr(p => ({...p, code}))} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                        <Input label="French Template Name" value={confFr.name} onChange={e => setConfFr(p => ({...p, name: e.target.value}))} />
                                        <LanguageCodeSelector label="Language Code" value={confFr.code} onChange={code => setConfFr(p => ({...p, code}))} />
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-border pt-6">
                                <h3 className="font-medium text-foreground mb-2">Reminder Templates</h3>
                                 <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                        <Input label="English Template Name" value={remEn.name} onChange={e => setRemEn(p => ({...p, name: e.target.value}))} />
                                        <LanguageCodeSelector label="Language Code" value={remEn.code} onChange={code => setRemEn(p => ({...p, code}))} />
                                    </div>
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                        <Input label="Arabic Template Name" value={remAr.name} onChange={e => setRemAr(p => ({...p, name: e.target.value}))} />
                                        <LanguageCodeSelector label="Language Code" value={remAr.code} onChange={code => setRemAr(p => ({...p, code}))} />
                                    </div>
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                        <Input label="French Template Name" value={remFr.name} onChange={e => setRemFr(p => ({...p, name: e.target.value}))} />
                                        <LanguageCodeSelector label="Language Code" value={remFr.code} onChange={code => setRemFr(p => ({...p, code}))} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="justify-between items-center">
                    {statusMessage && statusMessage.id === 'whatsappTemplates' && (
                        <p className={`text-sm ${statusMessage.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                            {statusMessage.text}
                        </p>
                    )}
                    <div className="flex-grow"></div>
                    <Button onClick={handleSaveWhatsappTemplates} isLoading={isSavingWhatsappTemplates} disabled={loading}>
                        Save WhatsApp Templates
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <h2 className="text-xl font-semibold">{t('paymentIntegrations')}</h2>
                    <p className="text-sm text-muted-foreground">{t('paymentIntegrationsDesc')}</p>
                </CardHeader>
                <CardContent>
                    <div className="p-4 bg-muted/50 rounded-lg border border-border">
                        <h3 className="font-semibold text-foreground">{t('paypalConfig')}</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            {t('paypalConfigDesc1')}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                           {t('paypalConfigDesc2')}
                        </p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button disabled={true}>
                        {t('configureInSupabase')}
                    </Button>
                </CardFooter>
            </Card>
        </div>
        <TemplateModal
            isOpen={isTemplateModalOpen}
            onClose={() => setIsTemplateModalOpen(false)}
            template={editingTemplate}
        />
        </>
    );
};

export default AdminSettings;
