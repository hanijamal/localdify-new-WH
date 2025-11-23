import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Spinner from '../components/ui/Spinner';
import Home from './Home';

/**
 * CustomDomainRouter
 * 
 * This component detects if the user is accessing the site via a custom domain
 * (e.g., book.salonname.com) and redirects them to the appropriate business booking page.
 * 
 * How it works:
 * 1. Checks the current hostname
 * 2. Queries the database for a business with that custom domain
 * 3. Redirects to /b/{businessSlug} if found
 * 4. Shows normal Home page if no custom domain
 */
const CustomDomainRouter: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [businessSlug, setBusinessSlug] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCustomDomain, setIsCustomDomain] = useState(false);

    useEffect(() => {
        const checkCustomDomain = async () => {
            try {
                const hostname = window.location.hostname;

                // Skip if on localhost or the main domain - show normal home page
                if (hostname === 'localhost' ||
                    hostname.includes('127.0.0.1') ||
                    hostname.includes('localdify')) {
                    setLoading(false);
                    return;
                }

                // This is potentially a custom domain
                setIsCustomDomain(true);

                // Query database for business with this custom domain
                const { data, error } = await supabase
                    .from('businesses')
                    .select('slug')
                    .eq('custom_domain', hostname)
                    .single();

                if (error) {
                    console.error('Custom domain lookup error:', error);
                    setError('Domain not found');
                    setLoading(false);
                    return;
                }

                if (data) {
                    setBusinessSlug(data.slug);
                }

                setLoading(false);
            } catch (err) {
                console.error('Custom domain check failed:', err);
                setError('Failed to load');
                setLoading(false);
            }
        };

        checkCustomDomain();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Spinner />
            </div>
        );
    }

    if (error && isCustomDomain) {
        return (
            <div className="flex flex-col items-center justify-center h-screen space-y-4">
                <h1 className="text-2xl font-bold text-destructive">Domain Not Configured</h1>
                <p className="text-muted-foreground">This domain is not properly configured.</p>
                <p className="text-sm text-muted-foreground">Please check your DNS settings and try again.</p>
            </div>
        );
    }

    if (businessSlug) {
        // Redirect to the business booking page
        return <Navigate to={`/b/${businessSlug}`} replace />;
    }

    // If no custom domain found, show the normal home page
    return <Home />;
};

export default CustomDomainRouter;
