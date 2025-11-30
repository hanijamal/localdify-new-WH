
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import { useLanguage } from '../hooks/useLanguage';
import { supabase } from '../supabaseClient';

const ProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    const { user, updateUserProfile, updateUserPassword, logout } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    
    // Profile details state
    const [name, setName] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
    
    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

    // Delete account state
    const [isDeleteConfirmationVisible, setIsDeleteConfirmationVisible] = useState(false);
    const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    // Consolidated feedback state
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string, context: 'profile' | 'password' | 'delete' } | null>(null);

    useEffect(() => {
        if (user) {
            setName(user.name);
            setImagePreview(user.imageUrl || null);
        }
        // Reset all states on modal open/close
        setImageFile(null);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setFeedback(null);
        setIsDeleteConfirmationVisible(false);
        setDeleteConfirmationText('');
        setIsDeleting(false);
    }, [user, isOpen]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFeedback(null);
            if (file.type !== 'image/jpeg') {
                setFeedback({ type: 'error', message: 'Only JPG images are allowed.', context: 'profile' });
                return;
            }
            if (file.size > 100 * 1024) { // 100KB
                setFeedback({ type: 'error', message: 'Image must be under 100KB.', context: 'profile' });
                return;
            }
            
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        setIsSubmittingProfile(true);
        setFeedback(null);

        try {
            const updates: { name: string; imageUrl?: string | null } = { name };
            
            if (imageFile) {
                updates.imageUrl = imagePreview as string;
            } else if (!imagePreview && user.imageUrl) {
                updates.imageUrl = null;
            }
            
            await updateUserProfile(updates);
            setFeedback({ type: 'success', message: "Profile updated successfully!", context: 'profile' });
            setImageFile(null);
        } catch (err: any) {
            setFeedback({ type: 'error', message: err.message || "Failed to update profile.", context: 'profile' });
        } finally {
            setIsSubmittingProfile(false);
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFeedback(null);

        if (newPassword !== confirmPassword) {
            setFeedback({ type: 'error', message: t('passwordsDoNotMatchError'), context: 'password' });
            return;
        }
        if (newPassword.length < 6) {
            setFeedback({ type: 'error', message: t('passwordLengthError'), context: 'password' });
            return;
        }
        
        setIsSubmittingPassword(true);
        try {
            await updateUserPassword(currentPassword, newPassword);
            setFeedback({ type: 'success', message: t('passwordUpdatedSuccess').split('!')[0] + '!', context: 'password' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setFeedback({ type: 'error', message: err.message || "Failed to change password.", context: 'password' });
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmationText !== 'DELETE') {
            setFeedback({ type: 'error', message: "Please type DELETE to confirm.", context: 'delete' });
            return;
        }
        setIsDeleting(true);
        setFeedback(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error("Authentication error: No active session found. Please log in again.");
            }
            
            const { data, error } = await supabase.functions.invoke('delete-user-account', {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            if (error) {
                // Catches network errors, CORS issues, or function crashes (e.g., timeout)
                throw error;
            }

            if (data?.error) {
                // Catches business logic errors returned from the function
                throw new Error(data.error);
            }
            
            await logout();
            navigate('/login', { state: { message: t('accountDeletedSuccess') }, replace: true });
            onClose();

        } catch (err: any) {
            console.error("Account deletion failed:", err);
            // Prioritize specific error message from function response, then fallback to generic message.
            let friendlyMessage = err.context?.error || err.message || "An unexpected error occurred. Please try again or contact support.";
            
            // Handle specific client-side error types for better UX
            if (err.message && err.message.toLowerCase().includes('function timed out')) {
                friendlyMessage = "The process took too long and timed out. This can happen if you have a lot of data. Please try again.";
            }
            
            setFeedback({ type: 'error', message: friendlyMessage, context: 'delete' });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('editProfile')} widthClass="max-w-xl" scrollable>
            <div className="p-6 space-y-8">
                {/* Profile Details Form */}
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <h3 className="text-lg font-semibold border-b border-border pb-2">{t('profileInformation')}</h3>
                    {feedback?.context === 'profile' && (
                        <p className={`text-sm text-center ${feedback.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>{feedback.message}</p>
                    )}
                    <div className="flex items-center space-x-4">
                        <img 
                            src={imagePreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=random`}
                            alt="Profile"
                            className="w-20 h-20 rounded-full object-cover"
                        />
                        <div className="flex-grow space-y-2">
                            <Input
                                id="profile-image"
                                type="file"
                                accept="image/jpeg"
                                onChange={handleImageChange}
                                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                                helperText={t('imageUploadHelper')}
                            />
                             {imagePreview && (
                                <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                        setImagePreview(null);
                                        setImageFile(null);
                                    }}
                                    className="w-full"
                                >
                                    {t('removePhoto')}
                                </Button>
                            )}
                        </div>
                    </div>
                    <Input
                        id="name"
                        label={t('fullNameLabel')}
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <div className="text-right">
                        <Button type="submit" isLoading={isSubmittingProfile}>{t('saveProfile')}</Button>
                    </div>
                </form>

                {/* Password Change Form */}
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <h3 className="text-lg font-semibold border-b border-border pb-2">{t('changePassword')}</h3>
                    {feedback?.context === 'password' && (
                        <p className={`text-sm text-center ${feedback.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>{feedback.message}</p>
                    )}
                    <Input
                        id="current-password"
                        label={t('currentPasswordLabel')}
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                     <Input
                        id="new-password"
                        label={t('newPasswordLabel')}
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                    />
                     <Input
                        id="confirm-password"
                        label={t('confirmNewPasswordLabel')}
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                    />
                    <div className="text-right">
                        <Button type="submit" isLoading={isSubmittingPassword}>{t('changePassword')}</Button>
                    </div>
                </form>

                {/* Danger Zone */}
                <div className="pt-8 border-t border-destructive/20">
                    <h3 className="text-lg font-semibold text-destructive">{t('dangerZone')}</h3>
                    {!isDeleteConfirmationVisible ? (
                        <div className="mt-4 p-4 border border-destructive/30 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                            <div>
                                <p className="font-medium">{t('deleteAccountTitle')}</p>
                                <p className="text-sm text-muted-foreground">{t('deleteAccountWarning')}</p>
                            </div>
                            <Button variant="destructive" onClick={() => { setIsDeleteConfirmationVisible(true); setFeedback(null); }} className="flex-shrink-0">
                                {t('deleteAccountButton')}
                            </Button>
                        </div>
                    ) : (
                        <div className="mt-4 p-4 border border-destructive/30 rounded-lg space-y-4 animate-fade-in">
                            <h4 className="font-bold">{t('areYouSure')}</h4>
                            <p className="text-sm text-muted-foreground">{t('deleteConfirmationText')}</p>
                            <Input
                                label={t('typeDeleteToConfirm')}
                                value={deleteConfirmationText}
                                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                                placeholder="DELETE"
                                className="border-destructive/50 focus:ring-destructive"
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setIsDeleteConfirmationVisible(false)} disabled={isDeleting}>
                                    {t('cancelButton')}
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleDeleteAccount}
                                    isLoading={isDeleting}
                                    disabled={deleteConfirmationText !== 'DELETE'}
                                >
                                    {t('confirmDeletionButton')}
                                </Button>
                            </div>
                            {feedback?.context === 'delete' && feedback.type === 'error' && (
                                <p className="text-sm text-destructive text-center pt-2">{feedback.message}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default ProfileModal;
