import React, { useMemo } from 'react';
import { Star, ShieldCheck } from 'lucide-react';
import { useStore, isProductLiveOnStorefront } from '../context/StoreContext';

export const CustomerReviewsSection: React.FC = () => {
  const { products, feedbackList, openProductModal } = useStore();

  const verifiedReviews = useMemo(() => {
    const collected: Array<{
      id: string;
      author: string;
      location: string;
      rating: number;
      comment: string;
      date: string;
      productId?: string;
      productName: string;
    }> = [];

    products.filter(isProductLiveOnStorefront).forEach((p) => {
      if (Array.isArray(p.reviews) && p.reviews.length > 0) {
        p.reviews.forEach((r) => {
          collected.push({
            id: r.id,
            author: r.author,
            location: r.location || 'India',
            rating: r.rating,
            comment: r.comment,
            date: r.date,
            productId: p.id,
            productName: p.name,
          });
        });
      }
    });

    feedbackList.forEach((f) => {
      if (!collected.some((c) => c.author === f.customerName && c.comment === f.feedback)) {
        collected.push({
          id: f.id,
          author: f.customerName,
          location: 'Verified Customer',
          rating: f.rating,
          comment: f.feedback,
          date: f.submissionDate,
          productId: f.productId,
          productName: f.productName,
        });
      }
    });

    return collected.slice(0, 6);
  }, [products, feedbackList]);

  // Never render placeholder or fabricated reviews
  if (verifiedReviews.length === 0) {
    return null;
  }

  return (
    <section id="customer-reviews-section" className="py-12 sm:py-16 bg-[#FAF8F5] border-t border-black/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center space-x-1.5 text-xs font-mono uppercase tracking-wider text-[#536B57] mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Customer Notes</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#242424] tracking-tight">
            What Everyday Shoppers Say
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {verifiedReviews.map((rev) => {
            const matchedProduct = rev.productId ? products.find((p) => p.id === rev.productId) : undefined;
            return (
              <div
                key={rev.id}
                className="bg-white rounded-2xl border border-black/8 p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-0.5 text-amber-500">
                      {Array.from({ length: Math.max(1, Math.min(5, Math.round(rev.rating))) }).map((_, idx) => (
                        <Star key={idx} className="w-3.5 h-3.5 fill-amber-500" />
                      ))}
                    </div>
                    <span className="text-[11px] font-mono text-[#242424]/50">{rev.date}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#242424]/85 leading-relaxed">&ldquo;{rev.comment}&rdquo;</p>
                </div>

                <div className="pt-3 border-t border-black/6 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-[#242424]">{rev.author}</div>
                    <div className="text-[11px] text-[#242424]/55">{rev.location}</div>
                  </div>
                  {matchedProduct ? (
                    <button
                      type="button"
                      onClick={() => openProductModal(matchedProduct)}
                      className="text-[11px] font-medium text-[#536B57] hover:underline truncate max-w-[140px] cursor-pointer"
                    >
                      {rev.productName}
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#242424]/60 truncate max-w-[140px]">
                      {rev.productName}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
