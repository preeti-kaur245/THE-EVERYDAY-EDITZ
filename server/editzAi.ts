import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

export interface DerivedAIProfile {
  aiTags: string[];
  useCases: string[];
  moments: string[];
  audience: string[];
  compatibility: string[];
  budgetTier: string;
}

const GEMINI_MODEL = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI | null {
  const candidates = [process.env.GEMINI_API_KEY_, process.env.GEMINI_API_KEY];
  const apiKey = candidates
    .map((val) => (val || '').trim())
    .find((val) => val && val !== 'MY_GEMINI_API_KEY' && val.length >= 10);
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

function extractSafeErrorHint(err: any): string {
  const raw = String(err?.message || err || '');
  try {
    const parsed = JSON.parse(raw);
    const msg = parsed?.error?.message;
    const status = parsed?.error?.status || parsed?.error?.code;
    if (msg) return status ? `${status}: ${msg}` : msg;
  } catch {
    // ignore non-JSON error text
  }
  return raw.slice(0, 220);
}

async function generateWithTimeout<T>(
  factory: () => Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  const attempt = async (): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        factory(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  try {
    return await attempt();
  } catch (err: any) {
    const msg = String(err?.message || err || '');
    const isTransient = /503|UNAVAILABLE|high demand|ECONNRESET/i.test(msg);
    if (!isTransient) throw err;
    await new Promise((r) => setTimeout(r, 700));
    return await attempt();
  }
}

export function deriveProductAIMetadata(p: any): DerivedAIProfile {
  const price = Number(p.price) || 0;
  const budgetTier =
    price <= 199
      ? 'under-199'
      : price <= 299
      ? 'under-299'
      : price <= 499
      ? 'under-499'
      : price <= 999
      ? 'under-999'
      : 'above-999';

  const haystack = [
    p.name,
    p.tagline,
    ...(Array.isArray(p.tags) ? p.tags : []),
    ...(Array.isArray(p.subcategories) ? p.subcategories : []),
    ...(Array.isArray(p.departments) ? p.departments : []),
    p.editorial?.everydayEdit,
    p.editorial?.problemItSolves,
    ...(Array.isArray(p.aiTags) ? p.aiTags : []),
    ...(Array.isArray(p.useCases) ? p.useCases : []),
    ...(Array.isArray(p.moments) ? p.moments : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const moments = new Set<string>(Array.isArray(p.moments) ? p.moments : []);
  const useCases = new Set<string>(Array.isArray(p.useCases) ? p.useCases : []);
  const audience = new Set<string>(Array.isArray(p.audience) ? p.audience : []);
  const aiTags = new Set<string>(Array.isArray(p.aiTags) ? p.aiTags : []);

  if (/travel|hotel|cabin|flight|packing|luggage|steamer|pouch|toiletry/.test(haystack)) {
    moments.add('Travelling Soon');
    useCases.add('Travel Packing & Transit');
    aiTags.add('travel-ready');
  }
  if (/hostel|dorm|compact|portable|study|desk|cable|tech|charger|pad|student|backpack/.test(haystack)) {
    moments.add('College Life');
    audience.add('College Students & Hostelers');
    useCases.add('Compact Hostel & Study Setup');
  }
  if (/self-care|wellness|scalp|period|heating|sleep|silk|massage|spa|remover|grooming|beard|skincare/.test(haystack)) {
    moments.add('Self-Care Day');
    moments.add('Everyday Comfort');
    useCases.add('Daily Self-Care & Wellness');
  }
  if (/organis|organiz|divider|fridge|kitchen|drawer|storage|cube|rack|box|seal|bag/.test(haystack)) {
    moments.add('Organise My Space');
    useCases.add('Home & Kitchen Organisation');
  }
  if (/gift|kit|set|jewellery|craft|colouring|activity|candle|lantern/.test(haystack)) {
    moments.add('Gifts That Matter');
    useCases.add('Thoughtful Gifting');
  }
  if (/family|kid|kitchen|home|fridge|cleaning|shoe|living/.test(haystack)) {
    moments.add('Family Essentials');
  }
  if (price <= 299) moments.add('Under ₹299');
  if (price <= 499) moments.add('Under ₹499');
  if (price <= 999) moments.add('Under ₹999');

  if (Array.isArray(p.departments)) {
    if (p.departments.includes('women')) audience.add('Women');
    if (p.departments.includes('men')) audience.add('Men');
    if (p.departments.includes('kids')) audience.add('Kids');
    if (p.departments.includes('home-lifestyle')) audience.add('Homeowners & Families');
  }

  for (const t of Array.isArray(p.tags) ? p.tags : []) {
    aiTags.add(String(t));
  }

  return {
    aiTags: Array.from(aiTags),
    useCases: Array.from(useCases),
    moments: Array.from(moments),
    audience: Array.from(audience),
    compatibility: Array.isArray(p.compatibility) ? p.compatibility : [],
    budgetTier,
  };
}

export function getLiveDiscoverableProducts(rawProducts: any[], excludeIds: string[] = []) {
  const excluded = new Set(excludeIds);
  return (rawProducts || [])
    .filter((p) => {
      if (!p || !p.id) return false;
      if (excluded.has(p.id)) return false;
      if (p.isPublished === false || p.status === 'Draft' || p.status === 'Inactive') return false;
      if (p.aiExcluded === true) return false;
      return true;
    })
    .map((p) => ({
      ...p,
      ...deriveProductAIMetadata(p),
    }));
}

function tokenize(text: string): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/₹/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !['for', 'the', 'and', 'with', 'under', 'below', 'less', 'than', 'need', 'want', 'find', 'show', 'help', 'build', 'give', 'some', 'good', 'best', 'something', 'useful', 'products', 'items', 'things', 'basket', 'bundle'].includes(t));
}

const SYNONYMS: Record<string, string[]> = {
  hostel: ['compact', 'toiletry', 'organiser', 'storage', 'desk', 'cable', 'bag', 'sealer', 'cube', 'laundry', 'portable', 'travel'],
  college: ['desk', 'cable', 'pad', 'bag', 'toiletry', 'portable', 'grooming', 'study', 'water', 'bottle', 'pouch'],
  student: ['desk', 'cable', 'pad', 'toiletry', 'compact', 'organiser', 'budget'],
  selfcare: ['self-care', 'wellness', 'massage', 'scalp', 'heating', 'period', 'sleep', 'silk', 'bath', 'remover', 'skin'],
  self: ['self-care', 'wellness', 'massage', 'heating', 'sleep', 'grooming'],
  care: ['self-care', 'wellness', 'grooming', 'hair', 'shoe', 'beard'],
  travel: ['toiletry', 'packing', 'cube', 'luggage', 'steamer', 'jewellery', 'pouch', 'flight', 'portable', 'trip'],
  trip: ['travel', 'toiletry', 'packing', 'cube', 'steamer', 'pouch', 'portable'],
  kitchen: ['fridge', 'drawer', 'divider', 'sealer', 'bag', 'organiser', 'food', 'storage', 'oil', 'jar'],
  organised: ['organiser', 'organizer', 'divider', 'storage', 'cube', 'fridge', 'drawer', 'pouch', 'box'],
  organisedspace: ['organiser', 'divider', 'storage', 'drawer'],
  organized: ['organiser', 'organizer', 'divider', 'storage', 'cube', 'fridge', 'drawer', 'pouch', 'box'],
  organise: ['organiser', 'organizer', 'divider', 'storage', 'cube', 'fridge', 'drawer', 'pouch'],
  gift: ['gifts', 'kit', 'set', 'jewellery', 'candle', 'art', 'craft', 'wellness', 'box'],
  gifts: ['gift', 'kit', 'set', 'jewellery', 'art', 'craft', 'wellness'],
  trending: ['trending', 'bestseller', 'daily'],
  budget: ['under-199', 'under-299', 'under-499', 'affordable', 'everyday'],
  cheap: ['under-199', 'under-299', 'affordable'],
  affordable: ['under-199', 'under-299', 'under-499'],
  desk: ['workspace', 'cable', 'pad', 'magdock', 'charger', 'tech', 'organiser'],
  workspace: ['desk', 'cable', 'pad', 'tech'],
};

function expandTokens(tokens: string[]): string[] {
  const expanded = new Set<string>(tokens);
  for (const t of tokens) {
    if (SYNONYMS[t]) {
      for (const s of SYNONYMS[t]) expanded.add(s);
    }
    if (t.endsWith('s') && t.length > 3) {
      expanded.add(t.slice(0, -1));
    }
  }
  return Array.from(expanded);
}

export function extractBudgetFromText(text: string): number | null {
  const match = String(text || '').match(/(?:under|below|within|budget(?:\s+of)?|max|rs\.?|inr|₹)\s*₹?\s*(\d{2,5})/i);
  if (match && match[1]) {
    const num = Number(match[1]);
    if (Number.isFinite(num) && num >= 50 && num <= 50000) return num;
  }
  return null;
}

export function scoreProductMatch(
  p: any,
  queryTokens: string[],
  constraints: { maxBudget?: number | null; category?: string | null; inStockOnly?: boolean }
): { score: number; matchedKeywords: string[] } {
  const price = Number(p.price) || 0;
  const inStock = Boolean(p.inStock && (Number(p.stockCount) || 0) > 0);
  if (constraints.inStockOnly && !inStock) return { score: -1, matchedKeywords: [] };

  if (constraints.maxBudget && price > constraints.maxBudget) {
    return { score: -1, matchedKeywords: [] };
  }

  if (constraints.category && constraints.category !== 'all') {
    const cat = constraints.category.toLowerCase();
    const depts = Array.isArray(p.departments) ? p.departments.map((d: string) => d.toLowerCase()) : [];
    const subcats = Array.isArray(p.subcategories) ? p.subcategories.join(' ').toLowerCase() : '';
    if (!depts.includes(cat) && !subcats.includes(cat)) {
      return { score: -1, matchedKeywords: [] };
    }
  }

  const nameLower = String(p.name || '').toLowerCase();
  const taglineLower = String(p.tagline || '').toLowerCase();
  const tagsLower = [...(p.tags || []), ...(p.aiTags || [])].join(' ').toLowerCase();
  const subcatLower = (p.subcategories || []).join(' ').toLowerCase();
  const deptLower = (p.departments || []).join(' ').toLowerCase();
  const momentsLower = (p.moments || []).join(' ').toLowerCase();
  const useCasesLower = (p.useCases || []).join(' ').toLowerCase();
  const editorialLower = [p.editorial?.everydayEdit, p.editorial?.problemItSolves]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let score = inStock ? 10 : -5;
  const matchedKeywords: string[] = [];

  for (const token of queryTokens) {
    let hit = false;
    if (nameLower.includes(token)) {
      score += 18;
      hit = true;
    }
    if (tagsLower.includes(token)) {
      score += 12;
      hit = true;
    }
    if (subcatLower.includes(token) || momentsLower.includes(token) || useCasesLower.includes(token)) {
      score += 10;
      hit = true;
    }
    if (taglineLower.includes(token) || editorialLower.includes(token)) {
      score += 7;
      hit = true;
    }
    if (deptLower.includes(token)) {
      score += 6;
      hit = true;
    }
    if (hit) matchedKeywords.push(token);
  }

  if (queryTokens.includes('trending') && p.isTrending) score += 20;
  if (queryTokens.includes('bestseller') && p.isBestSeller) score += 16;
  if (p.isFeaturedAI) score += 8;
  if (p.isFeatured) score += 5;
  if (p.isTrending) score += 4;
  if (p.isBestSeller) score += 4;

  // Favor helpful affordable utility if query mentions budget
  if (constraints.maxBudget && price <= constraints.maxBudget) {
    score += 4;
  }

  return { score, matchedKeywords: Array.from(new Set(matchedKeywords)) };
}

function buildDeterministicReason(p: any, intentKeywords: string[], useCase?: string): string {
  const solve = p.editorial?.problemItSolves || p.tagline;
  if (useCase && p.useCases?.length) {
    return `Great for ${useCase}: ${solve}`;
  }
  if (intentKeywords.length > 0) {
    return `Matches "${intentKeywords.slice(0, 2).join(', ')}" — ${solve}`;
  }
  return solve || 'Practical daily find curated from our live catalogue.';
}

export async function runAIDiscovery(
  rawProducts: any[],
  params: {
    query: string;
    budget?: number | null;
    category?: string | null;
    mode?: 'finder' | 'search' | 'bundle';
    excludeIds?: string[];
  }
) {
  const cleanQuery = String(params.query || '').trim().slice(0, 400);
  const excludeIds = Array.isArray(params.excludeIds) ? params.excludeIds : [];
  const candidates = getLiveDiscoverableProducts(rawProducts, excludeIds);

  const explicitBudget =
    params.budget && Number(params.budget) > 0 ? Number(params.budget) : extractBudgetFromText(cleanQuery);
  const explicitCategory = params.category && params.category !== 'all' ? params.category : null;

  const ai = getGeminiClient();
  let aiMode: 'gemini-grounded' | 'catalog-fallback' = 'catalog-fallback';
  let aiNotice: string | undefined;
  let aiDiagnostic: string | undefined;

  let extracted = {
    summary: cleanQuery,
    category: explicitCategory || 'all',
    maxBudget: explicitBudget,
    occasion: '',
    keywords: tokenize(cleanQuery),
  };

  if (ai && cleanQuery) {
    try {
      const intentRes = await generateWithTimeout(
        () =>
          ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: `You are EDITZ AI, the shopping discovery parser for Indian e-commerce brand Everyday Editz (categories: women, men, kids, home-lifestyle).
Parse this shopper prompt into structured search intent:
Query: "${cleanQuery}"
${explicitBudget ? `Explicit budget limit INR: ${explicitBudget}` : ''}
${explicitCategory ? `Explicit category filter: ${explicitCategory}` : ''}

Extract concise lowercase keywords (including practical synonyms like toiletry, cable, pouch, heating, organizer, desk, gift, hostel, travel, skincare, etc.) and detect category/budget if stated.`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                category: { type: Type.STRING },
                maxBudget: { type: Type.NUMBER, nullable: true },
                occasion: { type: Type.STRING },
                keywords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['summary', 'category', 'keywords'],
            },
          },
        }),
        8000,
        'Intent parse'
      );

      const parsed = JSON.parse(intentRes.text || '{}');
      const validCats = ['women', 'men', 'kids', 'home-lifestyle', 'all'];
      const parsedCat = validCats.includes(String(parsed.category || '').toLowerCase())
        ? String(parsed.category).toLowerCase()
        : 'all';

      extracted = {
        summary: parsed.summary || cleanQuery,
        category: explicitCategory || parsedCat,
        maxBudget:
          explicitBudget ||
          (typeof parsed.maxBudget === 'number' && parsed.maxBudget >= 50 ? parsed.maxBudget : null),
        occasion: parsed.occasion || '',
        keywords: Array.from(
          new Set([
            ...tokenize(cleanQuery),
            ...(Array.isArray(parsed.keywords) ? parsed.keywords.map((k: string) => k.toLowerCase()) : []),
          ])
        ),
      };
      aiMode = 'gemini-grounded';
    } catch (err: any) {
      aiNotice = 'Using live catalogue intent matching (AI model temporarily unavailable).';
      aiDiagnostic = extractSafeErrorHint(err);
      console.warn('[EDITZ AI] Intent parse fallback:', err?.message || err);
    }
  } else if (!ai) {
    aiNotice = 'Running deterministic live-catalogue discovery (server Gemini API key not configured).';
  }

  const expandedTokens = expandTokens(extracted.keywords);
  const scored = candidates
    .map((p) => {
      const { score, matchedKeywords } = scoreProductMatch(p, expandedTokens, {
        maxBudget: extracted.maxBudget,
        category: extracted.category,
        inStockOnly: false,
      });
      return { p, score, matchedKeywords };
    })
    .filter((entry) => entry.score > 0);

  // Separate strong keyword matches vs generic baseline score
  const keywordHits = scored.filter(
    (entry) =>
      entry.matchedKeywords.length > 0 ||
      expandedTokens.includes('trending') ||
      expandedTokens.includes('budget') ||
      expandedTokens.includes('affordable')
  );

  const rankedPool = (keywordHits.length > 0 ? keywordHits : [])
    .sort((a, b) => b.score - a.score || (Number(b.p.isFeaturedAI || b.p.isFeatured) - Number(a.p.isFeaturedAI || a.p.isFeatured)))
    .slice(0, 8);

  const noExactMatch = rankedPool.length === 0;

  // If no exact match exists, find closest real alternatives without claiming they are exact matches
  const fallbackClosest = noExactMatch
    ? candidates
        .filter((p) => !extracted.maxBudget || Number(p.price) <= extracted.maxBudget)
        .filter((p) => p.inStock && (p.stockCount ?? 0) > 0)
        .sort((a, b) => Number(b.isTrending) - Number(a.isTrending) || a.price - b.price)
        .slice(0, 4)
        .map((p) => ({ p, score: 5, matchedKeywords: [] as string[] }))
    : [];

  const finalSelection = noExactMatch ? fallbackClosest : rankedPool;

  // Grounded explanation synthesis via Gemini (strictly constrained to selected DB IDs)
  let assistantMessage = noExactMatch
    ? `We don't have an exact catalogue match for "${cleanQuery}" right now${extracted.maxBudget ? ` under ₹${extracted.maxBudget}` : ''}. Here are our closest in-stock everyday essentials instead.`
    : `Found ${finalSelection.length} practical ${extracted.maxBudget ? `picks under ₹${extracted.maxBudget}` : 'everyday finds'} matching your request.`;

  const reasonsById = new Map<string, string>();
  let refinementSuggestions: string[] = [
    extracted.maxBudget ? `Show under ₹${Math.max(199, Math.round(extracted.maxBudget * 0.7))}` : 'Show picks under ₹499',
    'Build a Budget Basket with these',
    'Show travel & hostel essentials',
  ];

  if (ai && finalSelection.length > 0) {
    try {
      const compactCatalog = finalSelection.map((item) => ({
        id: item.p.id,
        name: item.p.name,
        price: item.p.price,
        departments: item.p.departments,
        tagline: item.p.tagline,
        problemItSolves: item.p.editorial?.problemItSolves || '',
        inStock: item.p.inStock && (item.p.stockCount ?? 0) > 0,
      }));

      const explainRes = await generateWithTimeout(
        () =>
          ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: `You are EDITZ AI for Everyday Editz ("Your everyday. A little smarter.").
Shopper request: "${cleanQuery}"
${noExactMatch ? 'Note: No exact keyword match was found, so these are the closest available in-stock alternatives.' : ''}

Verified products from our database (DO NOT invent any new product, price, or spec):
${JSON.stringify(compactCatalog)}

Write:
1) A warm, practical 1-2 sentence assistantMessage directly answering the user's need without exaggeration.
2) For each provided product id, one crisp 10-18 word reason explaining why it fits the user's situation.
3) 3 short clickable follow-up refinement prompts (max 6 words each).`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                assistantMessage: { type: Type.STRING },
                reasons: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      productId: { type: Type.STRING },
                      reason: { type: Type.STRING },
                    },
                    required: ['productId', 'reason'],
                  },
                },
                refinementSuggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: ['assistantMessage', 'reasons', 'refinementSuggestions'],
            },
          },
        }),
        8000,
        'Grounded explanation'
      );

      const explained = JSON.parse(explainRes.text || '{}');
      if (explained.assistantMessage) assistantMessage = explained.assistantMessage;
      if (Array.isArray(explained.reasons)) {
        for (const r of explained.reasons) {
          if (r.productId && r.reason) reasonsById.set(r.productId, r.reason);
        }
      }
      if (Array.isArray(explained.refinementSuggestions) && explained.refinementSuggestions.length > 0) {
        refinementSuggestions = explained.refinementSuggestions.slice(0, 3);
      }
      aiMode = 'gemini-grounded';
    } catch (err: any) {
      if (!aiNotice) {
        aiNotice = 'Showing verified live-catalogue matches (AI explanation fell back to product notes).';
      }
      if (!aiDiagnostic) {
        aiDiagnostic = extractSafeErrorHint(err);
      }
      console.warn('[EDITZ AI] Grounded explanation fallback:', err?.message || err);
    }
  }

  const validProductMap = new Map(candidates.map((c) => [c.id, c]));
  const matches = finalSelection
    .filter((entry) => validProductMap.has(entry.p.id))
    .map((entry) => {
      const canonical = validProductMap.get(entry.p.id)!;
      return {
        product: canonical,
        score: entry.score,
        reason:
          reasonsById.get(canonical.id) ||
          buildDeterministicReason(canonical, entry.matchedKeywords, extracted.occasion),
      };
    });

  return {
    success: true,
    aiMode,
    aiNotice,
    aiDiagnostic,
    intent: extracted,
    assistantMessage,
    matches,
    refinementSuggestions,
    noExactMatch,
  };
}

export async function runBudgetBasketBuilder(
  rawProducts: any[],
  params: {
    budget: number;
    category?: string;
    purpose?: string;
    maxItems?: number;
    preferences?: string;
    excludeIds?: string[];
    allowOverBudget?: boolean;
  }
) {
  const budget = Math.max(99, Math.min(25000, Number(params.budget) || 499));
  const category = params.category && params.category !== 'all' ? params.category : 'all';
  const purpose = String(params.purpose || '').trim().slice(0, 200);
  const preferences = String(params.preferences || '').trim().slice(0, 200);
  const maxItems = Math.max(1, Math.min(8, Number(params.maxItems) || 5));
  const excludeIds = Array.isArray(params.excludeIds) ? params.excludeIds : [];
  const allowOverBudget = Boolean(params.allowOverBudget);

  const combinedText = `${purpose} ${preferences}`.trim();
  const tokens = expandTokens(tokenize(combinedText));

  // Only published, in-stock items from live DB
  const inStockCandidates = getLiveDiscoverableProducts(rawProducts, excludeIds).filter((p) => {
    if (!p.inStock || (Number(p.stockCount) || 0) <= 0) return false;
    if (category !== 'all') {
      const depts = Array.isArray(p.departments) ? p.departments.map((d: string) => d.toLowerCase()) : [];
      if (!depts.includes(category.toLowerCase())) return false;
    }
    return allowOverBudget ? Number(p.price) <= Math.round(budget * 1.15) : Number(p.price) <= budget;
  });

  // Score every eligible product for relevance & value
  const scored = inStockCandidates
    .map((p) => {
      const { score, matchedKeywords } = scoreProductMatch(p, tokens, {
        maxBudget: allowOverBudget ? Math.round(budget * 1.15) : budget,
        category,
        inStockOnly: true,
      });
      return {
        p,
        score: score + (tokens.length === 0 ? (p.isBestSeller ? 12 : 0) + (p.isTrending ? 10 : 0) : 0),
        matchedKeywords,
      };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => {
      if (tokens.length > 0 && b.matchedKeywords.length !== a.matchedKeywords.length) {
        return b.matchedKeywords.length - a.matchedKeywords.length;
      }
      return b.score - a.score || Number(a.p.price) - Number(b.p.price);
    });

  // Greedy diverse packing strictly respecting budget cap unless allowOverBudget
  const ceiling = allowOverBudget ? Math.round(budget * 1.15) : budget;
  const chosen: Array<{ p: any; matchedKeywords: string[] }> = [];
  const usedSubcategories = new Set<string>();
  let runningTotal = 0;

  // First pass: pick high-relevance items across diverse subcategories without exceeding ceiling
  for (const cand of scored) {
    if (chosen.length >= maxItems) break;
    const price = Number(cand.p.price) || 0;
    if (price <= 0) continue;
    if (runningTotal + price > ceiling) continue;

    // Avoid padding with completely irrelevant low-score items when user gave a specific purpose
    if (tokens.length > 0 && cand.matchedKeywords.length === 0 && chosen.length >= 2) continue;

    const primarySub = (cand.p.subcategories && cand.p.subcategories[0]) || 'general';
    if (usedSubcategories.has(primarySub) && scored.some((other) => !usedSubcategories.has((other.p.subcategories?.[0] || 'general')) && runningTotal + Number(other.p.price) <= ceiling)) {
      continue;
    }

    chosen.push({ p: cand.p, matchedKeywords: cand.matchedKeywords });
    usedSubcategories.add(primarySub);
    runningTotal += price;
  }

  // Second pass if fewer than 2 items chosen (fill up with best fitting in-budget items)
  if (chosen.length < Math.min(2, maxItems)) {
    const chosenIds = new Set(chosen.map((c) => c.p.id));
    for (const cand of scored) {
      if (chosen.length >= maxItems) break;
      if (chosenIds.has(cand.p.id)) continue;
      const price = Number(cand.p.price) || 0;
      if (runningTotal + price <= ceiling) {
        chosen.push({ p: cand.p, matchedKeywords: cand.matchedKeywords });
        chosenIds.add(cand.p.id);
        runningTotal += price;
      }
    }
  }

  const basketTotal = chosen.reduce((sum, c) => sum + (Number(c.p.price) || 0), 0);
  const remainingBudget = Math.max(0, budget - basketTotal);
  const totalSavings = chosen.reduce((sum, c) => {
    const price = Number(c.p.price) || 0;
    const orig = Number(c.p.originalPrice) || 0;
    return orig > price ? sum + (orig - price) : sum;
  }, 0);

  const chosenIdSet = new Set(chosen.map((c) => c.p.id));
  const alternativeSwaps = scored
    .filter((s) => !chosenIdSet.has(s.p.id) && Number(s.p.price) <= budget)
    .slice(0, 8)
    .map((s) => s.p);

  let aiMode: 'gemini-grounded' | 'catalog-fallback' = 'catalog-fallback';
  let aiNotice: string | undefined;
  let summary =
    chosen.length === 0
      ? `No in-stock items fit within ₹${budget}${category !== 'all' ? ` in ${category}` : ''}. Try increasing your budget slightly.`
      : `Built a ${chosen.length}-item basket totalling ₹${basketTotal} (₹${remainingBudget} remaining under ₹${budget})${totalSavings > 0 ? ` with ₹${totalSavings} MRP savings.` : '.'}`;

  const itemReasons = new Map<string, string>();
  const ai = getGeminiClient();

  if (ai && chosen.length > 0) {
    try {
      const compactItems = chosen.map((c) => ({
        id: c.p.id,
        name: c.p.name,
        price: c.p.price,
        tagline: c.p.tagline,
        problemItSolves: c.p.editorial?.problemItSolves || '',
      }));

      const res = await generateWithTimeout(
        () =>
          ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: `You are EDITZ AI Budget Basket Assistant for Everyday Editz.
Target Budget: ₹${budget} | Category: ${category} | Purpose: "${purpose || 'Everyday value'}" | Preferences: "${preferences || 'Practical essentials'}"
Actual Selected Total: ₹${basketTotal} | Remaining: ₹${remainingBudget} | Total MRP Savings: ₹${totalSavings}

Selected In-Stock DB Items:
${JSON.stringify(compactItems)}

Provide a concise, transparent 1-2 sentence basket summary explaining why this combination offers real value within ₹${budget}, plus a short 8-14 word fit reason per product ID.`,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                itemReasons: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      productId: { type: Type.STRING },
                      reason: { type: Type.STRING },
                    },
                    required: ['productId', 'reason'],
                  },
                },
              },
              required: ['summary', 'itemReasons'],
            },
          },
        }),
        8000,
        'Budget basket explanation'
      );

      const parsed = JSON.parse(res.text || '{}');
      if (parsed.summary) summary = parsed.summary;
      if (Array.isArray(parsed.itemReasons)) {
        for (const r of parsed.itemReasons) {
          if (r.productId && r.reason) itemReasons.set(r.productId, r.reason);
        }
      }
      aiMode = 'gemini-grounded';
    } catch (err: any) {
      aiNotice = 'Basket built directly from live stock & pricing (AI note unavailable).';
      console.warn('[EDITZ AI] Budget basket explanation fallback:', err?.message || err);
    }
  } else if (!ai) {
    aiNotice = 'Basket optimized directly from live catalogue inventory & pricing.';
  }

  return {
    success: true,
    aiMode,
    aiNotice,
    budget,
    basketTotal,
    remainingBudget,
    totalSavings,
    summary,
    items: chosen.map((c) => {
      const price = Number(c.p.price) || 0;
      const orig = Number(c.p.originalPrice) || price;
      return {
        product: c.p,
        quantity: 1,
        reason: itemReasons.get(c.p.id) || buildDeterministicReason(c.p, c.matchedKeywords, purpose),
        lineTotal: price,
        lineOriginalTotal: orig > price ? orig : price,
      };
    }),
    alternativeSwaps,
  };
}

export async function runVisualProductSearch(
  rawProducts: any[],
  params: { imageBase64: string; mimeType: string; notes?: string }
) {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      success: false,
      code: 'AI_KEY_UNCONFIGURED',
      message:
        'Visual AI search requires a configured server-side Gemini API key (GEMINI_API_KEY_ or GEMINI_API_KEY). Describe the product in EDITZ AI Search to find matching catalogue items.',
      matches: [],
    };
  }

  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const cleanMime = String(params.mimeType || 'image/jpeg').toLowerCase();
  if (!allowedMimes.includes(cleanMime)) {
    return {
      success: false,
      code: 'INVALID_MIME',
      message: 'Please upload a JPG, PNG, or WebP image for visual product discovery.',
      matches: [],
    };
  }

  const cleanBase64 = String(params.imageBase64 || '').replace(/^data:[^;]+;base64,/, '').trim();
  if (!cleanBase64 || cleanBase64.length > 6 * 1024 * 1024) {
    return {
      success: false,
      code: 'IMAGE_TOO_LARGE',
      message: 'Image must be smaller than 4 MB.',
      matches: [],
    };
  }

  try {
    const visionRes = await generateWithTimeout(
      () =>
        ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: cleanMime === 'image/jpg' ? 'image/jpeg' : cleanMime,
            },
          },
          {
            text: `Inspect this product photo for Indian lifestyle e-commerce discovery (categories: women, men, kids, home-lifestyle).
${params.notes ? `User note: "${params.notes}"` : ''}
Identify the item type, practical everyday use-case, probable category, 5-8 descriptive lowercase search keywords, and give an honest 1-sentence assessment of what is shown.`,
          },
        ],
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedItem: { type: Type.STRING },
              category: { type: Type.STRING },
              useCase: { type: Type.STRING },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              honestAssessment: { type: Type.STRING },
            },
            required: ['detectedItem', 'category', 'useCase', 'keywords', 'honestAssessment'],
          },
        },
      }),
      12000,
      'Visual product search'
    );

    const analysis = JSON.parse(visionRes.text || '{}');
    const candidates = getLiveDiscoverableProducts(rawProducts);
    const expanded = expandTokens(
      Array.from(new Set([...tokenize(analysis.detectedItem || ''), ...(analysis.keywords || []).map((k: string) => k.toLowerCase())]))
    );

    const scored = candidates
      .map((p) => {
        const { score, matchedKeywords } = scoreProductMatch(p, expanded, {
          category: null,
          inStockOnly: false,
        });
        return { p, score, matchedKeywords };
      })
      .filter((entry) => entry.matchedKeywords.length > 0 && entry.score > 15)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return {
      success: true,
      analysis,
      matches: scored.map((s) => ({
        product: s.p,
        score: s.score,
        reason: `Similar to ${analysis.detectedItem} (${s.matchedKeywords.slice(0, 3).join(', ')}) — ${s.p.editorial?.problemItSolves || s.p.tagline}`,
      })),
    };
  } catch (err: any) {
    console.error('[EDITZ AI] Visual search error:', err?.message || err);
    return {
      success: false,
      code: 'VISUAL_SEARCH_FAILED',
      message: 'Could not analyze image with Gemini Vision right now. Please try text search instead.',
      matches: [],
    };
  }
}
