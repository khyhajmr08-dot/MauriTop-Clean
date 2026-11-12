/**
 * MAURITOP Structured Data Generator (JSON-LD)
 * Fully compliant with Schema.org & Google Search Essentials.
 * Zero fake reviews/ratings; 100% authentic services, pricing (MRU), and local payment methods.
 */

import type { Service } from '../types';

export const SITE_URL = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
  ? window.location.origin
  : 'https://mauritop-v2-4ozx.vercel.app';
export const SITE_NAME = 'MAURITOP';
export const SITE_LOGO = `${SITE_URL}/icon.png`;
export const SITE_IMAGE = `${SITE_URL}/og-image.jpg`;
export const SITE_DESCRIPTION = 'MAURITOP منصة موريتانية لشحن الألعاب والخدمات الرقمية، منها Free Fire وPUBG Mobile وCall of Duty Mobile وبطاقات Google Play وiTunes.';

/**
 * Organization Schema
 */
export function getOrganizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'MAURITOP',
    alternateName: ['موري توب', 'MauriTop', 'MauriTop Mauritanie'],
    url: `${SITE_URL}/`,
    logo: SITE_LOGO,
    image: SITE_IMAGE,
    description: SITE_DESCRIPTION,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Nouakchott',
      addressCountry: 'MR'
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+22232014902',
      contactType: 'customer service',
      areaServed: 'MR',
      availableLanguage: ['Arabic', 'French']
    },
    sameAs: [
      'https://wa.me/22232014902'
    ]
  };
}

/**
 * WebSite Schema with SearchAction
 */
export function getWebSiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: `${SITE_URL}/`,
    name: 'MAURITOP',
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'ar-MR'
  };
}

/**
 * WebPage Schema
 */
export function getWebPageSchema(title: string, description: string, urlPath: string = '') {
  const pageUrl = `${SITE_URL}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
  return {
    '@type': 'WebPage',
    '@id': `${pageUrl}#webpage`,
    url: pageUrl,
    name: title,
    description: description,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    inLanguage: 'ar-MR'
  };
}

/**
 * Breadcrumb Schema
 */
export function getBreadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${SITE_URL}/#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path.startsWith('/') ? '' : '/'}${item.path}`
    }))
  };
}

/**
 * Product / Service Offer Schema for individual services
 */
export function getProductServiceSchema(service: Service) {
  const serviceUrl = `${SITE_URL}/services/${service.id}`;
  const rawPrice = service.priceMru ?? service.suggestedPrice ?? (service.isFixedPrice ? service.fixedPrice : undefined);
  const numericPrice = typeof rawPrice === 'number' && rawPrice > 0 ? rawPrice : null;
  const image = service.imageUrl || service.image || SITE_IMAGE;
  const fullImage = image.startsWith('http') ? image : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`;

  const nameAr = service.nameAr || service.name;
  const desc = service.descriptionAr || service.description || `خدمة شحن ${nameAr} في موريتانيا بالدفع عبر بنكيلي وسداد وغزة باي بالأوقية MRU.`;

  const offerObj: Record<string, any> = {
    '@type': 'Offer',
    url: serviceUrl,
    priceCurrency: 'MRU',
    availability: service.status === 'متوقف' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    itemCondition: 'https://schema.org/NewCondition',
    seller: {
      '@id': `${SITE_URL}/#organization`
    }
  };

  if (numericPrice !== null) {
    offerObj.price = numericPrice;
    offerObj.priceValidUntil = '2027-12-31';
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      getOrganizationSchema(),
      {
        '@type': 'Product',
        '@id': `${serviceUrl}#product`,
        name: `شحن ${nameAr} في موريتانيا | موري توب`,
        description: desc,
        image: fullImage,
        category: service.categoryAr || service.category || 'ألعاب إلكترونية',
        brand: {
          '@type': 'Brand',
          name: service.name
        },
        offers: offerObj
      },
      getBreadcrumbSchema([
        { name: 'الرئيسية', path: '/' },
        { name: 'الخدمات والألعاب', path: '/#services' },
        { name: nameAr, path: `/services/${service.id}` }
      ])
    ]
  };
}

/**
 * FAQ Schema for Homepage - strictly matches on-page DOM text
 */
export function getFAQSchema() {
  return {
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/#faq`,
    mainEntity: [
      {
        '@type': 'Question',
        name: 'كيف أطلب شحن لعبة أو خدمة رقمية؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'اختر الخدمة المطلوبة من الصفحة الرئيسية أو قائمة الخدمات، حدد الباقة أو القيمة المطلوبة، أدخل معرف اللاعب (ID) أو البيانات المطلوبة للخدمة، ثم تابع خطوات الدفع وتأكيد الطلب.'
        }
      },
      {
        '@type': 'Question',
        name: 'كيف أدفع وأرفع إيصال التحويل؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'يظهر لك في صفحة الطلب رقم الحساب المعتمد لوسيلة الدفع المختارة (مثل بنكيلي أو سداد). قم بتحويل المبلغ المحدد عبر تطبيقك البنكي، ثم أدخل رقم هاتفك المُرسِل وأرفق لقطة شاشة لإشعار التحويل (الإيصال) لإتمام الإرسال.'
        }
      },
      {
        '@type': 'Question',
        name: 'كيف أتابع حالة طلبي؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'بعد إرسال الطلب، يمكنك متابعة حالته مباشرة من صفحة \'طلباتي\' في حال كنت مسجلاً للدخول، أو عبر رمز ورابط تتبع الطلب المخصص لطلبات الزوار لمعرفة مراحل المعالجة حتى الاكتمال.'
        }
      },
      {
        '@type': 'Question',
        name: 'هل أحتاج إلى إنشاء حساب؟',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'يمكنك إنشاء طلب ومتابعته برمز التتبع المخصص، كما يتيح لك تسجيل الحساب حفظ سجل طلباتك السابقة ومراجعتها في أي وقت بسهولة وأمان.'
        }
      }
    ]
  };
}

/**
 * ItemList Schema for Top Gaming & Digital Services (Enables Google Rich Carousel)
 */
export function getPopularServicesItemListSchema() {
  const items = [
    {
      name: "شحن شدات ببجي موبايل (PUBG Mobile)",
      url: `${SITE_URL}/services/pubg`,
      image: `${SITE_URL}/assets/images/pubg_service_1779283143166.png`,
      price: 75,
      description: "شحن شدات ببجي موبايل PUBG Mobile فوري ومباشر في موريتانيا بالأوقية MRU."
    },
    {
      name: "شحن جواهر فري فاير (Free Fire)",
      url: `${SITE_URL}/services/freefire`,
      image: `${SITE_URL}/assets/images/freefire_service_1779283121131.png`,
      price: 50,
      description: "شحن جواهر Free Fire في موريتانيا بسرعة وأمان عبر بنكيلي وسداد وغزة باي."
    },
    {
      name: "شحن كول أوف ديوتي موبايل (Call of Duty Mobile)",
      url: `${SITE_URL}/services/cod-mobile`,
      image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400",
      price: 100,
      description: "شحن CP كول أوف ديوتي موبايل رسمي ومضمون في موريتانيا."
    },
    {
      name: "اشتراك نتفليكس (Netflix) - شهر واحد",
      url: `${SITE_URL}/services/netflix`,
      image: `${SITE_URL}/assets/images/netflix_service_1779283170112.png`,
      price: 250,
      description: "اشتراك نتفليكس رسمي بجودة 4K UHD بدون انقطاع أو توقف."
    },
    {
      name: "اشتراك تود (TOD VIP) - شهر واحد",
      url: `${SITE_URL}/services/tod-vip`,
      image: "https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?auto=format&fit=crop&q=80&w=400",
      price: 180,
      description: "اشتراك TOD VIP لمتابعة أهم المباريات والبطولات الرياضية في موريتانيا."
    },
    {
      name: "اشتراك شاهد (Shahid VIP) - شهر واحد",
      url: `${SITE_URL}/services/shahid-vip`,
      image: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=400",
      price: 150,
      description: "اشتراك شاهد VIP لمشاهدة المسلسلات والأفلام الحصرية بدون إعلانات."
    }
  ];

  return {
    '@type': 'ItemList',
    '@id': `${SITE_URL}/#services-list`,
    name: 'أبرز خدمات وألعاب الشحن في موريتانيا - MAURITOP',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Product',
        name: item.name,
        url: item.url,
        image: item.image,
        description: item.description,
        brand: {
          '@type': 'Brand',
          name: 'MAURITOP'
        },
        offers: {
          '@type': 'Offer',
          price: item.price,
          priceCurrency: 'MRU',
          priceValidUntil: '2027-12-31',
          availability: 'https://schema.org/InStock',
          url: item.url
        }
      }
    }))
  };
}

/**
 * Combined Homepage Schema Graph
 */
export function getHomepageCombinedSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      getOrganizationSchema(),
      getWebSiteSchema(),
      getWebPageSchema(
        'MAURITOP | شحن الألعاب والخدمات الرقمية في موريتانيا',
        SITE_DESCRIPTION,
        '/'
      ),
      getBreadcrumbSchema([
        { name: 'الرئيسية', path: '/' }
      ]),
      getPopularServicesItemListSchema(),
      getFAQSchema()
    ]
  };
}
