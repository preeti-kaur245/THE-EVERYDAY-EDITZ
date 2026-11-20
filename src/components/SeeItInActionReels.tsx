import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { backgroundAudio } from '../utils/backgroundAudio';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  ChevronUp, 
  ChevronDown, 
  ShoppingBag, 
  Heart, 
  X, 
  ExternalLink,
  Sparkles,
  Share2,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

export const SeeItInActionReels: React.FC = () => {
  const { 
    products, 
    reels,
    isReelsOpen, 
    setIsReelsOpen, 
    activeReelIndex, 
    setActiveReelIndex,
    activeReel,
    addToCart, 
    toggleWishlist, 
    isInWishlist,
    openProductModal,
    showToast
  } = useStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true); // Default muted to comply with browser autoplay restrictions
  const [progress, setProgress] = useState(0);
  const [hasEnded, setHasEnded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Public published reels only on storefront
  const activeReelsList = reels;

  const currentReel = activeReelsList[activeReelIndex] || activeReel || activeReelsList[0];
  const associatedProduct = currentReel?.product_id ? products.find(p => p.id === currentReel.product_id) : null;

  // Handle video element play / pause when active reel or modal state changes
  useEffect(() => {
    if (!isReelsOpen || !currentReel) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      return;
    }

    setProgress(0);
    setHasEnded(false);
    setVideoError(false);
    setIsPlaying(true);

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch((err) => {
            console.warn('Autoplay prevented or interrupted:', err);
            setIsPlaying(false);
          });
      }
    }
  }, [isReelsOpen, activeReelIndex, currentReel?.id]);

  // Politely pause ambient background audio while a reel video is playing unmuted
  useEffect(() => {
    const shouldDuck = Boolean(isReelsOpen && currentReel && !isMuted);
    backgroundAudio.setMediaDucking(shouldDuck);
    return () => {
      backgroundAudio.setMediaDucking(false);
    };
  }, [isReelsOpen, currentReel?.id, isMuted]);

  // Keyboard navigation (ArrowUp, ArrowDown, Space, Escape, M)
  useEffect(() => {
    if (!isReelsOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMuted(prev => !prev);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsReelsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReelsOpen, activeReelsList.length, activeReelIndex]);

  // Close if no reels available
  if (!isReelsOpen) return null;

  // Graceful empty state when no reels have been published yet
  if (!currentReel || activeReelsList.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center text-white space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto text-[#D9A6A0]">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold">No Reels Published Yet</h3>
            <p className="text-xs text-white/60 mt-1.5 leading-relaxed">
              Product video demonstrations will appear here as new edits are published.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => setIsReelsOpen(false)}
              className="w-full py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const togglePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleNext = () => {
    if (activeReelsList.length <= 1) return;
    setActiveReelIndex((activeReelIndex + 1) % activeReelsList.length);
  };

  const handlePrev = () => {
    if (activeReelsList.length <= 1) return;
    setActiveReelIndex((activeReelIndex - 1 + activeReelsList.length) % activeReelsList.length);
  };

  const handleReplay = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().then(() => {
      setIsPlaying(true);
      setHasEnded(false);
    }).catch(() => {});
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    const cur = videoRef.current.currentTime;
    if (dur > 0) {
      setProgress((cur / dur) * 100);
    }
  };

  const handleVideoEnded = () => {
    setHasEnded(true);
    setIsPlaying(false);
    // If there are multiple reels, auto-advance after 1.5s
    if (activeReelsList.length > 1) {
      handleNext();
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: currentReel.title,
        text: `Watch ${currentReel.title} on The Everyday Editz!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Reel link copied to clipboard!');
    }
  };

  const handleShopNow = () => {
    if (associatedProduct) {
      setIsReelsOpen(false);
      openProductModal(associatedProduct);
    } else if (currentReel.cta_url) {
      window.location.href = currentReel.cta_url;
      setIsReelsOpen(false);
    } else {
      setIsReelsOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      
      {/* Top Close Button */}
      <div className="absolute top-4 right-4 z-50 flex items-center space-x-2">
        <button
          onClick={() => setIsReelsOpen(false)}
          className="w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer shadow-lg"
          aria-label="Close Reels"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main 9:16 Vertical Reel Player Container */}
      <div className="relative w-full sm:max-w-md h-full sm:h-[88vh] sm:rounded-3xl bg-black overflow-hidden flex flex-col justify-between shadow-2xl border border-white/10">
        
        {/* Top Progress Segmented Bar */}
        <div className="absolute top-2 inset-x-2 z-30 flex items-center space-x-1.5 px-2">
          {activeReelsList.map((_, idx) => (
            <div key={idx} className="h-1 flex-1 bg-white/25 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-white transition-all ${
                  idx === activeReelIndex ? 'duration-100' : 'duration-0'
                }`}
                style={{
                  width: idx === activeReelIndex ? `${progress}%` : idx < activeReelIndex ? '100%' : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Brand Header Bar over Video */}
        <div className="absolute top-6 inset-x-4 z-30 flex items-center justify-between text-white text-xs pointer-events-none">
          <div className="flex items-center space-x-2 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 pointer-events-auto">
            <Sparkles className="w-3.5 h-3.5 text-[#D9A6A0]" />
            <span className="font-semibold font-mono text-[11px] tracking-wider uppercase">
              {currentReel.category || 'SEE IT IN ACTION'}
            </span>
            <span className="text-white/40">·</span>
            <span className="font-mono text-[11px]">{activeReelIndex + 1}/{activeReelsList.length}</span>
          </div>

          <div className="flex items-center space-x-2 pointer-events-auto">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/70 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Real HTML5 Vertical Video Element */}
        <div 
          onClick={togglePlayPause}
          className="relative w-full h-full flex items-center justify-center cursor-pointer select-none bg-black overflow-hidden"
        >
          {videoError ? (
            <div className="text-center p-6 space-y-2 text-white">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <div className="text-sm font-semibold">Video Unavailable</div>
              <p className="text-xs text-white/60">Could not stream this video file.</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={currentReel.video_url}
              poster={currentReel.thumbnail_url}
              playsInline
              preload="metadata"
              muted={isMuted}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleVideoEnded}
              onError={() => setVideoError(true)}
              className="w-full h-full object-cover"
            />
          )}

          {/* Paused Overlay Watermark */}
          {!isPlaying && !hasEnded && !videoError && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-black/50 border border-white/30 flex items-center justify-center text-white shadow-xl backdrop-blur-xs">
                <Play className="w-7 h-7 fill-white ml-1" />
              </div>
            </div>
          )}

          {/* Replay Overlay when ended */}
          {hasEnded && (
            <div 
              onClick={(e) => { e.stopPropagation(); handleReplay(); }}
              className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer"
            >
              <div className="w-16 h-16 rounded-full bg-[#536B57]/90 border border-white/40 flex items-center justify-center text-white shadow-xl hover:scale-105 transition-transform">
                <RotateCcw className="w-7 h-7" />
              </div>
            </div>
          )}

          {/* Floating Vertical Actions on Right (Like, Share, Prev, Next) */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="absolute right-3 bottom-36 z-30 flex flex-col items-center space-y-3.5 text-white"
          >
            {/* Wishlist if linked to a product */}
            {associatedProduct && (
              <button
                onClick={() => toggleWishlist(associatedProduct.id)}
                className="flex flex-col items-center cursor-pointer group"
                title={isInWishlist(associatedProduct.id) ? 'Saved to Wishlist' : 'Save to Wishlist'}
              >
                <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center group-hover:bg-black/70 transition-colors shadow-md">
                  <Heart className={`w-5 h-5 ${isInWishlist(associatedProduct.id) ? 'fill-[#D9A6A0] text-[#D9A6A0]' : 'text-white'}`} />
                </div>
                <span className="text-[10px] mt-1 font-mono text-white/80">Save</span>
              </button>
            )}

            {/* Share */}
            <button
              onClick={handleShare}
              className="flex flex-col items-center cursor-pointer group"
              title="Share Reel"
            >
              <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center group-hover:bg-black/70 transition-colors shadow-md">
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] mt-1 font-mono text-white/80">Share</span>
            </button>

            {/* Previous Reel */}
            {activeReelsList.length > 1 && (
              <button
                onClick={handlePrev}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer shadow-md"
                title="Previous Reel (Up Arrow)"
              >
                <ChevronUp className="w-5 h-5 text-white" />
              </button>
            )}

            {/* Next Reel */}
            {activeReelsList.length > 1 && (
              <button
                onClick={handleNext}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center hover:bg-black/70 transition-colors cursor-pointer shadow-md"
                title="Next Reel (Down Arrow)"
              >
                <ChevronDown className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Metadata & Interactive Product Shopping Dock */}
        <div className="relative z-30 p-4 bg-gradient-to-t from-black via-black/85 to-transparent space-y-3">
          
          {/* Reel Title & Description */}
          <div className="pr-12">
            <h3 className="text-white text-sm font-bold leading-tight">
              {currentReel.title}
            </h3>
            {currentReel.description && (
              <p className="text-white/80 text-xs leading-relaxed line-clamp-2 mt-1">
                {currentReel.description}
              </p>
            )}
          </div>

          {/* Interactive Floating Product Dock (if product associated) */}
          {associatedProduct ? (
            <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between shadow-lg">
              <div 
                onClick={handleShopNow}
                className="flex items-center space-x-2.5 cursor-pointer flex-1 min-w-0 mr-2"
              >
                <img 
                  src={associatedProduct.primaryImage || associatedProduct.images[0]} 
                  alt={associatedProduct.name} 
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-cover bg-white/10 shrink-0 border border-white/10" 
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-white text-xs font-semibold truncate leading-tight">
                    {associatedProduct.name}
                  </h4>
                  <div className="flex items-baseline space-x-1.5 mt-0.5">
                    <span className="text-white font-mono font-bold text-sm">₹{associatedProduct.price}</span>
                    {associatedProduct.originalPrice > associatedProduct.price && (
                      <del className="text-white/50 font-mono text-[11px]">₹{associatedProduct.originalPrice}</del>
                    )}
                  </div>
                </div>
              </div>

              {/* Direct Shop / Add-to-Bag Button */}
              <div className="flex items-center space-x-1.5 shrink-0">
                <button
                  onClick={handleShopNow}
                  className="p-2 text-white/80 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="View Specs"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    addToCart(associatedProduct, 1);
                  }}
                  className="px-3.5 py-2 bg-[#D9A6A0] hover:bg-[#c8958f] text-[#242424] rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-md cursor-pointer transition-colors"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{currentReel.cta_label || 'Shop Now'}</span>
                </button>
              </div>
            </div>
          ) : (
            currentReel.cta_label && (
              <button
                onClick={handleShopNow}
                className="w-full py-2.5 bg-[#D9A6A0] hover:bg-[#c8958f] text-[#242424] rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 shadow-md cursor-pointer transition-colors"
              >
                <span>{currentReel.cta_label}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )
          )}

        </div>

      </div>
    </div>
  );
};
