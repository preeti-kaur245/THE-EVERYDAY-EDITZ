import React, { useEffect } from 'react';
import { useStore, isProductLiveOnStorefront } from '../context/StoreContext';

const CANONICAL_ORIGIN = 'https://everyday_editz.in';

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!content) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function resolveAbsoluteImage(img?: string): string {
  if (!img) return `${CANONICAL_ORIGIN}/brand-logo.jpg`;
  if (img.startsWith('http://') || img.startsWith('https://')) return img;
  if (img.startsWith('data:')) return `${CANONICAL_ORIGIN}/brand-logo.jpg`;
  return `${CANONICAL_ORIGIN}${img.startsWith('/') ? '' : '/'}${img}`;
}

export const SEOHead: React.FC = () => {
  const {
    selectedProduct,
    routeView,
    selectedDepartment,
    selectedSubcategory,
    departments,
    settings,
    isAdminOpen,
    isAdminLoginModalOpen,
    isCartOpen,
    isCheckoutOpen,
    isAccountOpen,
    isSearchOpen,
    activePriceTier,
    selectedNeed,
    selectedCategory,
  } = useStore();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const isPrivateOverlay =
      isAdminOpen ||
      isAdminLoginModalOpen ||
      isCartOpen ||
      isCheckoutOpen ||
      isAccountOpen ||
      isSearchOpen;

    const hasDuplicateFilterParams =
      activePriceTier !== 'all' || Boolean(selectedNeed) || Boolean(selectedCategory);

    let title = 'The Everyday Editz — Smart Finds. Fair Prices. Everyday Value.';
    let description =
      'Everyday Finds. Small-Business-Friendly Prices. Thoughtfully curated home organisation, travel, women, men, and kids essentials across India.';
    let cleanPath = '/';
    let ogType = 'website';
    let ogImage = `${CANONICAL_ORIGIN}/brand-logo.jpg`;
    let shouldNoindex = isPrivateOverlay || hasDuplicateFilterParams;

    const jsonLdSchemas: Record<string, any>[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'The Everyday Editz',
        legalName: 'Raftaar Solutions',
        url: `${CANONICAL_ORIGIN}/`,
        logo: `${CANONICAL_ORIGIN}/brand-logo.jpg`,
        email: 'manpreetkaurdeveloper2@gmail.com',
        sameAs: ['https://www.instagram.com/everyday_editz.in/'],
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Mandi Gobindgarh',
          addressRegion: 'Punjab',
          postalCode: '147301',
          addressCountry: 'IN',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'The Everyday Editz',
        url: `${CANONICAL_ORIGIN}/`,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${CANONICAL_ORIGIN}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ];

    if (selectedProduct && isProductLiveOnStorefront(selectedProduct)) {
      const slug = selectedProduct.slug || selectedProduct.id;
      cleanPath = `/product/${encodeURIComponent(slug)}`;
      title = selectedProduct.seoTitle?.trim()
        ? selectedProduct.seoTitle.trim()
        : `${selectedProduct.name} | The Everyday Editz`;
      description = (
        selectedProduct.seoDescription?.trim() ||
        selectedProduct.tagline ||
        selectedProduct.editorial?.everydayEdit ||
        description
      ).slice(0, 160);
      ogType = 'product';
      ogImage = resolveAbsoluteImage(selectedProduct.primaryImage || selectedProduct.images?.[0]);

      const primaryDept = selectedProduct.departments?.[0];
      const primaryDeptCfg = departments.find((d) => d.id === primaryDept);

      const breadcrumbItems: any[] = [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${CANONICAL_ORIGIN}/`,
        },
      ];
      if (primaryDeptCfg) {
        breadcrumbItems.push({
          '@type': 'ListItem',
          position: 2,
          name: primaryDeptCfg.name,
          item: `${CANONICAL_ORIGIN}/category/${primaryDeptCfg.id}`,
        });
      }
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: breadcrumbItems.length + 1,
        name: selectedProduct.name,
        item: `${CANONICAL_ORIGIN}${cleanPath}`,
      });

      jsonLdSchemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbItems,
      });

      const isAvailable =
        selectedProduct.inStock && (selectedProduct.stockCount ?? 0) > 0;

      const productSchema: Record<string, any> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: selectedProduct.name,
        description,
        image: (selectedProduct.images && selectedProduct.images.length > 0
          ? selectedProduct.images
          : [selectedProduct.primaryImage || '/brand-logo.jpg']
        ).map(resolveAbsoluteImage),
        sku: selectedProduct.sku || selectedProduct.id,
        category: primaryDeptCfg?.name || selectedProduct.category || 'Everyday Essentials',
        brand: {
          '@type': 'Brand',
          name: 'The Everyday Editz',
        },
        offers: {
          '@type': 'Offer',
          url: `${CANONICAL_ORIGIN}${cleanPath}`,
          priceCurrency: 'INR',
          price: Number(selectedProduct.price),
          availability: isAvailable
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: {
            '@type': 'Organization',
            name: 'The Everyday Editz',
          },
        },
      };

      // Strictly include ratings/reviews only when genuine verified reviews exist
      if (
        Array.isArray(selectedProduct.reviews) &&
        selectedProduct.reviews.length > 0 &&
        selectedProduct.rating > 0
      ) {
        const avg =
          selectedProduct.reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) /
          selectedProduct.reviews.length;
        productSchema.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: Number(avg.toFixed(1)),
          reviewCount: selectedProduct.reviews.length,
        };
        productSchema.review = selectedProduct.reviews.slice(0, 5).map((r) => ({
          '@type': 'Review',
          author: {
            '@type': 'Person',
            name: r.author,
          },
          datePublished: r.date,
          reviewBody: r.comment,
          name: r.title,
          reviewRating: {
            '@type': 'Rating',
            ratingValue: r.rating,
            bestRating: 5,
            worstRating: 1,
          },
        }));
      }

      jsonLdSchemas.push(productSchema);
    } else if (routeView === 'department' && selectedDepartment) {
      const deptCfg = departments.find((d) => d.id === selectedDepartment);
      const deptName = deptCfg?.name || selectedDepartment;
      cleanPath = `/category/${selectedDepartment}`;
      if (selectedSubcategory) {
        // Canonical always points to the clean parent category URL to avoid filter duplicate indexing
        shouldNoindex = true;
      }
      title = selectedSubcategory
        ? `${deptName} — ${selectedSubcategory} | The Everyday Editz`
        : `${deptName} Essentials & Curations | The Everyday Editz`;
      description = (
        deptCfg?.description ||
        `Explore curated ${deptName} everyday essentials at small-business-friendly prices on The Everyday Editz.`
      ).slice(0, 160);

      jsonLdSchemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${CANONICAL_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: deptName,
            item: `${CANONICAL_ORIGIN}${cleanPath}`,
          },
        ],
      });
    } else if (routeView === 'new-arrivals') {
      cleanPath = '/new-arrivals';
      title = 'New Arrivals — Latest Everyday Finds | The Everyday Editz';
      description =
        'Discover newly added travel organisers, workspace upgrades, self-care tools, and household essentials at fair everyday prices in India.';
      jsonLdSchemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${CANONICAL_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'New Arrivals',
            item: `${CANONICAL_ORIGIN}/new-arrivals`,
          },
        ],
      });
    } else if (routeView === 'everyday-essentials') {
      cleanPath = '/everyday-essentials';
      title = 'Everyday Essentials — Smart Practical Finds | The Everyday Editz';
      description =
        'Everyday Finds. Small-Business-Friendly Prices. Browse durable daily essentials across Women, Men, Kids, and Home & Lifestyle.';
      jsonLdSchemas.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${CANONICAL_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Everyday Essentials',
            item: `${CANONICAL_ORIGIN}/everyday-essentials`,
          },
        ],
      });
    } else if (routeView === 'login') {
      cleanPath = '/login';
      title = 'Sign In — The Everyday Editz';
      description = 'Sign in to your Everyday Editz account to manage orders, saved addresses, and wishlist.';
      shouldNoindex = true;
    } else if (routeView === 'register') {
      cleanPath = '/register';
      title = 'Create Account — The Everyday Editz';
      description = 'Create your Everyday Editz account for seamless checkout, order tracking, and member rewards.';
      shouldNoindex = true;
    } else if (routeView === 'forgot-password' || routeView === 'reset-password') {
      cleanPath = `/${routeView}`;
      title = 'Reset Password — The Everyday Editz';
      description = 'Securely recover access to your Everyday Editz account.';
      shouldNoindex = true;
    } else if (routeView === 'account') {
      cleanPath = '/account';
      title = 'My Account — The Everyday Editz';
      description = 'Manage your profile, orders, saved addresses, and account security.';
      shouldNoindex = true;
    } else if (routeView === 'admin') {
      cleanPath = '/admin';
      title = 'Operations Portal — The Everyday Editz';
      description = 'Private store operations portal.';
      shouldNoindex = true;
    } else if (routeView === 'staff' || routeView === 'staff-login') {
      cleanPath = routeView === 'staff' ? '/staff' : '/staff/login';
      title = 'Staff Portal — The Everyday Editz';
      description = 'Authorized staff operations workspace for The Everyday Editz.';
      shouldNoindex = true;
    } else if (routeView === 'not-found') {
      cleanPath = '/404';
      title = 'Page Not Found (404) | The Everyday Editz';
      description = 'The page you requested could not be found. Browse our curated everyday finds and categories.';
      shouldNoindex = true;
    }

    const canonicalUrl = `${CANONICAL_ORIGIN}${cleanPath}`;

    document.title = title;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'robots', shouldNoindex ? 'noindex, nofollow' : 'index, follow');
    upsertLink('canonical', canonicalUrl);

    if (settings.googleSiteVerification) {
      upsertMeta('name', 'google-site-verification', settings.googleSiteVerification.trim());
    } else {
      upsertMeta('name', 'google-site-verification', '');
    }

    // OpenGraph & Twitter Cards
    upsertMeta('property', 'og:site_name', 'The Everyday Editz');
    upsertMeta('property', 'og:type', ogType);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('property', 'og:image', ogImage);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', ogImage);

    // JSON-LD Structured Data
    const existingScript = document.getElementById('ee-structured-data');
    if (existingScript) existingScript.remove();

    const ldScript = document.createElement('script');
    ldScript.id = 'ee-structured-data';
    ldScript.type = 'application/ld+json';
    ldScript.text = JSON.stringify(
      jsonLdSchemas.length === 1 ? jsonLdSchemas[0] : jsonLdSchemas
    );
    document.head.appendChild(ldScript);
  }, [
    selectedProduct,
    routeView,
    selectedDepartment,
    selectedSubcategory,
    departments,
    settings.googleSiteVerification,
    isAdminOpen,
    isAdminLoginModalOpen,
    isCartOpen,
    isCheckoutOpen,
    isAccountOpen,
    isSearchOpen,
    activePriceTier,
    selectedNeed,
    selectedCategory,
  ]);

  return null;
};
