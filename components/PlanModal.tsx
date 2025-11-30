import React, { useState, useEffect } from 'react';
import { Plan } from '../types';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import { useAdmin } from '../hooks/useAdmin';
import { useLanguage } from '../hooks/useLanguage';

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
}

const PlanModal: React.FC<PlanModalProps> = ({ isOpen, onClose, plan }) => {
    const { addPlan, updatePlan } = useAdmin();
    const { t } = useLanguage();

    const [name, setName] = useState('');
    const [price, setPrice] = useState('0');
    const [staffLimit, setStaffLimit] = useState('1');
    const [servicesLimit, setServicesLimit] = useState('5');
    const [locationsLimit, setLocationsLimit] = useState('1');
    const [emailQuota, setEmailQuota] = useState('300');
    const [whatsappQuota, setWhatsappQuota] = useState('0');
    const [isActive, setIsActive] = useState(true);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const isEditMode = !!plan;

    useEffect(() => {
        if (isOpen) {
            if (isEditMode) {
                setName(plan.name);
                setPrice(String(plan.price));
                setStaffLimit(String(plan.staff_limit));
                setServicesLimit(String(plan.services_limit));
                setLocationsLimit(String(plan.locations_limit));
                setEmailQuota(String(plan.email_quota));
                setWhatsappQuota(String(plan.whatsapp_quota));
                setIsActive(plan.is_active);
            } else {
                setName('');
                setPrice('0');
                setStaffLimit('1');
                setServicesLimit('5');
                setLocationsLimit('1');
                setEmailQuota('300');
                setWhatsappQuota('0');
                setIsActive(true);
            }
            setError('');
        }
    }, [plan, isOpen, isEditMode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const planData: Partial<Plan> = {
                name,
                price: parseFloat(price),
                staff_limit: parseInt(staffLimit, 10),
                services_limit: parseInt(servicesLimit, 10),
                locations_limit: parseInt(locationsLimit, 10),
                email_quota: parseInt(emailQuota, 10),
                whatsapp_quota: parseInt(whatsappQuota, 10),
                is_active: isActive,
            };

            if (isEditMode) {
                await updatePlan(plan!.id, planData);
            } else {
                await addPlan(planData);
            }
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? t('editPlan') : t('addPlan')} widthClass="max-w-2xl">
            <style>{`.toggle-checkbox{appearance:none;width:3rem;height:1.5rem;background-color:var(--muted);border-radius:9999px;position:relative;cursor:pointer;transition:background-color .2s ease-in-out}.toggle-checkbox::before{content:'';position:absolute;width:1.25rem;height:1.25rem;border-radius:9999px;background-color:#fff;top:.125rem;left:.125rem;transition:transform .2s ease-in-out}.toggle-checkbox:checked{background-color:var(--primary)}.toggle-checkbox:checked::before{transform:translateX(1.5rem)}`}</style>
            <form onSubmit={handleSubmit}>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label={t('planName')} value={name} onChange={e => setName(e.target.value)} required />
                    <Input label={t('pricePerMonth')} type="number" value={price} onChange={e => setPrice(e.target.value)} required min="0" step="0.01" />
                    <Input label={t('staffLimit')} type="number" value={staffLimit} onChange={e => setStaffLimit(e.target.value)} required min="0" />
                    <Input label={t('servicesLimit')} type="number" value={servicesLimit} onChange={e => setServicesLimit(e.target.value)} required min="0" />
                    <Input label={t('locationsLimit')} type="number" value={locationsLimit} onChange={e => setLocationsLimit(e.target.value)} required min="0" />
                    <Input label={t('emailQuota')} type="number" value={emailQuota} onChange={e => setEmailQuota(e.target.value)} required min="0" />
                    <Input label={t('whatsappQuota')} type="number" value={whatsappQuota} onChange={e => setWhatsappQuota(e.target.value)} required min="0" />
                    <div className="flex items-center space-x-3 pt-4">
                        <input
                            type="checkbox"
                            id="plan-active"
                            className="toggle-checkbox"
                            checked={isActive}
                            onChange={(e) => setIsActive(e.target.checked)}
                        />
                        <label htmlFor="plan-active" className="text-sm font-medium text-foreground">
                            {isActive ? t('planActive') : t('planInactive')}
                        </label>
                    </div>
                    {error && <p className="md:col-span-2 text-sm text-destructive text-center">{error}</p>}
                </div>
                <div className="p-4 bg-muted/50 border-t flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>{t('cancelButton')}</Button>
                    <Button type="submit" isLoading={isSubmitting}>{isEditMode ? t('saveChangesButton') : t('addPlan')}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default PlanModal;
