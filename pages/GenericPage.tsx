import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Spinner from '../components/ui/Spinner';
import { useLanguage } from '../hooks/useLanguage';
import Card, { CardContent } from '../components/ui/Card';

const pageContents: { [key: string]: any } = {
  'privacy-policy': {
    title: { "en": "Privacy Policy", "pt-BR": "Política de Privacidade", "ar": "سياسة الخصوصية" },
    updated_at: '2024-01-01T00:00:00Z',
    content: {
        "en": "<h1>Privacy Policy</h1><p>Welcome to localDify (''we,'' ''us,'' or ''our''). We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.</p><h2>1. Information We Collect</h2><h3>Personal Data</h3><p>Personally identifiable information, such as your name, email address, and telephone number, that you voluntarily give to us when you register with the Service or when you set up your business profile.</p><h3>Business Data</h3><p>Information about your business that you provide, such as business name, address, services offered, pricing, and working hours. This also includes any images or content you upload to represent your business.</p><h3>Customer Data</h3><p>When your customers make a booking through your public page, we collect their name, email address, and phone number on your behalf to facilitate the appointment. We act as a data processor for this information.</p><h3>Integration Data</h3><p>If you choose to connect third-party integrations, such as Google (for Gmail) or Meta (for WhatsApp), we will securely store authentication tokens (access and refresh tokens) required to maintain that connection. We do not store your passwords for these services.</p><h2>2. How We Use Your Information</h2><p>Having accurate information permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Service to:</p><ul><li>Create and manage your account.</li><li>Operate and maintain the booking service for your business.</li><li>Send automated emails and messages on your behalf through your integrated accounts.</li><li>Respond to your customer service requests.</li><li>Monitor and analyze usage and trends to improve your experience with the Service.</li></ul><h2>3. Disclosure of Your Information</h2><p>We do not share your personal information with third parties except as described in this Privacy Policy.</p><ul><li><strong>With Service Providers:</strong> We may share your information with third-party vendors and service providers that perform services for us or on our behalf, such as cloud hosting (Supabase).</li><li><strong>For Integrations:</strong> When you authorize an integration (e.g., Google, Meta), we will transmit data as necessary to provide the requested service. For example, to send an email, we must communicate with Google''s APIs using your stored credentials.</li><li><strong>By Law or to Protect Rights:</strong> We may disclose your information if required to do so by law or in the good faith belief that such action is necessary to comply with a legal obligation, protect and defend our rights or property, or in urgent circumstances to protect the personal safety of users of the Service or the public.</li></ul><h2>4. Security of Your Information</h2><p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.</p><h2>5. Your Rights</h2><p>You have the right to access, update, or delete the information we have on you. You can review and change your information at any time by logging into your account and visiting your dashboard settings. If you wish to delete your account, please contact us.</p><h2>6. Changes to This Privacy Policy</h2><p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.</p><h2>7. Contact Us</h2><p>If you have questions or comments about this Privacy Policy, please contact us at:<br /><a href=\"mailto:support@localdify.com\">support@localdify.com</a></p>",
        "pt-BR": "<h1>Política de Privacidade</h1><p>Bem-vindo ao localDify (''nós'' ou ''nosso''). Estamos comprometidos em proteger sua privacidade. Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos suas informações quando você usa nosso serviço.</p>... (conteúdo traduzido) ...",
        "ar": "<div dir=\"rtl\" style=\"text-align: right; font-family: ''Amiri'', serif;\"><h1>سياسة الخصوصية</h1><p>مرحبًا بك في localDify (''نحن'' أو ''خاصتنا''). نحن ملتزمون بحماية خصوصيتك. تشرح سياسة الخصوصية هذه كيف نجمع معلوماتك ونستخدمها ونكشف عنها ونحميها عند استخدام خدمتنا.</p>... (محتوى مترجم) ...</div>"
    }
  },
  'terms-of-service': {
    title: { "en": "Terms of Service", "pt-BR": "Termos de Serviço", "ar": "شروط الخدمة" },
    updated_at: '2024-01-01T00:00:00Z',
    content: {
        "en": "<h1>Terms of Service</h1><p>Please read these Terms of Service (''Terms'', ''Terms of Service'') carefully before using the localDify service (the ''Service'') operated by us.</p><h2>1. Accounts</h2><p>When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.</p>... (rest of content) ...",
        "pt-BR": "<h1>Termos de Serviço</h1><p>Por favor, leia estes Termos de Serviço (''Termos'') cuidadosamente antes de usar o serviço localDify (o ''Serviço'') operado por nós.</p>... (conteúdo traduzido) ...",
        "ar": "<div dir=\"rtl\" style=\"text-align: right; font-family: ''Amiri'', serif;\"><h1>شروط الخدمة</h1><p>يرجى قراءة شروط الخدمة هذه (''الشروط'') بعناية قبل استخدام خدمة localDify (''الخدمة'') التي نديرها.</p>... (محتوى مترجم) ...</div>"
    }
  }
};


const Footer: React.FC = () => {
    const { t, language } = useLanguage();
    const T = (field: any) => (field && (field[language] || field['en'])) || (typeof field === 'string' ? field : '');

    const footerLinks = [
        { slug: 'pricing', title: { en: 'Pricing', 'pt-BR': 'Preços', ar: 'الأسعار' } },
        { slug: 'p/privacy-policy', title: { en: 'Privacy Policy', 'pt-BR': 'Política de Privacidade', ar: 'سياسة الخصوصية' } },
        { slug: 'p/terms-of-service', title: { en: 'Terms of Service', 'pt-BR': 'Termos de Serviço', ar: 'شروط الخدمة' } }
    ];

    return (
        <footer className="bg-secondary">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <p className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('home.footer.copyright', { year: new Date().getFullYear() }) }}></p>
                    <div className="flex space-x-6 mt-4 md:mt-0">
                         {footerLinks.map(link => (
                            <Link key={link.slug} to={`/${link.slug}`} className="text-muted-foreground hover:text-primary transition-colors">
                                {T(link.title)}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
};


const GenericPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { language } = useLanguage();

  const T = (field: any) => (field && (field[language] || field['en'])) || (typeof field === 'string' ? field : '');

  useEffect(() => {
    setLoading(true);
    if (slug && pageContents[slug]) {
        setPage(pageContents[slug]);
        setError('');
    } else {
        setError(`The page "${slug}" could not be found.`);
        setPage(null);
    }
    setLoading(false);
  }, [slug]);

  return (
    <div className="bg-background text-foreground min-h-screen flex flex-col font-sans">
      <header className="py-4 bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/" className="text-2xl font-bold font-serif text-primary">localDify</Link>
        </div>
      </header>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64"><Spinner /></div>
          ) : error ? (
            <div className="text-destructive text-center p-8 bg-destructive/10 rounded-lg">
                <h2 className="text-2xl font-bold">Page Not Found</h2>
                <p>{error}</p>
            </div>
          ) : page ? (
            <Card>
                <CardContent>
                    <article className="prose dark:prose-invert max-w-none prose-h1:font-serif prose-h1:text-foreground prose-h2:font-serif prose-h2:text-foreground prose-a:text-primary">
                        <h1 className="text-4xl font-bold">{T(page.title)}</h1>
                        <p className="text-muted-foreground">Last updated: {new Date(page.updated_at).toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <div dangerouslySetInnerHTML={{ __html: T(page.content) }} />
                    </article>
                </CardContent>
            </Card>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GenericPage;