import React, { useState, useEffect } from 'react';
import { useBusiness } from '../../hooks/useBusiness';
import { createOrUpdateBusiness, getTemplates } from '../../services/supabaseService';
import { Template } from '../../types';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';

const Templates: React.FC = () => {
    const { user } = useAuth();
    const { business, loading: businessLoading, refetch } = useBusiness();
    const { t } = useLanguage();
    
    const [templates, setTemplates] = useState<Template[]>([]);
    const [templatesLoading, setTemplatesLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        const fetchTemplates = async () => {
            setTemplatesLoading(true);
            try {
                const data = await getTemplates();
                setTemplates(data);
            } catch (error: any) {
                console.error("Failed to fetch templates:", error.message);
                setStatusMessage(t('templateError', { error: error.message }));
            } finally {
                setTemplatesLoading(false);
            }
        };
        fetchTemplates();
    }, [t]);

    const handleApplyTemplate = async (template: Template) => {
        if (!business || !user) return;
        setIsSaving(true);
        setStatusMessage('');
        try {
            await createOrUpdateBusiness({ 
                id: business.id,
                userId: user.id,
                htmlContent: template.htmlContent,
                cssContent: template.cssContent
            });
            await refetch();
            setStatusMessage(t('templateAppliedSuccess', { templateName: template.name }));
            setTimeout(() => {
                setStatusMessage('');
            }, 3000);
        } catch (error: any) {
            console.error("Failed to save template:", error);
            setStatusMessage(t('templateAppliedError', { error: error.message }));
        } finally {
            setIsSaving(false);
        }
    };

    const loading = businessLoading || templatesLoading;

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    }

    if (!business && !businessLoading) {
        return (
            <div className="text-center p-8">
                <h2 className="text-xl font-semibold">{t('setupRequired')}</h2>
                <p className="text-muted-foreground mt-2">{t('setupBusinessForTemplate')}</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">{t('manageTemplate')}</h1>
                    <p className="text-muted-foreground">{t('manageTemplateDesc')}</p>
                </div>
                 {statusMessage && <p className={`text-sm ${statusMessage.includes('successfully') ? 'text-green-600 dark:text-green-500' : 'text-destructive'} transition-opacity duration-300`}>{statusMessage}</p>}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {templates.map(template => {
                    const isSelected = business?.htmlContent === template.htmlContent && business?.cssContent === template.cssContent;
                    return (
                        <Card key={template.id} className={`overflow-hidden transition-all duration-300 ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                            <div className="flex flex-col h-full">
                                <div className="flex-shrink-0">
                                    <img 
                                        src={template.imageUrl || ''} 
                                        alt={template.name} 
                                        className="w-full h-48 object-cover" 
                                    />
                                </div>
                                <div className="flex-1 flex flex-col justify-between p-4 sm:p-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-card-foreground">{template.name}</h3>
                                        <p className="text-sm text-muted-foreground mt-2">{template.description}</p>
                                    </div>
                                    <div className="mt-6 text-right">
                                        <Button 
                                            onClick={() => handleApplyTemplate(template)}
                                            isLoading={isSaving}
                                            disabled={isSaving}
                                            className="w-full sm:w-auto"
                                            variant={isSelected ? 'secondary' : 'primary'}
                                        >
                                            {isSelected ? t('reapplyTheme') : t('applyTheme')}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default Templates;