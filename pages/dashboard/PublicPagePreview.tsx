import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusiness } from '../../hooks/useBusiness';
import { useLanguage } from '../../hooks/useLanguage';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';

const PublicPagePreview: React.FC = () => {
    const { business, loading } = useBusiness();
    const { t } = useLanguage();
    const navigate = useNavigate();

    // The public booking link uses a hash router, so it's `/#/b/...`
    const publicBookingLink = business?.slug ? `/#/b/${business.slug}` : '';

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!business?.slug) {
        return (
            <div className="text-center p-8">
                <p className="text-muted-foreground">{t('setupBusinessPrompt')}</p>
                <Button onClick={() => navigate('/dashboard/settings/details')}>{t('goToSettingsPrompt')}</Button>
            </div>
        );
    }

    // Use a calculated height to fill a large portion of the viewport without overflowing.
    // The container is styled as a card with a header and the iframe area.
    return (
        <div className="bg-card rounded-lg border border-border shadow-md flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 9rem)' }}>
            <header className="flex-shrink-0 p-3 border-b border-border flex justify-between items-center">
                <h1 className="text-lg font-semibold text-foreground">
                    {t('preview')}: {business.name}
                </h1>
                <div className="flex items-center gap-2">
                    <Button as="a" href={publicBookingLink} target="_blank" rel="noopener noreferrer" variant="ghost" size="sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open in New Tab
                    </Button>
                    <Button onClick={() => navigate(-1)} variant="secondary" size="sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Close Preview
                    </Button>
                </div>
            </header>
            <div className="flex-grow bg-muted/20">
                <iframe
                    src={publicBookingLink}
                    className="w-full h-full border-0"
                    title="Public Page Preview"
                />
            </div>
        </div>
    );
};

export default PublicPagePreview;