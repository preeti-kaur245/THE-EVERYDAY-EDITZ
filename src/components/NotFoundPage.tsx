import React from 'react';
import { useStore } from '../context/StoreContext';
import { ArrowLeft, Compass, Search } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const { returnToHome, navigateToDepartment, navigateToCollection, setIsSearchOpen, departments } =
    useStore();

  return (
    <section className="py-16 sm:py-24 bg-[#F7F5F0]">
      <div className="max-w-2xl mx-auto px-4 text-center space-y-6">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#D9A6A0]/20 text-[#8C5E58] text-xs font-mono uppercase tracking-wider">
          <Compass className="w-3.5 h-3.5" />
          <span>404 · Page Not Found</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold text-[#242424] tracking-tight">
          We couldn&apos;t find that page.
        </h1>

        <p className="text-sm sm:text-base text-[#242424]/70 leading-relaxed">
          The link you followed may have moved, or the product may currently be unavailable.
          Explore our curated departments or search our live catalogue below.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={returnToHome}
            className="px-5 py-2.5 bg-[#242424] hover:bg-black text-white text-xs font-semibold rounded-xl inline-flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="px-5 py-2.5 bg-white hover:bg-[#FAF8F5] text-[#242424] border border-black/15 text-xs font-semibold rounded-xl inline-flex items-center space-x-2 transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Search Catalogue</span>
          </button>
        </div>

        <div className="pt-8 border-t border-black/8">
          <p className="text-xs font-mono uppercase tracking-wider text-black/50 mb-4">
            Popular Collections &amp; Categories
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {departments.map((dept) => (
              <a
                key={dept.id}
                href={`/category/${dept.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigateToDepartment(dept.id);
                }}
                className="px-3.5 py-2 bg-white hover:bg-[#242424] hover:text-white rounded-xl border border-black/8 text-xs font-semibold transition-colors"
              >
                {dept.name}
              </a>
            ))}
            <a
              href="/everyday-essentials"
              onClick={(e) => {
                e.preventDefault();
                navigateToCollection('everyday-essentials');
              }}
              className="px-3.5 py-2 bg-white hover:bg-[#242424] hover:text-white rounded-xl border border-black/8 text-xs font-semibold transition-colors"
            >
              Everyday Essentials
            </a>
            <a
              href="/new-arrivals"
              onClick={(e) => {
                e.preventDefault();
                navigateToCollection('new-arrivals');
              }}
              className="px-3.5 py-2 bg-white hover:bg-[#242424] hover:text-white rounded-xl border border-black/8 text-xs font-semibold transition-colors"
            >
              New Arrivals
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
