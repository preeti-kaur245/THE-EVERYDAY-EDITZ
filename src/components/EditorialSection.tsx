/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, ArrowRight, Eye, ShoppingBag, Check } from 'lucide-react';
import { useStore, isProductLiveOnStorefront } from '../context/StoreContext';
import { Product } from '../types';

export const EditorialSection: React.FC = () => {
  const { editorialCollections, products, openProductModal, addToCart } = useStore();
  const [activeImageMap, setActiveImageMap] = useState<Record<string, number>>({});
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  const publishedCollections = (editorialCollections || []).filter(
    (c) => c.status === 'Published'
  );

  if (publishedCollections.length === 0) {
    return null;
  }

  const handleAdd = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (!product.inStock || (product.stockCount ?? 0) <= 0) return;
    addToCart(product, 1);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1800);
  };

  return (
    <section className="py-16 md:py-24 bg-[#F2EFE9] border-t border-b border-[#242424]/10 relative overflow-hidden">
      {/* Editorial Decorative Grid Watermark */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#242424_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 border-b border-[#242424]/15 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-mono tracking-widest uppercase text-[#536B57] font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#536B57]" />
              <span>Raftaar Solutions Studio Curation</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#242424] tracking-tight">
              Curated Editorial Capsules
            </h2>
          </div>
          <p className="mt-3 md:mt-0 text-xs sm:text-sm text-[#242424]/70 max-w-md font-sans">
            Visual field notes, functional styling guides, and hand-selected everyday essentials assembled for intentional living.
          </p>
        </div>

        {/* Collections Stack */}
        <div className="space-y-20 md:space-y-28">
          {publishedCollections.map((collection, index) => {
            const activeImgIdx = activeImageMap[collection.id] || 0;
            const currentImg = collection.images[activeImgIdx] || collection.images[0] || '';
            const productIdsList = collection.productIds || [];
            const linkedProducts = productIdsList
              .map((id: string) => products.find((p) => p.id === id && isProductLiveOnStorefront(p)))
              .filter(Boolean) as Product[];

            const isReversed = index % 2 === 1;

            return (
              <div
                key={collection.id}
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
              >
                {/* Visual Lookbook Column (7 Cols) */}
                <div
                  className={`lg:col-span-7 ${
                    isReversed ? 'lg:order-2' : 'lg:order-1'
                  }`}
                >
                  <div className="relative group bg-white p-3 sm:p-4 rounded-sm shadow-sm border border-[#242424]/10">
                    {/* Main Featured Photo */}
                    <div className="relative aspect-[4/3] sm:aspect-[16/10] overflow-hidden bg-[#E8E4DC] rounded-sm">
                      <img
                        src={currentImg}
                        alt={collection.title}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                      <div className="absolute top-3 left-3 bg-[#242424]/85 backdrop-blur-xs text-white text-[10px] font-mono tracking-widest uppercase px-2.5 py-1 rounded-none">
                        {collection.category}
                      </div>
                      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs text-[#242424] text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-none border border-[#242424]/10">
                        {activeImgIdx + 1} / {collection.images.length || 1}
                      </div>
                    </div>

                    {/* Secondary Image Thumbnails strip */}
                    {collection.images.length > 1 && (
                      <div className="flex gap-2.5 mt-3 overflow-x-auto pb-1 scrollbar-none">
                        {collection.images.map((img, imgIdx) => (
                          <button
                            key={imgIdx}
                            type="button"
                            onClick={() =>
                              setActiveImageMap((prev) => ({
                                ...prev,
                                [collection.id]: imgIdx,
                              }))
                            }
                            className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-sm overflow-hidden border-2 transition-all cursor-pointer ${
                              activeImgIdx === imgIdx
                                ? 'border-[#242424] shadow-xs'
                                : 'border-transparent opacity-65 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={img}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                            {imgIdx === 0 && (
                              <span className="absolute bottom-0 inset-x-0 bg-[#242424]/80 text-[8px] text-white text-center py-0.5 font-mono uppercase">
                                Cover
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Editorial Narrative & Linked Products Column (5 Cols) */}
                <div
                  className={`lg:col-span-5 flex flex-col justify-center ${
                    isReversed ? 'lg:order-1' : 'lg:order-2'
                  }`}
                >
                  <div className="space-y-4">
                    <span className="text-[11px] font-mono tracking-widest uppercase text-[#B7A18D] font-bold">
                      CAPSULE #{String(index + 1).padStart(2, '0')}
                    </span>

                    <h3 className="text-2xl sm:text-3xl font-serif text-[#242424] leading-tight">
                      {collection.title}
                    </h3>

                    <p className="text-sm sm:text-base text-[#242424]/80 leading-relaxed font-sans">
                      {collection.shortDescription}
                    </p>

                    {collection.curatorNote && (
                      <div className="bg-white/70 border-l-2 border-[#536B57] p-3.5 rounded-none text-xs text-[#242424]/85 italic">
                        &ldquo;{collection.curatorNote}&rdquo;
                      </div>
                    )}

                    {/* Linked Products Carousel / List */}
                    {linkedProducts.length > 0 && (
                      <div className="pt-4 border-t border-[#242424]/10">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[11px] font-mono tracking-widest uppercase text-[#242424]/70 font-semibold">
                            Featured Essentials in Capsule ({linkedProducts.length})
                          </h4>
                        </div>

                        <div className="space-y-2.5">
                          {linkedProducts.slice(0, 3).map((item) => {
                            const isOut = !item.inStock || (item.stockCount ?? 0) <= 0;
                            return (
                            <div
                              key={item.id}
                              onClick={() => openProductModal(item)}
                              className="group flex items-center justify-between p-2.5 bg-white hover:bg-[#FDFBF7] border border-[#242424]/10 rounded-sm transition-all cursor-pointer shadow-2xs hover:border-[#242424]/30"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-12 h-12 rounded-sm overflow-hidden bg-[#F7F5F0] border border-[#242424]/5 flex-shrink-0">
                                  <img
                                    src={item.primaryImage || item.images?.[0] || ''}
                                    alt={item.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-[#242424] truncate group-hover:text-[#536B57] transition-colors">
                                    {item.name}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs font-mono font-semibold text-[#242424]">
                                      ₹{item.price}
                                    </span>
                                    {item.originalPrice && item.originalPrice > item.price && (
                                      <span className="text-[10px] text-[#242424]/40 line-through">
                                        ₹{item.originalPrice}
                                      </span>
                                    )}
                                    <span className="text-[9px] font-mono uppercase bg-[#536B57]/10 text-[#536B57] px-1.5 py-0.2 rounded-none">
                                      {item.departments?.[0] || 'lifestyle'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openProductModal(item);
                                  }}
                                  className="p-1.5 text-[#242424]/60 hover:text-[#242424] hover:bg-[#F2EFE9] rounded-sm transition-colors cursor-pointer"
                                  title="Quick View"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isOut}
                                  onClick={(e) => handleAdd(e, item)}
                                  className={`px-2.5 py-1.5 text-xs font-mono tracking-wider uppercase rounded-sm flex items-center gap-1 transition-all ${
                                    isOut
                                      ? 'bg-zinc-200 text-zinc-500 cursor-not-allowed'
                                      : addedProductId === item.id
                                      ? 'bg-[#536B57] text-white cursor-pointer'
                                      : 'bg-[#242424] text-white hover:bg-black cursor-pointer'
                                  }`}
                                  title={isOut ? 'Out of Stock' : 'Add to Bag'}
                                >
                                  {isOut ? (
                                    <span className="text-[10px]">Sold Out</span>
                                  ) : addedProductId === item.id ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span className="hidden sm:inline">Added</span>
                                    </>
                                  ) : (
                                    <>
                                      <ShoppingBag className="w-3 h-3" />
                                      <span className="hidden sm:inline">Bag</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )})}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
