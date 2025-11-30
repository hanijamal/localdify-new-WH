
import React, { useState, useEffect } from 'react';
import { Plan, User } from '../types';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import Select from './ui/Select';
import { useAdmin } from '../hooks/useAdmin';
import { useLanguage } from '../hooks/useLanguage';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  plans: Plan[];
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, user, plans }) => {
  const { addUser, updateUser } = useAdmin();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'business_owner' | 'admin'>('business_owner');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'trialing' | 'active' | 'inactive'>('trialing');
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>('');
  const [trialEndsAt, setTrialEndsAt] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = !!user;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        setName(user.name);
        setEmail(user.email);
        setRole(user.role);
        setSubscriptionStatus(user.subscriptionStatus);
        setSubscriptionPlan(user.subscriptionPlan || '');
        setTrialEndsAt(user.trialEndsAt ? user.trialEndsAt.split('T')[0] : '');
      } else {
        // Reset form for "Add" mode
        setName('');
        setEmail('');
        setPassword('');
        setRole('business_owner');
        setSubscriptionStatus('trialing');
        setSubscriptionPlan('Standard');
        const in14Days = new Date();
        in14Days.setDate(in14Days.getDate() + 14);
        setTrialEndsAt(in14Days.toISOString().split('T')[0]);
      }
      setError('');
      setIsSubmitting(false);
    }
  }, [user, isOpen, isEditMode]);

  const setTrialDays = (days: number) => {
    const newEndDate = new Date();
    newEndDate.setDate(newEndDate.getDate() + days);
    setTrialEndsAt(newEndDate.toISOString().split('T')[0]);
    // If extending the trial, ensure the status is 'trialing'.
    setSubscriptionStatus('trialing');
  };
  
  const handleEndTrialNow = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setTrialEndsAt(yesterday.toISOString().split('T')[0]);
    setSubscriptionStatus('inactive');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (isEditMode) {
        // Handle update
        const updates: Partial<User> = {
            name: name !== user.name ? name : undefined,
            role: role !== user.role ? role : undefined,
            subscriptionStatus: subscriptionStatus !== user.subscriptionStatus ? subscriptionStatus : undefined,
            subscriptionPlan: subscriptionPlan !== (user.subscriptionPlan || null) ? (subscriptionPlan || null) : undefined,
            trialEndsAt: trialEndsAt !== (user.trialEndsAt ? user.trialEndsAt.split('T')[0] : '') ? (trialEndsAt ? new Date(trialEndsAt).toISOString() : null) : undefined,
        };
        
        // Remove undefined properties before sending
        Object.keys(updates).forEach(key => updates[key as keyof User] === undefined && delete updates[key as keyof User]);

        if (Object.keys(updates).length > 0) {
            await updateUser(user.id, updates);
        }
      } else {
        // Handle create
        if (!password || password.length < 6) {
            throw new Error(t('passwordLengthError'));
        }
        await addUser({ 
            name, 
            email, 
            password, 
            role, 
            subscriptionStatus,
            subscriptionPlan: subscriptionPlan || null,
            trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
        });
      }
      onClose(); // Close modal on success
    } catch (err: any) {
      const errorMessage = err.context?.error || err.message || 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? t('editUserTitle') : t('addUserTitle')} widthClass="max-w-3xl" scrollable>
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                    label={t('fullNameLabel')} 
                    id="user-name"
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                />
                <Input 
                    label={t('emailAddressLabel')} 
                    id="user-email"
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                    disabled={isEditMode}
                />
                {!isEditMode && (
                    <Input
                        label={t('passwordLabel')}
                        id="user-password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        helperText={t('passwordHelper')}
                    />
                )}
                <Select 
                    label={t('roleLabel')} 
                    id="user-role"
                    value={role} 
                    onChange={e => setRole(e.target.value as 'business_owner' | 'admin')}
                >
                    <option value="business_owner">{t('roleOwner')}</option>
                    <option value="admin">{t('roleAdmin')}</option>
                </Select>
                <Select 
                    label={t('subscriptionStatusLabel')} 
                    id="user-subscription-status"
                    value={subscriptionStatus} 
                    onChange={e => setSubscriptionStatus(e.target.value as any)}
                >
                    <option value="trialing">{t('trialingBadge')}</option>
                    <option value="active">{t('activeBadge')}</option>
                    <option value="inactive">{t('inactiveBadge')}</option>
                </Select>

                <Select 
                    label={t('subscriptionPlanLabel')}
                    id="user-subscription-plan"
                    value={subscriptionPlan || ''} 
                    onChange={e => setSubscriptionPlan(e.target.value as any)}
                >
                    <option value="">None</option>
                    {plans && plans.map(plan => (
                        <option key={plan.id} value={plan.name}>{plan.name}</option>
                    ))}
                </Select>

                <div>
                    <Input
                        label={t('trialEndsAtLabel')}
                        id="user-trial-ends"
                        type="date"
                        value={trialEndsAt}
                        onChange={e => setTrialEndsAt(e.target.value)}
                    />
                    <div className="flex items-center gap-2 mt-2">
                        <Button type="button" variant="secondary" className="text-xs py-1 px-2 h-auto" onClick={() => setTrialDays(7)}>{t('extendTrial7')}</Button>
                        <Button type="button" variant="secondary" className="text-xs py-1 px-2 h-auto" onClick={() => setTrialDays(14)}>{t('extendTrial14')}</Button>
                        <Button type="button" variant="secondary" className="text-xs py-1 px-2 h-auto" onClick={() => setTrialDays(30)}>{t('extendTrial30')}</Button>
                        {isEditMode && (
                            <Button type="button" variant="destructive" className="text-xs py-1 px-2 h-auto ml-auto" onClick={handleEndTrialNow}>{t('endTrialNow')}</Button>
                        )}
                    </div>
                </div>
            </div>
            
            {error && <p className="md:col-span-2 text-sm text-destructive text-center">{error}</p>}
        </div>
        <div className="p-4 sm:p-6 bg-muted/50 border-t border-border text-right flex justify-end items-center space-x-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>{t('cancelButton')}</Button>
          <Button type="submit" isLoading={isSubmitting}>{isEditMode ? t('saveChangesButton') : t('createUserButton')}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default UserModal;
