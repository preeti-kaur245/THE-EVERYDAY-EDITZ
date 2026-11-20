import React, { useState, useMemo } from 'react';
import { Compass, ArrowRight, Wallet } from 'lucide-react';
import { useStore, isProductLiveOnStorefront } from '../context/StoreContext';
import { Product } from '../types';
import { ProductCard } from './ProductCard';

interface MomentTile {
  id: string;
  label: string;
  subtitle: string;
  keywords: string[];
  maxPrice?: number;
}

const MOMENT_TILES: MomentTile[] = [
  {
    id: 'travelling-soon',
    label: 'Travelling Soon',
    subtitle: 'Packing & cabin readiness',
    keywords: ['travel', 'toiletry', 'packing', 'cube', 'luggage', 'steamer', 'jewellery', 'pouch'],
  },
  {
    id: 'college-life',
    label: 'College Life',
    subtitle: 'Hostel, study & daily commute',
    keywords: ['college', 'hostel', 'desk', 'cable', 'pouch', 'bag', 'bottle', 'grooming', 'toiletry'],
  },
  {
    id: 'self-care-day',
    label: 'Self-Care Day',
    subtitle: 'Restorative skincare & unwind',
    keywords: ['self-care', 'wellness', 'scalp', 'heating', 'silk', 'sleep', 'remover', 'massage', 'beard'],
  },
  {
    id: 'organise-my-space',
    label: 'Organise My Space',
    subtitle: 'Kitchen, fridge & drawer calm',
    keywords: ['organis', 'organizer', 'divider', 'fridge', 'kitchen', 'drawer', 'storage', 'cube', 'sealer'],
  },
  {
    id: 'gifts-that-matter',
    label: 'Gifts That Matter',
    subtitle: 'Thoughtful utility presents',
    keywords: ['gift', 'jewellery', 'craft', 'art', 'colouring', 'set', 'kit', 'silk'],
  },
  {
    id: 'everyday-comfort',
    label: 'Everyday Comfort',
    subtitle: 'Little daily upgrades',
    keywords: ['comfort', 'ergonomic', 'heating', 'massage', 'silk', 'towel', 'daily'],
  },
  {
    id: 'family-essentials',
    label: 'Family Essentials',
    subtitle: 'Home, kids & shared living',
    keywords: ['family', 'kid', 'home', 'kitchen', 'fridge', 'shoe', 'activity', 'lunch'],
  },
  {
    id: 'under-299',
    label: 'Under ₹299',
    subtitle: 'Pocket-friendly finds',
    keywords: [],
    maxPrice: 299,
  },
  {
    id: 'under-499',
    label: 'Under ₹499',
    subtitle: 'Smart everyday value',
    keywords: [],
    maxPrice: 499,
  },
  {
    id: 'under-999',
    label: 'Under ₹999',
    subtitle: 'Complete kits & tools',
    keywords: [],
    maxPrice: 999,
  },
];

function resolveTileProducts(tile: MomentTile, liveProducts: Product[]): Product[] {
  const inStockFirst = [...liveProducts].sort(
    (a, b) => Number(b.inStock && b.stockCount > 0) - Number(a.inStock && a.stockCount > 0)
  );

  if (tile.maxPrice) {
    const under = inStockFirst.filter((p) => p.price <= tile.maxPrice!);
    return under.slice(0, 4);
  }

  const matches = inStockFirst.filter((p) => {
    const haystack = [
      p.name,
      p.tagline,
      ...(p.tags || []),
      ...(p.aiTags || []),
      ...(p.moments || []),
      ...(p.useCases || []),
      ...(p.subcategories || []),
    ]
      .join(' ')
      .toLowerCase();
    if (Array.isArray(p.moments) && p.moments.some((m) => m.toLowerCase() === tile.label.toLowerCase())) {
      return true;
    }
    return tile.keywords.some((kw) => haystack.includes(kw));
  });

  if (matches.length >= 2) return matches.slice(0, 4);
  const ids = new Set(matches.map((m) => m.id));
  const padded = [...matches, ...inStockFirst.filter((p) => !ids.has(p.id) && (p.isTrending || p.isBestSeller))];
  return padded.slice(0, 4);
}

interface MoodMomentSectionProps {
  onBuildMomentBasket?: (budget: number | null, purpose: string, category: string) => void;
}

export const MoodMomentSection: React.FC<MoodMomentSectionProps> = ({ onBuildMomentBasket }) => {
  const { products } = useStore();
  const [activeTileId, setActiveTileId] = useState<string>('travelling-soon');

  const liveProducts = useMemo(
    () => products.filter(isProductLiveOnStorefront),
    [products]
  );

  const tilesWithProducts = useMemo(
    () =>
      MOMENT_TILES.map((tile) => ({
        tile,
        items: resolveTileProducts(tile, liveProducts),
      })).filter((entry) => entry.items.length > 0),
    [liveProducts]
  );

  const currentEntry =
    tilesWithProducts.find((e) => e.tile.id === activeTileId) || tilesWithProducts[0];

  if (!currentEntry) return null;

  return (
    <section id="mood-moment-section" className="py-12 sm:py-16 bg-[#F7F5F0] border-b border-black/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
          <div>
            <div className="flex items-center space-x-1.5 text-xs font-mono uppercase tracking-wider text-[#536B57] mb-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>Mood &amp; Moment Discovery</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#242424] tracking-tight">
              Shop by Life Moment
            </h2>
            <p className="text-sm text-[#242424]/70 mt-1">
              Every tile resolves directly to live, published everyday essentials.
            </p>
          </div>
        </div>

        {/* 10 Interactive Moment Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 mb-7">
          {tilesWithProducts.map(({ tile, items }) => {
            const isSelected = tile.id === currentEntry.tile.id;
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => setActiveTileId(tile.id)}
                className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[82px] ${
                  isSelected
                    ? 'bg-[#242424] text-[#F7F5F0] border-[#242424] shadow-sm'
                    : 'bg-white text-[#242424] border-black/8 hover:border-black/25'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs sm:text-sm font-bold leading-snug">{tile.label}</span>
                  <span
                    className={`text-[10px] font-mono shrink-0 ${
                      isSelected ? 'text-[#D9A6A0]' : 'text-[#536B57]'
                    }`}
                  >
                    {items.length}
                  </span>
                </div>
                <span
                  className={`text-[11px] mt-1 line-clamp-1 ${
                    isSelected ? 'text-[#F7F5F0]/75' : 'text-[#242424]/60'
                  }`}
                >
                  {tile.subtitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Resolved Products Grid for Selected Moment */}
        <div className="bg-white rounded-2xl border border-black/8 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-black/6">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#242424]">
                {currentEntry.tile.label}
              </h3>
              <p className="text-xs text-[#242424]/65">{currentEntry.tile.subtitle}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                const targetBudget = currentEntry.tile.maxPrice || 799;
                if (onBuildMomentBasket) {
                  onBuildMomentBasket(targetBudget, currentEntry.tile.label, 'all');
                } else {
                  const el = document.getElementById('budget-basket');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-4 py-2 rounded-xl bg-[#F7F5F0] hover:bg-[#242424] text-[#242424] hover:text-white border border-black/10 text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Wallet className="w-3.5 h-3.5 text-[#536B57]" />
              <span>Build Budget Basket for this Moment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {currentEntry.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
