import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../hooks/useAdmin';
import { Page } from '../../types';
import Spinner from '../../components/ui/Spinner';
import Card, { CardContent, CardHeader, CardFooter } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Accordion from '../../components/ui/Accordion';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';

// --- Reusable Editor Components ---

const HomePageEditor: React.FC<{ page: Page, onSave: (page: Page) => void, isSaving: boolean }> = ({ page, onSave, isSaving }) => {
    const [content, setContent] = useState<any>({});

    useEffect(() => {
        const defaultContent = {
            hero: { title: { en: '' }, subtitle: { en: '' }, cta: { en: '' }, subCta: { en: '' } },
            features: { title: { en: '' }, subtitle: { en: '' }, items: [] },
            whoItsFor: { title: { en: '' }, subtitle: { en: '' }, items: [] },
            testimonials: { title: { en: '' }, subtitle: { en: '' }, items: [] },
            faq: { title: { en: '' }, subtitle: { en: '' }, items: [] },
            cta: { title: { en: '' }, subtitle: { en: '' }, cta: { en: '' }, subCta: { en: '' } }
        };
        const pageContent = page.content || {};
        
        const mergedContent = {
            hero: { ...defaultContent.hero, ...(pageContent.hero || {}) },
            features: { ...defaultContent.features, ...(pageContent.features || {}), items: pageContent.features?.items || [] },
            whoItsFor: { ...defaultContent.whoItsFor, ...(pageContent.whoItsFor || {}), items: pageContent.whoItsFor?.items || [] },
            testimonials: { ...defaultContent.testimonials, ...(pageContent.testimonials || {}), items: pageContent.testimonials?.items || [] },
            faq: { ...defaultContent.faq, ...(pageContent.faq || {}), items: pageContent.faq?.items || [] },
            cta: { ...defaultContent.cta, ...(pageContent.cta || {}) },
        };
        setContent(mergedContent);
    }, [page]);
    
    // For multilingual fields, we edit the 'en' version.
    const handleInputChange = (section: string, field: string, value: string) => {
        setContent(prev => ({ 
            ...prev, 
            [section]: { 
                ...prev[section], 
                [field]: { ...prev[section][field], en: value } 
            } 
        }));
    };

    const handleNestedItemChange = (section: string, index: number, field: string, value: string | number) => {
        setContent(prev => {
            const items = [...(prev[section].items || [])];
            const currentItem = items[index] || {};
            // Handle both flat fields (like imageUrl) and multilingual fields
            if (typeof currentItem[field] === 'object' && currentItem[field] !== null && 'en' in currentItem[field]) {
                 items[index] = { ...currentItem, [field]: { ...currentItem[field], en: value } };
            } else {
                 items[index] = { ...currentItem, [field]: value };
            }
            return { ...prev, [section]: { ...prev[section], items } };
        });
    };

    const handleAddItem = (section: string, newItem: any) => {
        setContent(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                items: [...(prev[section].items || []), newItem]
            }
        }));
    };

    const handleRemoveItem = (section: string, indexToRemove: number) => {
        setContent(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                items: (prev[section].items || []).filter((_: any, index: number) => index !== indexToRemove)
            }
        }));
    };
    
    const handleSave = () => onSave({ ...page, content });

    if (!content.hero) {
        return <div className="flex justify-center items-center p-8"><Spinner /></div>;
    }

    return (
        <div className="space-y-4">
             <Accordion title="Hero Section" defaultOpen>
                <div className="p-4 space-y-4">
                    <Input label="Title (supports HTML)" value={content.hero.title?.en || ''} onChange={e => handleInputChange('hero', 'title', e.target.value)} />
                    <Input label="Subtitle" value={content.hero.subtitle?.en || ''} onChange={e => handleInputChange('hero', 'subtitle', e.target.value)} />
                    <Input label="CTA Button Text" value={content.hero.cta?.en || ''} onChange={e => handleInputChange('hero', 'cta', e.target.value)} />
                    <Input label="Sub-CTA Text (supports HTML)" value={content.hero.subCta?.en || ''} onChange={e => handleInputChange('hero', 'subCta', e.target.value)} />
                </div>
            </Accordion>

            <Accordion title="Features Section">
                <div className="p-4 space-y-4">
                    <Input label="Section Title" value={content.features.title?.en || ''} onChange={e => handleInputChange('features', 'title', e.target.value)} />
                    <Input label="Section Subtitle" value={content.features.subtitle?.en || ''} onChange={e => handleInputChange('features', 'subtitle', e.target.value)} />
                    <div className="space-y-4 pt-4 border-t border-border">
                        {(content.features.items || []).map((item: any, index: number) => (
                            <div key={index} className="p-3 border border-border rounded-md relative space-y-2">
                                <Button type="button" variant="ghost" className="absolute top-1 right-1 h-7 w-7 p-0" onClick={() => handleRemoveItem('features', index)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </Button>
                                <Input label={`Feature ${index + 1} Title`} value={item.title?.en || ''} onChange={e => handleNestedItemChange('features', index, 'title', e.target.value)} />
                                <Input label="Description" value={item.description?.en || ''} onChange={e => handleNestedItemChange('features', index, 'description', e.target.value)} />
                                <Input label="Image URL" value={item.imageUrl || ''} onChange={e => handleNestedItemChange('features', index, 'imageUrl', e.target.value)} />
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={() => handleAddItem('features', { title: { en: '' }, description: { en: '' }, imageUrl: '' })}>Add Feature</Button>
                    </div>
                </div>
            </Accordion>
            
            <Accordion title="Who It's For Section">
                <div className="p-4 space-y-4">
                    <Input label="Section Title" value={content.whoItsFor.title?.en || ''} onChange={e => handleInputChange('whoItsFor', 'title', e.target.value)} />
                    <Input label="Section Subtitle" value={content.whoItsFor.subtitle?.en || ''} onChange={e => handleInputChange('whoItsFor', 'subtitle', e.target.value)} />
                    <div className="space-y-4 pt-4 border-t border-border">
                        {(content.whoItsFor.items || []).map((item: any, index: number) => (
                            <div key={index} className="p-3 border border-border rounded-md relative space-y-2">
                                <Button type="button" variant="ghost" className="absolute top-1 right-1 h-7 w-7 p-0" onClick={() => handleRemoveItem('whoItsFor', index)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </Button>
                                <Input label={`Category ${index + 1} Name`} value={item.name?.en || ''} onChange={e => handleNestedItemChange('whoItsFor', index, 'name', e.target.value)} />
                                <Input label="Image URL" value={item.imageUrl || ''} onChange={e => handleNestedItemChange('whoItsFor', index, 'imageUrl', e.target.value)} />
                            </div>
                        ))}
                         <Button type="button" variant="secondary" onClick={() => handleAddItem('whoItsFor', { name: { en: '' }, imageUrl: '' })}>Add Category</Button>
                    </div>
                </div>
            </Accordion>

            <Accordion title="Testimonials Section">
                 <div className="p-4 space-y-4">
                    <Input label="Section Title" value={content.testimonials.title?.en || ''} onChange={e => handleInputChange('testimonials', 'title', e.target.value)} />
                    <Input label="Section Subtitle" value={content.testimonials.subtitle?.en || ''} onChange={e => handleInputChange('testimonials', 'subtitle', e.target.value)} />
                    <div className="space-y-4 pt-4 border-t border-border">
                        {(content.testimonials.items || []).map((item: any, index: number) => (
                            <div key={index} className="p-3 border border-border rounded-md relative space-y-2">
                                <Button type="button" variant="ghost" className="absolute top-1 right-1 h-7 w-7 p-0" onClick={() => handleRemoveItem('testimonials', index)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </Button>
                                <label className="block text-sm font-medium">Quote {index + 1}</label>
                                <textarea value={item.quote?.en || ''} onChange={e => handleNestedItemChange('testimonials', index, 'quote', e.target.value)} rows={3} className="w-full p-2 border rounded-md bg-card border-input" />
                                <Input label="Name" value={item.name?.en || ''} onChange={e => handleNestedItemChange('testimonials', index, 'name', e.target.value)} />
                                <Input label="Title" value={item.title?.en || ''} onChange={e => handleNestedItemChange('testimonials', index, 'title', e.target.value)} />
                                <Input label="Avatar URL" value={item.avatarUrl || ''} onChange={e => handleNestedItemChange('testimonials', index, 'avatarUrl', e.target.value)} />
                                <Input label="Rating (1-5)" type="number" min="1" max="5" value={item.rating || 5} onChange={e => handleNestedItemChange('testimonials', index, 'rating', parseInt(e.target.value, 10))} />
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={() => handleAddItem('testimonials', { quote: { en: '' }, name: { en: '' }, title: { en: '' }, avatarUrl: '', rating: 5 })}>Add Testimonial</Button>
                    </div>
                </div>
            </Accordion>

            <Accordion title="FAQ Section">
                <div className="p-4 space-y-4">
                    <Input label="Section Title" value={content.faq.title?.en || ''} onChange={e => handleInputChange('faq', 'title', e.target.value)} />
                    <Input label="Section Subtitle" value={content.faq.subtitle?.en || ''} onChange={e => handleInputChange('faq', 'subtitle', e.target.value)} />
                    <div className="space-y-4 pt-4 border-t border-border">
                        {(content.faq.items || []).map((item: any, index: number) => (
                            <div key={index} className="p-3 border border-border rounded-md relative space-y-2">
                                <Button type="button" variant="ghost" className="absolute top-1 right-1 h-7 w-7 p-0" onClick={() => handleRemoveItem('faq', index)}>
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </Button>
                                <Input label={`Question ${index + 1}`} value={item.question?.en || ''} onChange={e => handleNestedItemChange('faq', index, 'question', e.target.value)} />
                                <label className="block text-sm font-medium">Answer</label>
                                <textarea value={item.answer?.en || ''} onChange={e => handleNestedItemChange('faq', index, 'answer', e.target.value)} rows={3} className="w-full p-2 border rounded-md bg-card border-input" />
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={() => handleAddItem('faq', { question: { en: '' }, answer: { en: '' } })}>Add FAQ</Button>
                    </div>
                </div>
            </Accordion>

            <Accordion title="Call to Action (CTA) Section">
                <div className="p-4 space-y-4">
                    <Input label="Title" value={content.cta.title?.en || ''} onChange={e => handleInputChange('cta', 'title', e.target.value)} />
                    <Input label="Subtitle" value={content.cta.subtitle?.en || ''} onChange={e => handleInputChange('cta', 'subtitle', e.target.value)} />
                    <Input label="CTA Button Text" value={content.cta.cta?.en || ''} onChange={e => handleInputChange('cta', 'cta', e.target.value)} />
                    <Input label="Sub-CTA Text" value={content.cta.subCta?.en || ''} onChange={e => handleInputChange('cta', 'subCta', e.target.value)} />
                </div>
            </Accordion>

            <div className="text-right sticky bottom-0 bg-popover/80 backdrop-blur-sm py-3 px-6 -mx-6 -mb-6 border-t border-border">
                <Button type="button" onClick={handleSave} isLoading={isSaving}>Save Homepage</Button>
            </div>
        </div>
    );
};

const PricingPageEditor: React.FC<{ page: Page, onSave: (page: Page) => void, isSaving: boolean }> = ({ page, onSave, isSaving }) => {
    const [content, setContent] = useState<any>({});
    
    useEffect(() => {
        const defaultContent = {
            title: {en:''}, subtitle: {en:''},
            plans: [],
            testimonial: { quote: {en:''}, name: {en:''}, title: {en:''} },
            featureComparison: { title: {en:''}, categories: [] },
            faq: { title: {en:''}, items: [] },
            cta: { title: {en:''}, cta: {en:''} }
        };
        const pageContent = page.content || {};

        const mergedContent = {
            ...defaultContent,
            ...pageContent,
            title: pageContent.title || defaultContent.title,
            subtitle: pageContent.subtitle || defaultContent.subtitle,
            testimonial: { ...defaultContent.testimonial, ...(pageContent.testimonial || {}) },
            featureComparison: { ...defaultContent.featureComparison, ...(pageContent.featureComparison || {}), categories: pageContent.featureComparison?.categories || [] },
            faq: { ...defaultContent.faq, ...(pageContent.faq || {}), items: pageContent.faq?.items || [] },
            cta: { ...defaultContent.cta, ...(pageContent.cta || {}) },
            plans: pageContent.plans || []
        };
        setContent(mergedContent);
    }, [page]);

    const handleMainChange = (field: string, value: any) => setContent(prev => ({ ...prev, [field]: { ...prev[field], en: value } }));
    const handleSectionChange = (section: string, field: string, value: any) => setContent(prev => ({...prev, [section]: {...(prev[section] || {}), [field]: { ...prev[section]?.[field], en: value }}}));
    const handleNestedItemChange = (section: string, index: number, field: string, value: any) => {
        setContent(prev => {
            const newContent = {...prev};
            const items = [...(newContent[section].items || [])];
            const currentItem = items[index] || {};
            items[index] = { ...currentItem, [field]: { ...currentItem[field], en: value } };
            newContent[section] = { ...newContent[section], items };
            return newContent;
        });
    };
    const handleAddItem = (section: string, newItem: any) => {
        setContent(prev => ({ ...prev, [section]: { ...prev[section], items: [...(prev[section].items || []), newItem] }}));
    };
    const handleRemoveItem = (section: string, index: number) => {
        setContent(prev => ({...prev, [section]: {...prev[section], items: prev[section].items.filter((_:any, i:number) => i !== index) }}));
    };
    const handleSave = () => onSave({ ...page, content });

    if(!content.plans) {
        return <div className="flex justify-center items-center p-8"><Spinner /></div>;
    }

    return (
        <div className="space-y-6">
            <Accordion title="Main Content" defaultOpen>
                <div className="p-4 space-y-4">
                    <Input label="Page Title" value={content.title?.en || ''} onChange={e => handleMainChange('title', e.target.value)} />
                    <Input label="Page Subtitle" value={content.subtitle?.en || ''} onChange={e => handleMainChange('subtitle', e.target.value)} />
                </div>
            </Accordion>
            
            <Accordion title="Plans">
                 <div className="p-4 space-y-4">
                    {content.plans.map((plan: any, planIndex: number) => (
                        <div key={planIndex} className="p-3 border rounded-md space-y-3">
                            <h4 className="font-semibold">Plan {planIndex + 1}</h4>
                            <Input label="Name" value={plan.name?.en || ''} onChange={e => handleMainChange('plans', content.plans.map((p:any, i:number) => i === planIndex ? {...p, name: { ...p.name, en: e.target.value }} : p))} />
                            <Input label="Price" value={plan.price} onChange={e => handleMainChange('plans', content.plans.map((p:any, i:number) => i === planIndex ? {...p, price: e.target.value} : p))} />
                            <Input label="Period" value={plan.period?.en || ''} onChange={e => handleMainChange('plans', content.plans.map((p:any, i:number) => i === planIndex ? {...p, period: { ...p.period, en: e.target.value }} : p))} />
                            <Input label="CTA Text" value={plan.cta?.en || ''} onChange={e => handleMainChange('plans', content.plans.map((p:any, i:number) => i === planIndex ? {...p, cta: { ...p.cta, en: e.target.value }} : p))} />
                            <Select label="Status" value={plan.status} onChange={e => handleMainChange('plans', content.plans.map((p:any, i:number) => i === planIndex ? {...p, status: e.target.value} : p))}>
                                <option value="available">Available</option>
                                <option value="coming_soon">Coming Soon</option>
                            </Select>
                            <div className="space-y-2 pt-2 border-t">
                                <label className="text-sm font-medium">Features</label>
                                {plan.features.map((feature: any, featureIndex: number) => (
                                    <div key={featureIndex} className="flex items-center gap-2">
                                        <Input value={feature?.en || ''} onChange={e => handleMainChange('plans', content.plans.map((p:any, i:number) => i === planIndex ? {...p, features: p.features.map((f:any, j:number) => j === featureIndex ? { ...f, en: e.target.value } : f)} : p))} />
                                        <Button type="button" variant="destructive" onClick={() => handleMainChange('plans', content.plans.map((p:any, i:number) => i === planIndex ? {...p, features: p.features.filter((_:any, j:number) => j !== featureIndex)} : p))}>X</Button>
                                    </div>
                                ))}
                                <Button type="button" variant="secondary" onClick={() => handleMainChange('plans', content.plans.map((p:any, i:number) => i === planIndex ? {...p, features: [...p.features, {en: 'New Feature'}]} : p))}>Add Feature</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </Accordion>
            
            <Accordion title="Testimonial">
                <div className="p-4 space-y-4">
                    <label className="block text-sm font-medium">Quote</label>
                    <textarea value={content.testimonial?.quote?.en || ''} onChange={e => handleSectionChange('testimonial', 'quote', e.target.value)} rows={3} className="w-full p-2 border rounded-md bg-card border-input" />
                    <Input label="Name" value={content.testimonial?.name?.en || ''} onChange={e => handleSectionChange('testimonial', 'name', e.target.value)} />
                    <Input label="Title" value={content.testimonial?.title?.en || ''} onChange={e => handleSectionChange('testimonial', 'title', e.target.value)} />
                </div>
            </Accordion>
            
            <Accordion title="FAQ Section">
                <div className="p-4 space-y-4">
                    <Input label="Section Title" value={content.faq?.title?.en || ''} onChange={e => handleSectionChange('faq', 'title', e.target.value)} />
                    <div className="space-y-4 pt-4 border-t border-border">
                        {(content.faq?.items || []).map((item: any, index: number) => (
                            <div key={index} className="p-3 border border-border rounded-md relative space-y-2">
                                <Button type="button" variant="ghost" className="absolute top-1 right-1 h-7 w-7 p-0" onClick={() => handleRemoveItem('faq', index)}>
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                </Button>
                                <Input label={`Question ${index + 1}`} value={item.question?.en} onChange={e => handleNestedItemChange('faq', index, 'question', e.target.value)} />
                                <label className="block text-sm font-medium">Answer</label>
                                <textarea value={item.answer?.en} onChange={e => handleNestedItemChange('faq', index, 'answer', e.target.value)} rows={3} className="w-full p-2 border rounded-md bg-card border-input" />
                            </div>
                        ))}
                        <Button type="button" variant="secondary" onClick={() => handleAddItem('faq', { question: {en:''}, answer: {en:''} })}>Add FAQ</Button>
                    </div>
                </div>
            </Accordion>

            <Accordion title="Final CTA Section">
                <div className="p-4 space-y-4">
                    <Input label="Title" value={content.cta?.title?.en || ''} onChange={e => handleSectionChange('cta', 'title', e.target.value)} />
                    <Input label="CTA Button Text" value={content.cta?.cta?.en || ''} onChange={e => handleSectionChange('cta', 'cta', e.target.value)} />
                </div>
            </Accordion>

             <div className="text-right sticky bottom-0 bg-popover/80 backdrop-blur-sm py-3 px-6 -mx-6 -mb-6 border-t border-border">
                <Button type="button" onClick={handleSave} isLoading={isSaving}>Save Pricing Page</Button>
            </div>
        </div>
    );
};

const GenericPageEditor: React.FC<{ page: Page, onSave: (page: Page) => void, isSaving: boolean }> = ({ page, onSave, isSaving }) => {
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    
    useEffect(() => {
        // FIX: Correctly handle page.title which can be a string or a multilingual object.
        let titleString = '';
        if (typeof page.title === 'string') {
            titleString = page.title;
        } else if (page.title && typeof page.title === 'object') {
            titleString = (page.title as { en?: string }).en || '';
        }
        setTitle(titleString);
        setSlug(page.slug || '');
        setHtmlContent((page.content as any)?.content?.en || (typeof (page.content as any)?.content === 'string' ? (page.content as any).content : ''));
    }, [page]);

    const handleSave = () => {
        // When saving, we'll just replicate the English content for now for simplicity.
        // A more advanced version could have separate inputs for each language.
        const updatedPage = { 
            ...page, 
            title: { en: title, 'pt-BR': title, ar: title },
            slug, 
            content: { content: { en: htmlContent, 'pt-BR': htmlContent, ar: htmlContent } }
        };
        onSave(updatedPage);
    };

    return (
        <div className="space-y-4">
            <Input label="Page Title (English)" value={title} onChange={e => setTitle(e.target.value)} required />
            <Input label="Page Slug (URL)" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} required />
            <label className="block text-sm font-medium text-foreground">Content (HTML)</label>
            <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                rows={20}
                className="w-full p-2 border rounded-md font-mono text-sm bg-card border-input focus:ring-ring focus:ring-1"
            />
            <div className="text-right sticky bottom-0 bg-popover/80 backdrop-blur-sm py-3 px-6 -mx-6 -mb-6 border-t border-border">
                <Button type="button" onClick={handleSave} isLoading={isSaving}>Save Page</Button>
            </div>
        </div>
    );
};

// --- Main Component ---

const AdminPages: React.FC = () => {
    const { pages, updatePage, addPage, deletePage, loading } = useAdmin();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPage, setEditingPage] = useState<Page | null>(null);

    const [isSaving, setIsSaving] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // FIX: Add a helper function to safely get the page title as a string,
    // resolving the issue where a multilingual title object was passed as a prop.
    const getPageTitleAsString = (title: Page['title']): string => {
        if (typeof title === 'string') {
            return title;
        }
        if (title && typeof title === 'object') {
            return (title as { [key: string]: string }).en || '';
        }
        return '';
    };

    const renderEditor = () => {
        if (!editingPage && isModalOpen) { // Create mode
            const newPage: Partial<Page> = { title: {en:''}, slug: '', content: { content: {en:'<h1>New Page</h1><p>Start writing your content here.</p>'} }, is_published: false, show_in_header: false, show_in_footer: false };
            return <GenericPageEditor page={newPage as Page} onSave={handleSave} isSaving={isSaving} />;
        }
        if (editingPage) {
            switch (editingPage.slug) {
                case 'home': return <HomePageEditor page={editingPage} onSave={handleSave} isSaving={isSaving} />;
                case 'pricing': return <PricingPageEditor page={editingPage} onSave={handleSave} isSaving={isSaving} />;
                default: return <GenericPageEditor page={editingPage} onSave={handleSave} isSaving={isSaving} />;
            }
        }
        return null;
    };
    
    const handleToggle = async (page: Page, field: 'is_published' | 'show_in_header' | 'show_in_footer') => {
        try {
            await updatePage(page.id, { [field]: !page[field] });
        } catch (error: any) {
            alert(`Failed to update: ${error.message}`);
        }
    };
    
    const handleEdit = (page: Page) => {
        setEditingPage(page);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setEditingPage(null); // Explicitly null for creation mode
        setIsModalOpen(true);
    };
    
    const handleDelete = async (pageId: string) => {
        if (window.confirm('Are you sure you want to delete this page? This cannot be undone.')) {
            try {
                await deletePage(pageId);
            } catch (error: any) {
                alert(`Failed to delete page: ${error.message}`);
            }
        }
    };

    const handleSave = async (pageData: Page) => {
        setIsSaving(true);
        setStatusMessage(null);
        try {
            if (pageData.id) {
                await updatePage(pageData.id, pageData);
            } else {
                await addPage(pageData);
            }
            setIsModalOpen(false);
            setEditingPage(null);
        } catch (error: any) {
            alert(`Failed to save: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    
    const corePageSlugs = ['home', 'pricing', 'privacy-policy', 'terms-of-service'];

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Page Management</h1>
                        <p className="text-muted-foreground">Create, edit, and manage all pages on your site.</p>
                    </div>
                    <Button onClick={handleCreate}>Create New Page</Button>
                </div>
                
                {statusMessage && (
                    <div className={`p-3 rounded-md text-sm ${statusMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {statusMessage.text}
                    </div>
                )}
                
                <Card>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Page Title</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Published</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Show in Header</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Show in Footer</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                    {loading ? (
                                        <tr><td colSpan={5} className="text-center p-8"><Spinner/></td></tr>
                                    ) : pages.filter(page => !['home', 'pricing', 'privacy-policy', 'terms-of-service', 'trial-ended'].includes(page.slug)).map(page => (
                                        <tr key={page.id}>
                                            <td className="px-6 py-4">
                                                {/* FIX: Render the 'en' property if title is an object, otherwise render the string. */}
                                                <div className="font-semibold text-foreground">{getPageTitleAsString(page.title)}</div>
                                                <div className="text-xs text-muted-foreground font-mono">/{page.slug === 'home' ? '' : page.slug.startsWith('p/') ? page.slug : `p/${page.slug}`}</div>
                                            </td>
                                            <td><input type="checkbox" className="toggle-checkbox" checked={page.is_published} onChange={() => handleToggle(page, 'is_published')} /></td>
                                            <td><input type="checkbox" className="toggle-checkbox" checked={page.show_in_header} onChange={() => handleToggle(page, 'show_in_header')} /></td>
                                            <td><input type="checkbox" className="toggle-checkbox" checked={page.show_in_footer} onChange={() => handleToggle(page, 'show_in_footer')} /></td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Button variant="ghost" onClick={() => handleEdit(page)}>Edit</Button>
                                                {!corePageSlugs.includes(page.slug) && (
                                                    <Button variant="destructive" onClick={() => handleDelete(page.id)}>Delete</Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPage ? `Edit: ${getPageTitleAsString(editingPage.title)}` : 'Create New Page'} widthClass="max-w-4xl" scrollable>
                 {renderEditor()}
            </Modal>
             <style>{`
                .toggle-checkbox {
                    appearance: none;
                    width: 3rem;
                    height: 1.5rem;
                    background-color: var(--muted);
                    border-radius: 9999px;
                    position: relative;
                    cursor: pointer;
                    transition: background-color 0.2s ease-in-out;
                }
                .toggle-checkbox::before {
                    content: '';
                    position: absolute;
                    width: 1.25rem;
                    height: 1.25rem;
                    border-radius: 9999px;
                    background-color: white;
                    top: 0.125rem;
                    left: 0.125rem;
                    transition: transform 0.2s ease-in-out;
                }
                .toggle-checkbox:checked {
                    background-color: var(--primary);
                }
                .toggle-checkbox:checked::before {
                    transform: translateX(1.5rem);
                }
            `}</style>
        </>
    );
};

export default AdminPages;