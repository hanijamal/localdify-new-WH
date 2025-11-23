import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import Card, { CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

/**
 * CustomDomainTester
 * 
 * A testing page to verify custom domain functionality without DNS configuration
 */
const CustomDomainTester: React.FC = () => {
    const [testDomain, setTestDomain] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const testDomainLookup = async () => {
        if (!testDomain) return;

        setLoading(true);
        setResult(null);

        try {
            const { data, error } = await supabase
                .from('businesses')
                .select('id, name, slug, custom_domain')
                .eq('custom_domain', testDomain)
                .single();

            if (error) {
                setResult({
                    success: false,
                    message: 'Domain not found in database',
                    error: error.message
                });
            } else {
                setResult({
                    success: true,
                    message: 'Domain found! ✅',
                    data: data,
                    redirectUrl: `${window.location.origin}/#/b/${data.slug}`
                });
            }
        } catch (err: any) {
            setResult({
                success: false,
                message: 'Error during lookup',
                error: err.message
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <h1 className="text-2xl font-bold text-foreground">Custom Domain Tester</h1>
                        <p className="text-sm text-muted-foreground mt-2">
                            Test if your custom domain is properly saved in the database
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <Input
                                label="Enter Domain to Test"
                                placeholder="crochetex.com"
                                value={testDomain}
                                onChange={(e) => setTestDomain(e.target.value)}
                                helperText="Enter the exact domain you saved in Settings"
                            />
                        </div>

                        <Button
                            onClick={testDomainLookup}
                            isLoading={loading}
                            className="w-full"
                        >
                            Test Domain Lookup
                        </Button>

                        {result && (
                            <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <h3 className={`font-semibold mb-2 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                                    {result.message}
                                </h3>

                                {result.success && result.data && (
                                    <div className="space-y-2 text-sm">
                                        <p className="text-gray-700">
                                            <span className="font-semibold">Business Name:</span> {result.data.name}
                                        </p>
                                        <p className="text-gray-700">
                                            <span className="font-semibold">Slug:</span> {result.data.slug}
                                        </p>
                                        <p className="text-gray-700">
                                            <span className="font-semibold">Custom Domain:</span> {result.data.custom_domain}
                                        </p>
                                        <p className="text-gray-700">
                                            <span className="font-semibold">Would redirect to:</span>{' '}
                                            <a
                                                href={result.redirectUrl}
                                                className="text-blue-600 hover:underline"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {result.redirectUrl}
                                            </a>
                                        </p>
                                    </div>
                                )}

                                {!result.success && result.error && (
                                    <p className="text-sm text-red-700 mt-2">
                                        Error: {result.error}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="border-t border-border pt-6 mt-6">
                            <h3 className="font-semibold text-foreground mb-3">How to Test Without DNS:</h3>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                                <li>Save your custom domain in Settings</li>
                                <li>Use this page to verify it's in the database</li>
                                <li>Edit your hosts file to simulate DNS:
                                    <div className="ml-6 mt-2 p-3 bg-muted rounded font-mono text-xs">
                                        <p className="text-foreground">Windows: C:\Windows\System32\drivers\etc\hosts</p>
                                        <p className="text-foreground mt-1">Add line: 127.0.0.1    {testDomain || 'yourdomain.com'}</p>
                                    </div>
                                </li>
                                <li>Visit http://{testDomain || 'yourdomain.com'}:5173 in your browser</li>
                                <li>Should auto-redirect to your booking page!</li>
                            </ol>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CustomDomainTester;
