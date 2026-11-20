# Google Search Console & Indexing Setup — The Everyday Editz

**Canonical Website:** `https://everyday_editz.in/`  
**Operator:** Raftaar Solutions, Mandi Gobindgarh, Punjab – 147301, India  
**Google Tag Manager Container:** `GTM-P7J23FSJ` (installed in `index.html`)

> **Important Note on Search Rankings:** This setup establishes clean technical SEO, structured data, canonical URLs, and automated sitemap updates so search engines can crawl and understand your catalogue accurately. Search rankings depend on competition, domain authority, content quality, and ongoing indexing signals—no specific ranking position is guaranteed.

---

## 1. Verify Ownership in Google Search Console

1. Open [Google Search Console](https://search.google.com/search-console) and add a new property for `https://everyday_editz.in/`.
2. Choose either verification method:
   - **Option A — Domain DNS TXT Record (Recommended):** Copy the `google-site-verification=...` TXT record provided by Google and add it to your DNS zone at your domain registrar/Cloudflare.
   - **Option B — HTML Meta Tag via Admin Dashboard:**
     1. In Search Console, choose **URL Prefix** (`https://everyday_editz.in/`) and expand **HTML tag**.
     2. Copy only the `content="..."` token value.
     3. Open the store **Admin Dashboard → Store Settings → Google Search Console, GTM & Indexing**.
     4. Paste the token into **Google Search Console Verification Token**. It saves to `data/settings.json` and dynamically injects `<meta name="google-site-verification" content="..." />` via `SEOHead.tsx`.
3. Click **Verify** in Google Search Console.

---

## 2. Submit Your Dynamic XML Sitemap

1. Confirm your sitemap loads cleanly at:  
   `https://everyday_editz.in/sitemap.xml`
2. Confirm your robots directives load cleanly at:  
   `https://everyday_editz.in/robots.txt`
3. In Google Search Console, navigate to **Indexing → Sitemaps**.
4. Enter `sitemap.xml` in the **Add a new sitemap** field and click **Submit**.

### What Is Automatically Included & Excluded
- **Included (Indexable & Canonical):**
  - `/` (Homepage)
  - `/category/women`, `/category/men`, `/category/kids`, `/category/home-lifestyle`
  - `/new-arrivals`
  - `/everyday-essentials`
  - `/product/:slug` for every published, active product in `data/products.json` (updates automatically whenever products are added, edited, unpublished, or deleted in the Admin Dashboard).
- **Excluded (`Disallow` in `/robots.txt` & `noindex, nofollow` in `SEOHead.tsx`):**
  - `/admin`, `/admin/login`, `/api/`
  - Cart, Checkout, Customer Account, Search overlays
  - Filtered price/subcategory views and `404` pages (preventing duplicate URL indexing)

---

## 3. Validate Structured Data (Rich Results)

The storefront emits Schema.org JSON-LD (`Organization`, `WebSite`, `Product`, `Offer`, `BreadcrumbList`, and `Review`/`AggregateRating` strictly when real product reviews exist):

1. Open [Google Rich Results Test](https://search.google.com/test/rich-results).
2. Test `https://everyday_editz.in/` and any published product URL (`https://everyday_editz.in/product/<slug>`).
3. Verify valid `Product` and `Offer` (`INR`, live `InStock`/`OutOfStock` availability) and zero errors.

---

## 4. Verify Google Tag Manager (`GTM-P7J23FSJ`)

1. `index.html` includes the official GTM `<script>` in `<head>` and `<noscript>` iframe immediately inside `<body>`.
2. Use **Google Tag Assistant / GTM Preview** against `https://everyday_editz.in/` to verify tag firing and connect GA4 or Google Ads tags inside GTM without further code edits.
