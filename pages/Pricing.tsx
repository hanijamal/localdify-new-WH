import React, { useState, useEffect } from 'react';
// FIX: Added missing useParams import to resolve reference errors.
import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import Spinner from '../components/ui/Spinner';
import Card, { CardContent, CardHeader, CardFooter } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getSystemSetting } from '../services/supabaseService';
import { SubscriptionPlansSetting } from '../types';

const pageContent = {
    "title": { "en": "Simple, Transparent Pricing", "ar": "تسعير بسيط وشفاف" },
    "subtitle": { "en": "Choose the plan that''s right for your business. No hidden fees, ever. Start your 14-day free trial today.", "ar": "اختر الخطة المناسبة لعملك. لا توجد رسوم خفية على الإطلاق. ابدأ تجربتك المجانية لمدة 14 يومًا اليوم." },
    "plans": [
      {
        "name": { "en": "Pro Plan", "ar": "خطة برو" },
        "price": "19.00",
        "period": { "en": "per month", "ar": "شهريا" },
        "cta": { "en": "Start 14-Day Free Trial", "ar": "ابدأ الفترة التجريبية المجانية لمدة 14 يومًا" },
        "status": "available",
        "features": [
          { "en": "Unlimited services", "ar": "خدمات غير محدودة" },
          { "en": "Unlimited staff", "ar": "موظفون غير محدودين" },
          { "en": "Unlimited booking", "ar": "حجوزات غير محدودة" },
          { "en": "One Template page", "ar": "صفحة قالب واحدة" },
          { "en": "One Location", "ar": "موقع واحد" },
          { "en": "Email automation (300 emails/month)", "ar": "أتمتة البريد الإلكتروني (300 بريد إلكتروني/شهر)" },
          { "en": "Dashboard for analytics", "ar": "لوحة تحكم للتحليلات" }
        ]
      },
      {
        "name": { "en": "Business Plan", "ar": "خطة الأعمال" },
        "price": "49.00",
        "period": { "en": "per month", "ar": "شهريا" },
        "cta": { "en": "Coming Soon", "ar": "قريبا" },
        "status": "coming_soon",
        "features": [
          { "en": "Everything in Pro Plan", "ar": "كل شيء في خطة برو" },
          { "en": "All professional templates", "ar": "جميع القوالب الاحترافية" },
          { "en": "Unlimited Locations", "ar": "مواقع غير محدودة" },
          { "en": "Unlimited Email/WhatsApp automation", "ar": "أتمتة غير محدودة للبريد الإلكتروني/واتساب" }
        ]
      }
    ],
    "testimonial": {
      "quote": { "en": "localDify has revolutionized how we manage appointments. We''ve seen a 30% reduction in no-shows and our clients love the easy online booking!", "ar": "لقد أحدث localDify ثورة في كيفية إدارتنا للمواعيد. لقد شهدنا انخفاضًا بنسبة 30٪ في حالات عدم الحضور ويحب عملاؤنا سهولة الحجز عبر الإنترنت!" },
      "name": { "en": "Maria Garcia", "ar": "ماريا غارسيا" },
      "title": { "en": "Owner, Serenity Spa", "ar": "صاحبة، سبا الصفاء" }
    },
    "featureComparison": {
      "title": { "en": "Every Feature, Perfectly Planned", "ar": "كل ميزة، مخطط لها بإتقان" },
      "categories": [
        {
          "name": { "en": "Core Features", "ar": "الميزات الأساسية" },
          "features": [
            { "name": { "en": "Bookings per month", "ar": "الحجوزات شهريًا" }, "pro": { "en": "Unlimited", "ar": "غير محدود" }, "business": { "en": "Unlimited", "ar": "غير محدود" } },
            { "name": { "en": "Services", "ar": "الخدمات" }, "pro": { "en": "Unlimited", "ar": "غير محدود" }, "business": { "en": "Unlimited", "ar": "غير محدود" } },
            { "name": { "en": "Staff Members", "ar": "أعضاء الفريق" }, "pro": { "en": "Unlimited", "ar": "غير محدود" }, "business": { "en": "Unlimited", "ar": "غير محدود" } },
            { "name": { "en": "Locations", "ar": "المواقع" }, "pro": "1", "business": { "en": "Unlimited", "ar": "غير محدود" } }
          ]
        },
        // FIX: Removed a large block of corrupted, pasted-in file content and replaced it with a valid object.
        {
          "name": { "en": "Automation & Support", "ar": "الأتمتة والدعم" },
          "features": [
            { "name": { "en": "Email Automations", "ar": "أتمتة البريد الإلكتروني" }, "pro": { "en": "300 / month", "ar": "300 / شهر" }, "business": { "en": "Unlimited", "ar": "غير محدود" } },
            { "name": { "en": "WhatsApp Automations", "ar": "أتمتة الواتساب" }, "pro": { "en": "Coming Soon", "ar": "قريبا" }, "business": { "en": "Unlimited", "ar": "غير محدود" } },
            { "name": { "en": "Custom Page Templates", "ar": "قوالب صفحات مخصصة" }, "pro": { "en": "Standard Only", "ar": "القياسي فقط" }, "business": { "en": "All Templates", "ar": "جميع القوالب" } },
            { "name": { "en": "Support", "ar": "الدعم" }, "pro": { "en": "Standard", "ar": "قياسي" }, "business": { "en": "Priority", "ar": "أولوية" } }
          ]
        }
      ]
    },
    "faq": {
      "title": { "en": "Frequently Asked Questions", "ar": "الأسئلة الشائعة" },
      "subtitle": { "en": "Have questions? We''ve got answers. If you can''t find what you''re looking for, feel free to contact us.", "ar": "هل لديك أسئلة؟ لدينا إجابات. إذا لم تتمكن من العثور على ما تبحث عنه، فلا تتردد في الاتصال بنا." },
      "items": [
        { 
          "question": { "en": "How much does localDify cost after the free trial?", "ar": "كم تبلغ تكلفة localDify بعد الفترة التجريبية المجانية؟" },
          "answer": { "en": "Our Pro plan starts at just $19.00 per month. There are no hidden fees, and you can cancel anytime.", "ar": "تبدأ خطتنا الاحترافية بسعر 19.00 دولارًا أمريكيًا فقط في الشهر. لا توجد رسوم خفية، ويمكنك الإلغاء في أي وقت." }
        },
        {
          "question": { "en": "Can I customize the look of my booking page?", "ar": "هل يمكنني تخصيص مظهر صفحة الحجز الخاصة بي؟" },
          "answer": { "en": "Absolutely! You have full control over colors, fonts, your logo, and a gallery of images. Our live theme editor lets you see your changes instantly.", "ar": "بالتأكيد! لديك سيطرة كاملة على الألوان والخطوط وشعارك ومعرض الصور. يتيح لك محرر المظاهر المباشر رؤية تغييراتك على الفور." }
        },
        {
          "question": { "en": "Is there a limit to the number of bookings I can take?", "ar": "هل هناك حد لعدد الحجوزات التي يمكنني تلقيها؟" },
          "answer": { "en": "No, all of our plans include unlimited bookings, unlimited services, and unlimited staff members. We believe in simple pricing without penalizing you for your growth.", "ar": "لا، جميع خططنا تشمل حجوزات غير محدودة وخدمات غير محدودة وأعضاء فريق غير محدودين. نحن نؤمن بالتسعير البسيط دون معاقبتك على نموك." }
        }
      ]
    },
    "cta": {
      "title": { "en": "Ready to Simplify Your Schedule?", "ar": "هل أنت مستعد لتبسيط جدولك؟" },
      "cta": { "en": "Get Started for Free", "ar": "ابدأ مجانًا" }
    }
  };


const Pricing: React.FC = () => {
    // FIX: Removed unnecessary useState and useEffect hooks as plan prices are now static.
    const { language, t } = useLanguage();

    const T = (field: any) => (field && (field[language] || field['en'])) || (typeof field === 'string' ? field : '');

    return (
        <div className="bg-background">
            {/* Header section (can be a separate component) */}
            <header className="py-4 bg-card border-b border-border sticky top-0 z-10">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <Link to="/" className="text-2xl font-bold font-serif text-primary">localDify</Link>
                </div>
            </header>

            <main>
                <section className="text-center py-20 px-4">
                    <h1 className="text-4xl md:text-5xl font-bold font-serif">{T(pageContent.title)}</h1>
                    <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">{T(pageContent.subtitle)}</p>
                </section>
                
                {/* Pricing Plans */}
                <section className="pb-20 px-4">
                    <div className="container mx-auto max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
                        {pageContent.plans.map((plan, index) => (
                            <Card key={index} className={`flex flex-col ${plan.name.en === 'Business Plan' ? 'border-primary border-2' : ''}`}>
                                <CardHeader>
                                    <h3 className="text-2xl font-bold">{T(plan.name)}</h3>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <div className="py-6">
                                        <span className="text-5xl font-bold">${plan.price}</span>
                                        <span className="text-muted-foreground"> {T(plan.period)}</span>
                                    </div>
                                    <ul className="space-y-3">
                                        {plan.features.map((feature, fIndex) => (
                                            <li key={fIndex} className="flex items-start">
                                                <svg className="w-5 h-5 text-green-500 flex-shrink-0 mr-3 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                <span>{T(feature)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                                <CardFooter>
                                    {/* FIX: Conditionally render a disabled button or an anchor tag based on plan status. This resolves the TypeScript error by not passing a `disabled` prop to the anchor variant of the Button component. */}
                                    {plan.status === 'coming_soon' ? (
                                        <Button className="w-full text-lg py-3" disabled>
                                            {T(plan.cta)}
                                        </Button>
                                    ) : (
                                        <Button as="a" href="/register" className="w-full text-lg py-3">
                                            {T(plan.cta)}
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* Testimonial Section */}
                <section className="bg-muted py-20 px-4">
                    <div className="container mx-auto max-w-3xl text-center">
                        <p className="text-xl italic text-foreground">"{T(pageContent.testimonial.quote)}"</p>
                        <p className="mt-6 font-bold">{T(pageContent.testimonial.name)}</p>
                        <p className="text-muted-foreground">{T(pageContent.testimonial.title)}</p>
                    </div>
                </section>

                {/* Feature Comparison Table */}
                <section className="py-20 px-4">
                    <div className="container mx-auto max-w-5xl">
                        <h2 className="text-3xl font-bold font-serif text-center mb-12">{T(pageContent.featureComparison.title)}</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr>
                                        <th className="p-4 w-1/2"></th>
                                        <th className="p-4 text-center">Pro Plan</th>
                                        <th className="p-4 text-center border-2 border-primary rounded-t-lg">Business Plan</th>
                                    </tr>
                                </thead>
                                {pageContent.featureComparison.categories.map((category, cIndex) => (
                                    <tbody key={cIndex}>
                                        <tr className="bg-muted">
                                            <td colSpan={3} className="p-4 font-bold text-lg">{T(category.name)}</td>
                                        </tr>
                                        {category.features.map((feature, fIndex) => (
                                            <tr key={fIndex} className="border-b border-border">
                                                <td className="p-4">{T(feature.name)}</td>
                                                <td className="p-4 text-center font-medium">{T(feature.pro)}</td>
                                                <td className="p-4 text-center font-medium">{T(feature.business)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                ))}
                            </table>
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="bg-muted py-20 px-4">
                    <div className="container mx-auto max-w-3xl">
                         <h2 className="text-3xl font-bold font-serif text-center mb-12">{T(pageContent.faq.title)}</h2>
                         <div className="space-y-4">
                            {pageContent.faq.items.map((item, index) => (
                                <Card key={index}>
                                    <CardHeader>
                                        <h3 className="font-semibold">{T(item.question)}</h3>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-muted-foreground">{T(item.answer)}</p>
                                    </CardContent>
                                </Card>
                            ))}
                         </div>
                    </div>
                </section>

                {/* Final CTA */}
                <section className="text-center py-20 px-4">
                    <h2 className="text-3xl font-bold font-serif">{T(pageContent.cta.title)}</h2>
                    <div className="mt-8">
                        <Button as="a" href="/register" size="lg">{T(pageContent.cta.cta)}</Button>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Pricing;