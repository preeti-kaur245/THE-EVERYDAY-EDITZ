import React, { useState, useRef, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { ReelVideo, ReelStatus } from '../types';
import { 
  Film, 
  Video, 
  Plus, 
  Search, 
  Filter, 
  Play, 
  Pause, 
  Upload, 
  X, 
  Check, 
  Trash2, 
  Edit3, 
  Eye, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  ShoppingBag, 
  Calendar, 
  Image as ImageIcon,
  ExternalLink,
  Volume2,
  VolumeX,
  RotateCcw
} from 'lucide-react';

export const AdminReelManager: React.FC = () => {
  const { 
    products, 
    adminReels, 
    adminReelsStats, 
    fetchAdminReels, 
    createReel, 
    updateReel, 
    deleteReel, 
    togglePublishReel, 
    reorderReels, 
    uploadReelVideo, 
    uploadReelThumbnail,
    showToast 
  } = useStore();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ReelStatus | 'Scheduled' | 'Expired'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Modal states
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingReel, setEditingReel] = useState<ReelVideo | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewReel, setPreviewReel] = useState<ReelVideo | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formThumbnailUrl, setFormThumbnailUrl] = useState('');
  const [formProductId, setFormProductId] = useState('');
  const [formCategory, setFormCategory] = useState('Lifestyle');
  const [formCtaLabel, setFormCtaLabel] = useState('Shop Now');
  const [formCtaUrl, setFormCtaUrl] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState<number>(1);
  const [formStatus, setFormStatus] = useState<ReelStatus>('Draft');
  const [formPublishedAt, setFormPublishedAt] = useState('');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [cleanupOldVideo, setCleanupOldVideo] = useState(false);

  // Upload status states
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingThumb, setIsUploadingThumb] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Preview player inside editor
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [previewMuted, setPreviewMuted] = useState(true);

  // Categories list
  const CATEGORIES = [
    'Women',
    'Men',
    'Kids',
    'Lifestyle',
    'Home & Organisation',
    'Offers & Bundles',
    'New Arrivals',
    'Trending'
  ];

  // Open editor to create new reel
  const handleAddNew = () => {
    setEditingReel(null);
    setFormTitle('');
    setFormDescription('');
    setFormVideoUrl('');
    setFormThumbnailUrl('');
    setFormProductId('');
    setFormCategory('Lifestyle');
    setFormCtaLabel('Shop Now');
    setFormCtaUrl('');
    setFormDisplayOrder(adminReels.length + 1);
    setFormStatus('Published');
    setFormPublishedAt(new Date().toISOString().slice(0, 16));
    setFormExpiresAt('');
    setCleanupOldVideo(false);
    setUploadError(null);
    setUploadProgress(0);
    setIsEditorOpen(true);
  };

  // Open editor to edit an existing reel
  const handleEdit = (reel: ReelVideo) => {
    setEditingReel(reel);
    setFormTitle(reel.title);
    setFormDescription(reel.description || '');
    setFormVideoUrl(reel.video_url);
    setFormThumbnailUrl(reel.thumbnail_url || '');
    setFormProductId(reel.product_id || '');
    setFormCategory(reel.category || 'Lifestyle');
    setFormCtaLabel(reel.cta_label || 'Shop Now');
    setFormCtaUrl(reel.cta_url || '');
    setFormDisplayOrder(reel.display_order || 1);
    setFormStatus(reel.status);
    setFormPublishedAt(reel.published_at ? new Date(reel.published_at).toISOString().slice(0, 16) : '');
    setFormExpiresAt(reel.expires_at ? new Date(reel.expires_at).toISOString().slice(0, 16) : '');
    setCleanupOldVideo(false);
    setUploadError(null);
    setUploadProgress(0);
    setIsEditorOpen(true);
  };

  // Replace video specifically
  const handleReplaceVideo = (reel: ReelVideo) => {
    handleEdit(reel);
    setCleanupOldVideo(true);
  };

  // File handler for video upload (MP4/WebM)
  const handleVideoFile = async (file: File) => {
    setUploadError(null);

    // Validate type
    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const isMp4OrWebm = validTypes.includes(file.type) || file.name.endsWith('.mp4') || file.name.endsWith('.webm') || file.name.endsWith('.mov');
    
    if (!isMp4OrWebm) {
      setUploadError('Invalid format. Please upload an MP4 (.mp4), WebM (.webm), or QuickTime (.mov) video.');
      return;
    }

    // Validate size (max 100MB)
    const maxBytes = 100 * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed video size is 100MB.`);
      return;
    }

    setIsUploadingVideo(true);
    setUploadProgress(15);

    try {
      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 60) + 10;
          setUploadProgress(percent);
        }
      };

      reader.onload = async () => {
        setUploadProgress(75);
        const dataUrl = reader.result as string;

        const res = await uploadReelVideo(dataUrl, file.name, file.type);
        setUploadProgress(100);
        setIsUploadingVideo(false);

        if (res.success && res.url) {
          setFormVideoUrl(res.url);

          // If no title yet, default to clean filename
          if (!formTitle) {
            const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            setFormTitle(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
          }

          // Automatically extract frame as thumbnail if no thumbnail set
          if (!formThumbnailUrl) {
            captureFrameFromVideoUrl(res.url);
          }
        } else {
          setUploadError(res.error || 'Failed to upload video');
        }
      };

      reader.onerror = () => {
        setIsUploadingVideo(false);
        setUploadError('Failed to read file from your device.');
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploadingVideo(false);
      setUploadError(err.message || 'Error uploading video');
    }
  };

  // Capture frame from video using Canvas
  const captureFrameFromVideoUrl = (url: string) => {
    try {
      const video = document.createElement('video');
      video.src = url;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.currentTime = 0.5;

      video.onloadeddata = () => {
        video.currentTime = Math.min(1, video.duration > 0 ? video.duration / 4 : 0.5);
      };

      video.onseeked = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 720;
        canvas.height = video.videoHeight || 1280;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setIsUploadingThumb(true);
          const thumbRes = await uploadReelThumbnail(thumbDataUrl, 'auto-thumb.jpg');
          setIsUploadingThumb(false);
          if (thumbRes.success && thumbRes.url) {
            setFormThumbnailUrl(thumbRes.url);
            showToast('Auto-captured high-res video poster', 'info');
          }
        }
      };
    } catch (err) {
      console.warn('Could not auto-capture frame:', err);
    }
  };

  // Custom thumbnail file upload
  const handleThumbnailFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Please select a JPG, PNG, or WebP image', 'warning');
      return;
    }

    setIsUploadingThumb(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const res = await uploadReelThumbnail(dataUrl, file.name);
      setIsUploadingThumb(false);
      if (res.success && res.url) {
        setFormThumbnailUrl(res.url);
        showToast('Thumbnail uploaded', 'success');
      } else {
        showToast(res.error || 'Thumbnail upload failed', 'warning');
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Reel Form (Create or Update)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitle.trim()) {
      showToast('Reel title is required', 'warning');
      return;
    }
    if (!formVideoUrl) {
      showToast('Please upload an MP4 or WebM video file', 'warning');
      return;
    }

    const payload: Partial<ReelVideo> & { cleanupOldVideo?: boolean } = {
      title: formTitle.trim(),
      description: formDescription.trim(),
      video_url: formVideoUrl,
      thumbnail_url: formThumbnailUrl,
      product_id: formProductId || undefined,
      category: formCategory,
      cta_label: formCtaLabel || 'Shop Now',
      cta_url: formCtaUrl.trim() || undefined,
      display_order: Number(formDisplayOrder) || 1,
      status: formStatus,
      published_at: formPublishedAt ? new Date(formPublishedAt).toISOString() : (formStatus === 'Published' ? new Date().toISOString() : undefined),
      expires_at: formExpiresAt ? new Date(formExpiresAt).toISOString() : undefined,
      cleanupOldVideo
    };

    if (editingReel) {
      await updateReel(editingReel.id, payload);
    } else {
      await createReel(payload);
    }

    setIsEditorOpen(false);
  };

  // Reorder Up / Down
  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= adminReels.length) return;

    const listCopy = [...adminReels];
    const temp = listCopy[index];
    listCopy[index] = listCopy[targetIdx];
    listCopy[targetIdx] = temp;

    const reorderedIds = listCopy.map(r => r.id);
    await reorderReels(reorderedIds);
  };

  // Filtered Reels
  const filteredReels = useMemo(() => {
    const now = new Date();
    return adminReels.filter(r => {
      // Search
      const matchesSearch = 
        !searchQuery ||
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.category && r.category.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Category
      if (categoryFilter !== 'All' && r.category !== categoryFilter) {
        return false;
      }

      // Status
      if (statusFilter === 'All') return true;
      if (statusFilter === 'Scheduled') {
        return r.status === 'Published' && r.published_at && new Date(r.published_at) > now;
      }
      if (statusFilter === 'Expired') {
        return r.expires_at && new Date(r.expires_at) <= now;
      }
      return r.status === statusFilter;
    });
  }, [adminReels, searchQuery, statusFilter, categoryFilter]);

  // Associated Product Lookup
  const getProduct = (productId?: string) => {
    if (!productId) return null;
    return products.find(p => p.id === productId) || null;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/8">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-[#536B57]/10 text-[#536B57]">
              <Film className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono uppercase tracking-wider text-[#536B57] font-semibold">
              Content Management · Direct Video Hosting
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-[#242424] mt-1">
            Reels & Video Content Management
          </h3>
          <p className="text-xs text-black/60 max-w-2xl mt-0.5">
            Upload genuine vertical MP4/WebM videos to replace all AI simulations. Manage video thumbnails, product associations, publishing dates, and shopping CTAs in real-time.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchAdminReels()}
            className="p-2.5 rounded-xl border border-black/10 hover:bg-black/5 text-[#242424] transition-colors cursor-pointer"
            title="Refresh Reels from Database"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleAddNew}
            className="px-4 py-2.5 bg-[#242424] hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-xs cursor-pointer transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 text-[#D9A6A0]" />
            <span>Add New Reel</span>
          </button>
        </div>
      </div>

      {/* 2. Real-Time Content Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-black/8 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-black/50 font-medium">
            <span>Total Uploaded</span>
            <Video className="w-4 h-4 text-[#242424]" />
          </div>
          <div className="text-2xl font-bold font-mono text-[#242424] mt-1">
            {adminReelsStats.total}
          </div>
          <div className="text-[10px] text-black/40 mt-0.5">Database video records</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-black/8 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-medium">
            <span>Published (Live)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
            {adminReelsStats.published}
          </div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Visible to customers now</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-black/8 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-amber-800 font-medium">
            <span>Drafts</span>
            <Edit3 className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
            {adminReelsStats.draft}
          </div>
          <div className="text-[10px] text-amber-600 mt-0.5">Admin-only review</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-black/8 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-blue-800 font-medium">
            <span>Scheduled</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-700 mt-1">
            {adminReelsStats.scheduled}
          </div>
          <div className="text-[10px] text-blue-600 mt-0.5">Future auto-publish</div>
        </div>
      </div>

      {/* 3. Search & Filters Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-black/8 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
          <input
            type="text"
            placeholder="Search by title, description, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 bg-[#F7F5F0] rounded-xl border border-black/8 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="text-xs px-3 py-2 bg-[#F7F5F0] rounded-xl border border-black/8 focus:outline-hidden font-medium text-[#242424]"
          >
            <option value="All">All Statuses</option>
            <option value="Published">Published (Live)</option>
            <option value="Draft">Drafts</option>
            <option value="Unpublished">Unpublished</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Expired">Expired</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-[#F7F5F0] rounded-xl border border-black/8 focus:outline-hidden font-medium text-[#242424]"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Reels Video Cards Grid */}
      {filteredReels.length === 0 ? (
        <div className="bg-white rounded-3xl border border-black/8 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-[#536B57]/10 text-[#536B57] flex items-center justify-center mx-auto">
            <Film className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-base font-bold text-[#242424]">
              {adminReels.length === 0 ? 'No Reels in Database' : 'No matching reels found'}
            </h4>
            <p className="text-xs text-black/50 max-w-md mx-auto mt-1">
              {adminReels.length === 0 
                ? 'Upload your genuine product videos in 9:16 vertical format. They will immediately stream to your customers on the homepage.'
                : 'Try adjusting your search terms or status filters above.'}
            </p>
          </div>
          {adminReels.length === 0 && (
            <button
              onClick={handleAddNew}
              className="px-5 py-2.5 bg-[#242424] hover:bg-black text-white text-xs font-semibold rounded-xl inline-flex items-center space-x-2 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#D9A6A0]" />
              <span>Upload First Real Video Reel</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReels.map((reel, index) => {
            const product = getProduct(reel.product_id);
            const isLive = reel.status === 'Published' && 
              (!reel.published_at || new Date(reel.published_at) <= new Date()) && 
              (!reel.expires_at || new Date(reel.expires_at) > new Date());

            return (
              <div 
                key={reel.id} 
                className="bg-white rounded-2xl border border-black/8 overflow-hidden shadow-2xs hover:border-black/20 transition-all flex flex-col justify-between"
              >
                {/* Reel Card Header */}
                <div className="p-3.5 pb-2 border-b border-black/6 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-black/5 text-[#242424] font-mono text-[11px] font-bold flex items-center justify-center">
                      #{reel.display_order}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isLive 
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                        : reel.status === 'Draft'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-black/5 text-black/60'
                    }`}>
                      {isLive ? 'LIVE' : reel.status.toUpperCase()}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-black/40">
                    {reel.category}
                  </span>
                </div>

                {/* 9:16 Video Preview & Thumbnail */}
                <div className="p-3.5 flex gap-3">
                  <div className="relative w-28 h-44 rounded-xl bg-black overflow-hidden shrink-0 shadow-inner group">
                    {reel.thumbnail_url ? (
                      <img 
                        src={reel.thumbnail_url} 
                        alt={reel.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      />
                    ) : (
                      <video 
                        src={reel.video_url} 
                        preload="metadata" 
                        muted 
                        className="w-full h-full object-cover" 
                      />
                    )}

                    {/* Play Overlay trigger */}
                    <button
                      onClick={() => {
                        setPreviewReel(reel);
                        setIsPreviewOpen(true);
                      }}
                      className="absolute inset-0 bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors cursor-pointer"
                      title="Preview Reel Player"
                    >
                      <div className="w-9 h-9 rounded-full bg-white/30 backdrop-blur-xs flex items-center justify-center">
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </div>
                    </button>

                    <div className="absolute bottom-1 right-1 text-[9px] font-mono bg-black/70 text-white px-1.5 py-0.5 rounded">
                      9:16
                    </div>
                  </div>

                  {/* Reel Metadata Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h4 className="text-xs font-bold text-[#242424] line-clamp-1">
                        {reel.title}
                      </h4>
                      <p className="text-[11px] text-black/60 line-clamp-2 mt-1 leading-snug">
                        {reel.description || 'No caption provided.'}
                      </p>

                      {/* Associated Product Pill */}
                      {product ? (
                        <div className="mt-2 p-1.5 bg-[#F7F5F0] rounded-lg border border-black/5 flex items-center space-x-2">
                          <img 
                            src={product.primaryImage || product.images[0]} 
                            alt={product.name} 
                            className="w-6 h-6 rounded object-cover shrink-0" 
                          />
                          <div className="min-w-0 flex-1 truncate">
                            <div className="text-[10px] font-semibold text-[#242424] truncate">{product.name}</div>
                            <div className="text-[9px] font-mono text-[#536B57] font-bold">₹{product.price}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 text-[10px] text-black/40 italic">
                          No product linked
                        </div>
                      )}
                    </div>

                    <div className="text-[10px] text-black/40 font-mono pt-2">
                      CTA: <span className="font-semibold text-[#242424]">{reel.cta_label || 'Shop Now'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-3 bg-[#FAF8F5] border-t border-black/6 flex items-center justify-between text-xs">
                  {/* Reorder Up/Down */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleMoveOrder(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg hover:bg-black/5 disabled:opacity-30 text-[#242424] transition-colors cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveOrder(index, 'down')}
                      disabled={index === adminReels.length - 1}
                      className="p-1.5 rounded-lg hover:bg-black/5 disabled:opacity-30 text-[#242424] transition-colors cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick Publish / Unpublish Toggle */}
                  <button
                    onClick={() => togglePublishReel(reel.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                      reel.status === 'Published'
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-black/10 text-black/70 hover:bg-black/15'
                    }`}
                  >
                    {reel.status === 'Published' ? 'Published' : 'Publish'}
                  </button>

                  {/* Actions Menu */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleReplaceVideo(reel)}
                      className="p-1.5 rounded-lg hover:bg-black/5 text-[#536B57] transition-colors cursor-pointer"
                      title="Replace Video Asset"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleEdit(reel)}
                      className="p-1.5 rounded-lg hover:bg-black/5 text-[#242424] transition-colors cursor-pointer"
                      title="Edit Metadata"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(reel.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors cursor-pointer"
                      title="Delete Reel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 5. ADD / EDIT REEL MODAL */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-black/10 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-black/8 flex items-center justify-between shrink-0 bg-[#F7F5F0]">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-[#536B57]/15 text-[#536B57] flex items-center justify-center">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#242424]">
                    {editingReel ? (cleanupOldVideo ? 'Replace Reel Video Asset' : 'Edit Reel Metadata') : 'Upload & Publish New Reel'}
                  </h3>
                  <p className="text-[10px] text-black/50 font-mono">
                    Direct local storage · 9:16 vertical stream to customers
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEditorOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-black/5 text-black/60 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Form */}
            <form onSubmit={handleSubmitForm} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              
              {/* VIDEO UPLOAD DROPZONE */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#242424]">
                  Video File (MP4 or WebM) *
                </label>

                {/* Dropzone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files?.[0]) {
                      handleVideoFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all ${
                    isDragging ? 'border-[#536B57] bg-[#536B57]/5' : 'border-black/15 bg-[#FAF8F5]'
                  }`}
                >
                  {isUploadingVideo ? (
                    <div className="space-y-3 py-4">
                      <div className="w-8 h-8 border-2 border-[#536B57] border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-semibold text-[#242424]">Uploading video asset ({uploadProgress}%)...</p>
                      <div className="w-48 h-1.5 bg-black/10 rounded-full mx-auto overflow-hidden">
                        <div className="h-full bg-[#536B57] transition-all" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  ) : formVideoUrl ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* Video Player Preview */}
                      <div className="relative w-28 h-44 rounded-xl bg-black overflow-hidden shrink-0 shadow-md">
                        <video 
                          ref={videoPreviewRef}
                          src={formVideoUrl} 
                          playsInline 
                          muted={previewMuted}
                          loop
                          className="w-full h-full object-cover" 
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (videoPreviewRef.current) {
                              if (previewPlaying) {
                                videoPreviewRef.current.pause();
                                setPreviewPlaying(false);
                              } else {
                                videoPreviewRef.current.play();
                                setPreviewPlaying(true);
                              }
                            }
                          }}
                          className="absolute inset-0 bg-black/20 hover:bg-black/40 flex items-center justify-center text-white cursor-pointer"
                        >
                          {previewPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-white" />}
                        </button>
                      </div>

                      <div className="text-left flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center space-x-1.5 text-emerald-700 text-xs font-semibold">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Video Asset Stored & Ready</span>
                        </div>
                        <div className="text-[11px] font-mono text-black/60 truncate">
                          {formVideoUrl}
                        </div>

                        <div className="pt-2 flex items-center space-x-2">
                          <label className="px-3 py-1.5 bg-white border border-black/10 hover:border-black/30 rounded-lg text-xs font-medium cursor-pointer shadow-2xs">
                            <span>Change Video</span>
                            <input
                              type="file"
                              accept="video/mp4,video/webm,video/quicktime"
                              className="hidden"
                              onChange={(e) => e.target.files?.[0] && handleVideoFile(e.target.files[0])}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => captureFrameFromVideoUrl(formVideoUrl)}
                            className="px-3 py-1.5 bg-white border border-black/10 hover:border-black/30 rounded-lg text-xs font-medium cursor-pointer shadow-2xs flex items-center space-x-1"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-[#536B57]" />
                            <span>Capture Frame as Poster</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 py-4">
                      <div className="w-10 h-10 rounded-full bg-black/5 text-[#242424] flex items-center justify-center mx-auto">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div className="text-xs font-semibold text-[#242424]">
                        Drag & drop vertical video here or click to browse
                      </div>
                      <p className="text-[10px] text-black/50">
                        Supports MP4 and WebM (up to 100MB) · Recommended aspect ratio 9:16
                      </p>
                      <label className="inline-block mt-2 px-4 py-2 bg-[#242424] text-white rounded-xl text-xs font-semibold cursor-pointer hover:bg-black shadow-xs">
                        <span>Select Video from Device</span>
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && handleVideoFile(e.target.files[0])}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs flex items-start space-x-2 border border-red-200">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              {/* THUMBNAIL UPLOAD */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#242424]">
                  Custom Video Poster Thumbnail (Optional)
                </label>
                <div className="flex items-center space-x-3">
                  {formThumbnailUrl && (
                    <img 
                      src={formThumbnailUrl} 
                      alt="Thumbnail preview" 
                      className="w-12 h-16 rounded-lg object-cover border border-black/10 shrink-0" 
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <label className="px-3 py-1.5 bg-[#FAF8F5] border border-black/10 hover:border-black/30 rounded-xl text-xs font-medium cursor-pointer inline-flex items-center space-x-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-[#536B57]" />
                      <span>{formThumbnailUrl ? 'Change Thumbnail Image' : 'Upload Custom Poster Frame'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleThumbnailFile(e.target.files[0])}
                      />
                    </label>
                    <p className="text-[10px] text-black/40 mt-1">
                      Displayed immediately before playback starts.
                    </p>
                  </div>
                </div>
              </div>

              {/* TITLE & DESCRIPTION */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#242424] mb-1">
                    Reel Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Travel Cosmetic Roll-Up in Action"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-black/10 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#242424] mb-1">
                    Short Caption / Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Watch it unroll into 4 compartmentalized transparent pockets hung on a hotel bathroom door."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-[#F7F5F0] rounded-xl border border-black/10 focus:outline-hidden resize-none"
                  />
                </div>
              </div>

              {/* PRODUCT ASSOCIATION & CATEGORY */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#242424] mb-1">
                    Associate with Product (Enables "Shop Now")
                  </label>
                  <select
                    value={formProductId}
                    onChange={(e) => setFormProductId(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 bg-[#F7F5F0] rounded-xl border border-black/10 focus:outline-hidden"
                  >
                    <option value="">No Product (Brand awareness only)</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{p.price})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#242424] mb-1">
                    Category Tag
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-xs px-3 py-2.5 bg-[#F7F5F0] rounded-xl border border-black/10 focus:outline-hidden"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CTA LABEL & URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#242424] mb-1">
                    CTA Button Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shop Now, Explore Find, View Details"
                    value={formCtaLabel}
                    onChange={(e) => setFormCtaLabel(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-black/10 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#242424] mb-1">
                    Custom Destination URL (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /#daily-edit or custom URL"
                    value={formCtaUrl}
                    onChange={(e) => setFormCtaUrl(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-black/10 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* DISPLAY ORDER & STATUS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-black/6">
                <div>
                  <label className="block text-xs font-semibold text-[#242424] mb-1">
                    Display Order Position
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formDisplayOrder}
                    onChange={(e) => setFormDisplayOrder(Number(e.target.value))}
                    className="w-full text-xs px-3.5 py-2 bg-[#F7F5F0] rounded-xl border border-black/10 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#242424] mb-1">
                    Publishing Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 bg-[#F7F5F0] rounded-xl border border-black/10 focus:outline-hidden font-semibold"
                  >
                    <option value="Published">Published (Live to customers)</option>
                    <option value="Draft">Draft (Admin review only)</option>
                    <option value="Unpublished">Unpublished (Archived)</option>
                  </select>
                </div>
              </div>

              {/* OPTIONAL SCHEDULING (Publish date & Expiry date) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#FAF8F5] rounded-2xl border border-black/6">
                <div>
                  <label className="block text-[11px] font-semibold text-[#242424] mb-1">
                    Schedule Publish Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formPublishedAt}
                    onChange={(e) => setFormPublishedAt(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-black/10 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#242424] mb-1">
                    Campaign Expiry Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-white rounded-lg border border-black/10 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Actions Button */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-xs text-black/60 hover:text-black transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!formVideoUrl || isUploadingVideo}
                  className="px-6 py-2.5 bg-[#242424] hover:bg-black disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  {editingReel ? 'Save Reel Updates' : 'Publish Reel to Storefront'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* 6. LIVE REEL CUSTOMER PREVIEW MODAL */}
      {isPreviewOpen && previewReel && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4">
          <div className="relative w-full max-w-sm h-[85vh] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/20 flex flex-col justify-between">
            
            {/* Top Close */}
            <div className="absolute top-3 right-3 z-30">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 text-white hover:bg-white/40 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video Player */}
            <div className="relative w-full h-full">
              <video
                src={previewReel.video_url}
                poster={previewReel.thumbnail_url}
                autoPlay
                playsInline
                loop
                controls
                className="w-full h-full object-cover"
              />
            </div>

            {/* Bottom Overlay Card */}
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent z-20 space-y-2">
              <h4 className="text-white text-xs font-bold">{previewReel.title}</h4>
              <p className="text-white/80 text-[11px] line-clamp-2">{previewReel.description}</p>
              
              {previewReel.product_id && getProduct(previewReel.product_id) && (
                <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-between text-white text-xs">
                  <div>
                    <div className="font-semibold">{getProduct(previewReel.product_id)?.name}</div>
                    <div className="font-mono text-emerald-400">₹{getProduct(previewReel.product_id)?.price}</div>
                  </div>
                  <span className="px-3 py-1 bg-[#D9A6A0] text-[#242424] font-bold rounded-lg text-[10px]">
                    {previewReel.cta_label || 'Shop Now'}
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 7. DELETE CONFIRMATION MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-black/10">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h4 className="text-sm font-bold text-[#242424]">Delete this Reel?</h4>
              <p className="text-xs text-black/60 mt-1">
                This will remove the reel from your public storefront and clean up the video storage. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="w-full py-2 bg-black/5 text-[#242424] rounded-xl text-xs font-semibold hover:bg-black/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const id = deleteConfirmId;
                  setDeleteConfirmId(null);
                  await deleteReel(id);
                }}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
