

import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import Dropdown, { DropdownItem } from '../components/ui/Dropdown';
import Spinner from '../components/ui/Spinner';
import { Language } from '../contexts/LanguageContext';

const pageContent = {
    "hero": {
        "title": {
            "en": "Your Style, Your Time. <br /> Booked Beautifully.",
            "ar": "أسلوبك، وقتك. <br /> محجوز بشكل جميل."
        },
        "subtitle": {
            "en": "The ultimate booking platform designed for modern salons and barbershops. Elevate your client experience and streamline your schedule.",
            "ar": "منصة الحجز المثالية المصممة للصالونات ومحلات الحلاقة الحديثة. ارتقِ بتجربة عملائك وقم بتبسيط جدولك الزمني."
        },
        "cta": {
            "en": "Start Your Free Trial",
            "ar": "ابدأ الفترة التجريبية المجانية"
        },
        "subCta": {
            "en": "14-day free trial &bull; No credit card required",
            "ar": "فترة تجريبية مجانية لمدة 14 يومًا &bull; لا يلزم وجود بطاقة ائتمان"
        }
    },
    "features": {
        "title": {
            "en": "Designed for the Modern Stylist",
            "ar": "مصمم للمصمم العصري"
        },
        "subtitle": {
            "en": "Everything you need to streamline your bookings and grow your business.",
            "ar": "كل ما تحتاجه لتبسيط حجوزاتك وتنمية أعمالك."
        },
        "items": [
            {
                "title": { "en": "Your Digital Appointment Book", "ar": "دفتر مواعيدك الرقمي" },
                "description": { "en": "View your day, week, and month at a glance. Manage appointments, client notes, and availability from one beautiful dashboard.", "ar": "اعرض يومك وأسبوعك وشهرك في لمحة. قم بإدارة المواعيد وملاحظات العملاء والتوافر من لوحة تحكم واحدة جميلة." },
                "imageUrl": "https://i.imgur.com/gYf20e4.jpeg"
            },
            {
                "title": { "en": "Showcase Your Craft", "ar": "اعرض حرفتك" },
                "description": { "en": "Create a stunning menu of your services, complete with descriptions, pricing, and gorgeous photos to entice clients.", "ar": "أنشئ قائمة مذهلة بخدماتك، كاملة مع الأوصاف والأسعار والصور الرائعة لجذب العملاء." },
                "imageUrl": "https://i.imgur.com/lAnL3AS.jpeg"
            },
            {
                "title": { "en": "Effortless Client Booking", "ar": "حجز العملاء دون عناء" },
                "description": { "en": "Give your clients the freedom to book online 24/7 through your elegant, custom-branded booking page.", "ar": "امنح عملائك حرية الحجز عبر الإنترنت على مدار الساعة طوال أيام الأسبوع من خلال صفحة الحجز الأنيقة والمخصصة لعلامتك التجارية." },
                "imageUrl": "https://i.imgur.com/uR2kL1a.jpeg"
            },
            {
                "title": { "en": "A Style That's All Yours", "ar": "أسلوب يخصك بالكامل" },
                "description": { "en": "Customize your booking page with your logo, brand colors, and photos to create a seamless client experience.", "ar": "قم بتخصيص صفحة الحجز الخاصة بك بشعارك وألوان علامتك التجارية والصور لإنشاء تجربة عميل سلسة." },
                "imageUrl": "https://i.imgur.com/Qk7a2vT.jpeg"
            },
            {
                "title": { "en": "Smart, Automated Reminders", "ar": "تذكيرات ذكية وآلية" },
                "description": { "en": "Reduce no-shows with automated email and WhatsApp reminders, ensuring your clients never miss an appointment.", "ar": "قلل من عدم الحضور مع تذكيرات آلية عبر البريد الإلكتروني والواتساب، مما يضمن عدم تفويت عملائك لموعد أبدًا." },
                "imageUrl": "https://i.imgur.com/dZ2R2aD.jpeg"
            },
            {
                "title": { "en": "Insights at Your Fingertips", "ar": "رؤى في متناول يدك" },
                "description": { "en": "Track your most popular services, busiest days, and client loyalty to make smarter business decisions.", "ar": "تتبع خدماتك الأكثر شيوعًا وأكثر الأيام ازدحامًا وولاء العملاء لاتخاذ قرارات عمل أكثر ذكاءً." },
                "imageUrl": "https://i.imgur.com/OqT7mJb.jpeg"
            }
        ]
    },
    "whoItsFor": {
        "title": {
            "en": "Perfect for Every Style Professional",
            "ar": "مثالي لكل محترف في مجال الأناقة"
        },
        "subtitle": {
            "en": "localDify is designed for any service-based business that runs on appointments.",
            "ar": "تم تصميم localDify لأي عمل قائم على الخدمة يعتمد على المواعيد."
        },
        "items": [
            { "name": { "en": "Salons & Barbers", "ar": "الصالونات والحلاقون" }, "imageUrl": "https://i.imgur.com/bDAyP5s.jpeg" },
            { "name": { "en": "Spas", "ar": "المنتجعات الصحية" }, "imageUrl": "https://i.imgur.com/5hI3b0E.jpeg" },
            { "name": { "en": "Nail Artists", "ar": "فنانو الأظافر" }, "imageUrl": "https://i.imgur.com/J3y4g19.jpeg" },
            { "name": { "en": "Estheticians", "ar": "أخصائيو التجميل" }, "imageUrl": "https://i.imgur.com/tC5fV2c.jpeg" },
            { "name": { "en": "Tattoo Artists", "ar": "فنانو الوشم" }, "imageUrl": "https://i.imgur.com/027yA4w.jpeg" },
            { "name": { "en": "Massage Therapists", "ar": "أخصائيو العلاج بالتدليك" }, "imageUrl": "https://i.imgur.com/c6f5yYI.jpeg" }
        ]
    },
    "testimonials": {
        "title": {
            "en": "Loved by Stylists & Barbers",
            "ar": "محبوب من قبل المصممين والحلاقين"
        },
        "subtitle": {
            "en": "Don''t just take our word for it. Here''s what our users are saying.",
            "ar": "لا تأخذ كلمتنا فقط. إليك ما يقوله مستخدمونا."
        },
        "items": [
            { 
                "quote": { 
                    "en": "localDify has been a game-changer. I spend less time on the phone and more time with my clients. The setup was incredibly easy and it looks so professional!", 
                    "ar": "كان localDify بمثابة تغيير جذري. أقضي وقتًا أقل على الهاتف ووقتًا أطول مع عملائي. كان الإعداد سهلاً بشكل لا يصدق ويبدو احترافيًا للغاية!"
                }, 
                "name": { "en": "Sarah L.", "ar": "سارة ل." }, 
                "title": { "en": "Owner, The Cutting Edge Salon", "ar": "صاحبة صالون The Cutting Edge" }, 
                "avatarUrl": "https://i.imgur.com/A1p2y2x.jpeg", 
                "rating": 5 
            },
            { 
                "quote": { 
                    "en": "Our barbershop''s booking process is so much smoother now. My clients love being able to book online, and the automated reminders have cut down our no-shows by half.", 
                    "ar": "أصبحت عملية الحجز في محل الحلاقة الخاص بنا أكثر سلاسة الآن. يحب عملائي القدرة على الحجز عبر الإنترنت، وقد قللت التذكيرات الآلية من عدم حضورهم إلى النصف."
                }, 
                "name": { "en": "Alex C.", "ar": "أليكس س." }, 
                "title": { "en": "Owner, The Dapper Den", "ar": "صاحب The Dapper Den" }, 
                "avatarUrl": "https://i.imgur.com/iQp4y8B.jpeg", 
                "rating": 5 
            },
            { 
                "quote": { 
                    "en": "As a solo esthetician, managing my schedule was a headache. localDify automated everything. It feels like I have a personal assistant!", 
                    "ar": "بصفتي أخصائية تجميل مستقلة، كانت إدارة جدولي الزمني بمثابة صداع. قام localDify بأتمتة كل شيء. أشعر وكأن لدي مساعد شخصي!"
                }, 
                "name": { "en": "Jessica M.", "ar": "جيسيكا م." }, 
                "title": { "en": "Esthetician", "ar": "أخصائية تجميل" }, 
                "avatarUrl": "https://i.imgur.com/dTwPSxY.jpeg", 
                "rating": 5 
            }
        ]
    },
    "faq": {
        "title": {
            "en": "Frequently Asked Questions",
            "ar": "الأسئلة الشائعة"
        },
        "subtitle": {
            "en": "Have questions? We''ve got answers. If you can''t find what you''re looking for, feel free to contact us.",
            "ar": "هل لديك أسئلة؟ لدينا إجابات. إذا لم تتمكن من العثور على ما تبحث عنه، فلا تتردد في الاتصال بنا."
        },
        "items": [
            { 
                "question": { "en": "How much does localDify cost after the free trial?", "ar": "كم تكلفة localDify بعد الفترة التجريبية المجانية؟" }, 
                "answer": { "en": "We offer simple and affordable pricing plans designed for small businesses. Our basic plan starts at just $19/month. You can find detailed pricing information on our pricing page.", "ar": "نحن نقدم خطط أسعار بسيطة ومعقولة مصممة للشركات الصغيرة. تبدأ خطتنا الأساسية بسعر 19 دولارًا شهريًا فقط. يمكنك العثور على معلومات مفصلة عن الأسعار في صفحة الأسعار الخاصة بنا." } 
            },
            { 
                "question": { "en": "Can I customize the look of my booking page?", "ar": "هل يمكنني تخصيص مظهر صفحة الحجز الخاصة بي؟" }, 
                "answer": { "en": "Absolutely! You have full control over colors, fonts, your logo, and a gallery of images. Our live theme editor lets you see your changes instantly, ensuring your page perfectly matches your brand.", "ar": "بالتأكيد! لديك سيطرة كاملة على الألوان والخطوط وشعارك ومعرض الصور. يتيح لك محرر السمات المباشر الخاص بنا رؤية تغييراتك على الفور، مما يضمن تطابق صفحتك تمامًا مع علامتك التجارية." } 
            },
            { 
                "question": { "en": "How long does it take to get set up?", "ar": "كم من الوقت يستغرق الإعداد؟" }, 
                "answer": { "en": "You can get your business set up and ready to take bookings in under 15 minutes. The process is straightforward: create your account, add your business details, define your services, and share your unique booking link.", "ar": "يمكنك إعداد عملك وجاهزيته لتلقي الحجوزات في أقل من 15 دقيقة. العملية مباشرة: أنشئ حسابك، وأضف تفاصيل عملك، وحدد خدماتك، وشارك رابط الحجز الفريد الخاص بك." } 
            },
            { 
                "question": { "en": "Do my customers need to create an account to book?", "ar": "هل يحتاج عملائي إلى إنشاء حساب للحجز؟" }, 
                "answer": { "en": "No, your customers do not need to create an account. They can book an appointment quickly and easily by providing their name, email, and phone number, making the process as frictionless as possible.", "ar": "لا، لا يحتاج عملاؤك إلى إنشاء حساب. يمكنهم حجز موعد بسرعة وسهولة عن طريق تقديم اسمهم وبريدهم الإلكتروني ورقم هاتفهم، مما يجعل العملية سلسة قدر الإمكان." } 
            }
        ]
    },
    "cta": {
        "title": {
            "en": "Ready to Elevate Your Business?",
            "ar": "هل أنت مستعد للارتقاء بعملك؟"
        },
        "subtitle": {
            "en": "Join hundreds of stylists and barbers who trust localDify to manage their appointments and delight their clients.",
            "ar": "انضم إلى مئات المصممين والحلاقين الذين يثقون في localDify لإدارة مواعيدهم وإسعاد عملائهم."
        },
        "cta": {
            "en": "Start Your 14-Day Free Trial",
            "ar": "ابدأ الفترة التجريبية المجانية لمدة 14 يومًا"
        },
        "subCta": {
            "en": "No credit card required",
            "ar": "لا يلزم وجود بطاقة ائتمان"
        }
    }
  };

const useIntersectionObserver = (options: IntersectionObserverInit & { triggerOnce?: boolean }) => {
  const containerRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const { triggerOnce, ...observerOptions } = options;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        if (triggerOnce && containerRef.current) {
          observer.unobserve(containerRef.current);
        }
      }
    }, observerOptions);

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [containerRef, options]);

  return [containerRef, isVisible] as const;
};

const AnimatedSection: React.FC<{ children: ReactNode; className?: string; id?: string }> = ({ children, className, id }) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold: 0.1, triggerOnce: true });

  return (
    <section
      ref={ref}
      id={id}
      className={`py-16 sm:py-24 transition-all duration-1000 ${className || ''} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
    >
      {children}
    </section>
  );
};

// FIX: Add 'pt-BR' to the languages array to match the updated Language type and resolve type errors.
const languages = [
    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'pt-BR', name: 'Português', flag: '🇧🇷' }
] as const;

const ChevronDownIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
);


const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const currentLanguage = languages.find(l => l.code === language) || languages[0];

  const languageDropdown = (
      <Dropdown
            trigger={
                <button className="flex items-center w-full space-x-2 p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none">
                    <span className="text-lg">{currentLanguage.flag}</span>
                    <span className="text-sm font-medium">{currentLanguage.name}</span>
                    <ChevronDownIcon />
                </button>
            }
        >
            {languages.map(lang => (
                <DropdownItem
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`flex items-center space-x-2 ${language === lang.code ? 'bg-accent font-semibold text-accent-foreground' : ''}`}
                >
                    <span className="text-lg">{lang.flag}</span>
                    <span>{lang.name}</span>
                </DropdownItem>
            ))}
        </Dropdown>
  );

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled || isOpen ? 'bg-background/80 dark:bg-background/80 backdrop-blur-sm shadow-md' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold font-serif text-primary">localDify</Link>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/pricing" className="text-foreground hover:text-primary transition-colors font-medium">Pricing</Link>
            {languageDropdown}
            <Link to="/login" className="text-foreground hover:text-primary transition-colors font-medium">{t('signInButton')}</Link>
            <Link to="/register" className="inline-block bg-primary text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm">{t('home.header.startFreeTrial')}</Link>
          </div>
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-foreground hover:text-primary" aria-label="Open navigation menu">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16m-7 6h7"} /></svg>
            </button>
          </div>
        </div>
        {isOpen && (
          <div className="md:hidden pb-4">
            <div className="space-y-2">
                <Link to="/pricing" onClick={() => setIsOpen(false)} className="block px-4 py-2 text-foreground hover:text-primary transition-colors font-medium">Pricing</Link>
                <div className="px-2">{languageDropdown}</div>
                <Link to="/login" onClick={() => setIsOpen(false)} className="block px-4 py-2 text-foreground hover:text-primary transition-colors font-medium">{t('signInButton')}</Link>
                <Link to="/register" onClick={() => setIsOpen(false)} className="block w-full text-center bg-primary text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors shadow-sm">{t('home.header.startFreeTrial')}</Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

const Hero: React.FC<{ content: any; lang: Language }> = ({ content, lang }) => {
    const T = (field: any) => (field && (field[lang] || field['en'])) || '';
    return (
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 text-center bg-background overflow-hidden">
            <div
                className="absolute top-0 left-0 w-full h-full opacity-30 dark:opacity-10"
                style={{ backgroundImage: 'radial-gradient(var(--accent) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
            ></div>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <h1 className="text-4xl md:text-6xl font-bold font-serif text-foreground tracking-tight" dangerouslySetInnerHTML={{ __html: T(content.title) }}>
                </h1>
                <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
                    {T(content.subtitle)}
                </p>
                <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link to="/register" className="w-full sm:w-auto inline-block bg-primary text-white font-semibold px-8 py-3.5 rounded-lg hover:bg-primary/90 transition-all duration-300 shadow-lg hover:shadow-primary/40 transform hover:-translate-y-1 text-lg">
                        {T(content.cta)}
                    </Link>
                </div>
                <div className="mt-8 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: T(content.subCta) }}>
                </div>
            </div>
            <div className="relative mt-16 lg:mt-24">
                <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-background to-transparent z-10"></div>
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent z-10"></div>
                <img src="https://i.imgur.com/QJH1Y1N.jpeg" alt="localDify Dashboard Preview" className="max-w-4xl mx-auto rounded-xl shadow-2xl ring-1 ring-black/5" />
            </div>
        </section>
    )
};

const Features: React.FC<{ content: any; lang: Language }> = ({ content, lang }) => {
    const T = (field: any) => (field && (field[lang] || field['en'])) || '';
    return (
    <AnimatedSection className="bg-muted" id="features">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
                <h2 className="text-3xl font-bold font-serif text-foreground sm:text-4xl">{T(content.title)}</h2>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">{T(content.subtitle)}</p>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {content.items.map((feature: any, index: number) => (
                <div key={index} className="bg-card rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden transform hover:-translate-y-1">
                  <div className="bg-secondary border-b border-border">
                    <img src={feature.imageUrl} alt={T(feature.title)} className="w-full h-48 object-cover object-top" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold font-serif text-card-foreground">{T(feature.title)}</h3>
                    <p className="mt-2 text-base text-muted-foreground">{T(feature.description)}</p>
                  </div>
                </div>
            ))}
            </div>
        </div>
    </AnimatedSection>
    );
};

const WhoItsFor: React.FC<{ content: any; lang: Language }> = ({ content, lang }) => {
    const T = (field: any) => (field && (field[lang] || field['en'])) || '';
    return (
        <AnimatedSection id="who-its-for" className="bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold font-serif text-foreground sm:text-4xl">{T(content.title)}</h2>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">{T(content.subtitle)}</p>
                </div>
                <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6">
                    {content.items.map((type: any, index: number) => (
                        <div key={index} className="relative aspect-[3/4] group rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                            <img src={type.imageUrl} alt={T(type.name)} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 p-4 text-white">
                                <h3 className="font-semibold text-lg">{T(type.name)}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AnimatedSection>
    )
};

const AccordionItem: React.FC<{ question: string; answer: string; }> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-border py-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left text-lg font-medium text-foreground hover:text-primary"
        aria-expanded={isOpen}
      >
        <span>{question}</span>
        <svg
          className={`w-5 h-5 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`grid overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <p className="text-muted-foreground">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
};

const FAQ: React.FC<{ content: any; lang: Language }> = ({ content, lang }) => {
  const T = (field: any) => (field && (field[lang] || field['en'])) || '';
  return (
    <AnimatedSection id="faq" className="bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold font-serif text-foreground sm:text-4xl">{T(content.title)}</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">{T(content.subtitle)}</p>
        </div>
        <div className="mt-12 max-w-3xl mx-auto">
          {content.items.map((item: any, index: number) => (
            <AccordionItem key={index} question={T(item.question)} answer={T(item.answer)} />
          ))}
        </div>
      </div>
    </AnimatedSection>
  );
};

const Testimonials: React.FC<{ content: any; lang: Language }> = ({ content, lang }) => {
    const T = (field: any) => (field && (field[lang] || field['en'])) || '';
    const Star: React.FC = () => <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>;
    
    return (
        <AnimatedSection id="testimonials" className="bg-muted">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold font-serif text-foreground sm:text-4xl">{T(content.title)}</h2>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">{T(content.subtitle)}</p>
                </div>
                <div className="mt-16 grid gap-8 lg:grid-cols-3">
                    {content.items.map((t: any, index: number) => (
                        <div key={index} className="bg-card p-8 rounded-2xl shadow-lg">
                            <div className="flex items-center">
                                {[...Array(t.rating)].map((_, i) => <Star key={i} />)}
                            </div>
                            <p className="text-muted-foreground text-lg mt-4">"{T(t.quote)}"</p>
                            <div className="mt-6 flex items-center">
                                <img src={t.avatarUrl} alt={T(t.name)} className="w-12 h-12 rounded-full object-cover"/>
                                <div className="ltr:ml-4 rtl:mr-4">
                                    <p className="font-bold text-card-foreground">{T(t.name)}</p>
                                    <p className="text-muted-foreground text-sm">{T(t.title)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AnimatedSection>
    );
};

const Cta: React.FC<{ content: any; lang: Language }> = ({ content, lang }) => {
    const T = (field: any) => (field && (field[lang] || field['en'])) || '';
    return (
    <AnimatedSection id="cta" className="bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-primary rounded-2xl p-10 md:p-16 text-center shadow-2xl shadow-primary/30">
                <h2 className="text-3xl font-bold font-serif text-white sm:text-4xl">{T(content.title)}</h2>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-primary-foreground/80">{T(content.subtitle)}</p>
                <div className="mt-8">
                    <Link to="/register" className="inline-block bg-white text-primary font-semibold px-10 py-4 rounded-lg hover:bg-gray-100 transition-colors shadow-lg text-lg transform hover:scale-105">
                        {T(content.cta)}
                    </Link>
                </div>
                 <p className="mt-4 text-sm text-primary-foreground/70">{T(content.subCta)}</p>
            </div>
        </div>
    </AnimatedSection>
    )
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
}

const Home: React.FC = () => {
    const { language } = useLanguage();
    const { content } = { content: pageContent };

    return (
        <div className="bg-background text-foreground antialiased">
            <Header />
            <main>
                <Hero content={content.hero} lang={language} />
                <Features content={content.features} lang={language} />
                <WhoItsFor content={content.whoItsFor} lang={language} />
                <Testimonials content={content.testimonials} lang={language} />
                <FAQ content={content.faq} lang={language} />
                <Cta content={content.cta} lang={language} />
            </main>
            <Footer />
        </div>
    );
}

export default Home;
