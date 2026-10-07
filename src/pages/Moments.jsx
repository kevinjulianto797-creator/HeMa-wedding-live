import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Heart, 
  Download, 
  X, 
  Sparkles, 
  Image as ImageIcon, 
  Video, 
  Share2, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  Smartphone,
  FolderOpen,
  Clock,
  RefreshCw
} from 'lucide-react';
import { INITIAL_MOMENTS } from '../services/mockData';
import { getAllMoments, saveMoment, updateMomentLikes, markMomentSynced } from '../services/db';
import { syncService } from '../services/syncService';
import { syncMediaToGoogle } from '../services/googleSync';
import { getWeddingSettings } from '../services/weddingSettings';
import { InAppCameraModal } from '../components/InAppCameraModal';
import { compressImage } from '../utils/imageCompressor';

export function Moments() {
  const [weddingSettings] = useState(getWeddingSettings());
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'photographer' | 'guest'
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [moments, setMoments] = useState(INITIAL_MOMENTS);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [lightboxMoment, setLightboxMoment] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Batasan Kuota Upload per Tamu
  const MAX_PHOTOS_PER_GUEST = 30;
  const MAX_VIDEOS_PER_GUEST = 2;
  const MAX_VIDEO_DURATION_SECONDS = 30; // 30 Detik maksimal (mirip WA Status / IG Story)

  const [uploadQuota, setUploadQuota] = useState(() => {
    try {
      const raw = localStorage.getItem('hema_guest_upload_quota');
      return raw ? JSON.parse(raw) : { photos: 0, videos: 0 };
    } catch {
      return { photos: 0, videos: 0 };
    }
  });

  // Helper untuk membaca durasi file video via HTML5 Video
  const getVideoDuration = (file) => {
    return new Promise((resolve) => {
      try {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          resolve(Math.round(video.duration || 0));
        };
        video.onerror = () => {
          resolve(0);
        };
        video.src = URL.createObjectURL(file);
      } catch {
        resolve(0);
      }
    });
  };

  // Form upload state
  const [checkedInGuestName, setCheckedInGuestName] = useState(() => {
    try {
      return localStorage.getItem('hema_current_guest_name') || '';
    } catch {
      return '';
    }
  });
  const [uploaderName, setUploaderName] = useState(() => {
    try {
      return localStorage.getItem('hema_current_guest_name') || '';
    } catch {
      return '';
    }
  });
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('Selfie Tamu');
  const [previewMedia, setPreviewMedia] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Hidden native camera & gallery input refs
  const nativePhotoInputRef = useRef(null);
  const nativeVideoInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    loadMoments();

    const savedGuest = localStorage.getItem('hema_current_guest_name') || '';
    if (savedGuest) {
      setCheckedInGuestName(savedGuest);
      setUploaderName((prev) => prev || savedGuest);
    }

    const handleGuestCheckIn = (e) => {
      const name = e.detail?.name || localStorage.getItem('hema_current_guest_name') || '';
      if (name) {
        setCheckedInGuestName(name);
        setUploaderName(name);
      }
    };

    const unsubscribe = syncService.subscribe((status) => {
      setIsOnline(status.isOnline);
    });

    const handleSyncComplete = () => {
      loadMoments();
    };

    window.addEventListener('wedding-sync-completed', handleSyncComplete);
    window.addEventListener('wedding-guest-checked-in', handleGuestCheckIn);

    return () => {
      unsubscribe();
      window.removeEventListener('wedding-sync-completed', handleSyncComplete);
      window.removeEventListener('wedding-guest-checked-in', handleGuestCheckIn);
    };
  }, []);

  const loadMoments = async () => {
    try {
      const dbMoments = await getAllMoments();
      // Filter out any unsplash dummy photos
      const realMoments = (dbMoments || []).filter(
        (m) => !m.previewUrl?.includes('images.unsplash.com')
      );
      setMoments(realMoments);
    } catch (e) {
      console.error('Error loading moments:', e);
    }
  };

  // Filter moments
  const filteredMoments = moments.filter((m) => {
    if (activeTab === 'photographer' && m.uploaderRole !== 'photographer') return false;
    if (activeTab === 'guest' && m.uploaderRole !== 'guest') return false;
    if (selectedCategory !== 'Semua' && m.category !== selectedCategory) return false;
    return true;
  });

  const categories = ['Semua', 'Akad Nikah', 'Resepsi', 'Selfie Tamu', 'Dekorasi & Venue', 'Detail Momen'];

  // Handle Like with optimistic update
  const handleLike = async (id, e) => {
    e.stopPropagation();
    try {
      await updateMomentLikes(id, 1);
      setMoments((prev) =>
        prev.map((m) => (m.id === id ? { ...m, likes: (m.likes || 0) + 1 } : m))
      );
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  // Trigger handlers with quota validation
  const handleOpenInAppCamera = () => {
    if (uploadQuota.photos >= MAX_PHOTOS_PER_GUEST) {
      alert(`Anda telah mencapai batas maksimal ${MAX_PHOTOS_PER_GUEST} foto per tamu. Terima kasih banyak telah mengabadikan momen berharga!`);
      return;
    }
    setIsUploadOpen(false);
    setIsCameraOpen(true);
  };

  const handleTriggerNativePhoto = () => {
    if (uploadQuota.photos >= MAX_PHOTOS_PER_GUEST) {
      alert(`Anda telah mencapai batas maksimal ${MAX_PHOTOS_PER_GUEST} foto per tamu. Terima kasih banyak telah mengabadikan momen berharga!`);
      return;
    }
    nativePhotoInputRef.current?.click();
  };

  const handleTriggerNativeVideo = () => {
    if (uploadQuota.videos >= MAX_VIDEOS_PER_GUEST) {
      alert(`Anda telah mencapai batas maksimal ${MAX_VIDEOS_PER_GUEST} video ucapan per tamu. Terima kasih atas partisipasi Anda!`);
      return;
    }
    nativeVideoInputRef.current?.click();
  };

  // Handle photo from in-app camera modal
  const handleInAppPhotoCaptured = async ({ file, previewUrl }) => {
    if (uploadQuota.photos >= MAX_PHOTOS_PER_GUEST) {
      alert(`Batas maksimal ${MAX_PHOTOS_PER_GUEST} foto telah tercapai.`);
      return;
    }
    const optimizedUrl = await compressImage(previewUrl, 1600, 0.82);
    setMediaFile(file);
    setPreviewMedia({
      url: optimizedUrl,
      type: 'photo',
    });
    setIsUploadOpen(true);
  };

  // Handle file select from Native Camera or Gallery
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video');

    if (isVideo) {
      if (uploadQuota.videos >= MAX_VIDEOS_PER_GUEST) {
        alert(`Batas maksimal ${MAX_VIDEOS_PER_GUEST} video per tamu telah tercapai.`);
        e.target.value = '';
        return;
      }

      // Validasi durasi video maksimal 30 detik
      const duration = await getVideoDuration(file);
      if (duration > MAX_VIDEO_DURATION_SECONDS) {
        alert(`Durasi video Anda adalah ${duration} detik.\n\nBatas maksimal durasi video ucapan adalah ${MAX_VIDEO_DURATION_SECONDS} detik (seperti WhatsApp Story / Status) agar proses upload cepat dan hemat kuota.`);
        e.target.value = '';
        return;
      }
    } else {
      if (uploadQuota.photos >= MAX_PHOTOS_PER_GUEST) {
        alert(`Batas maksimal ${MAX_PHOTOS_PER_GUEST} foto per tamu telah tercapai.`);
        e.target.value = '';
        return;
      }
    }

    setMediaFile(file);
    const reader = new FileReader();
    reader.onload = async (event) => {
      let finalUrl = event.target.result;
      if (!isVideo) {
        finalUrl = await compressImage(finalUrl, 1600, 0.82);
      }
      setPreviewMedia({
        url: finalUrl,
        type: isVideo ? 'video' : 'photo',
      });
      setIsUploadOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset input value so same file can be re-selected if needed
    e.target.value = '';
  };

  // Submit Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!previewMedia) {
      alert('Pilih atau jepret foto/video terlebih dahulu!');
      return;
    }

    setIsUploading(true);

    try {
      const currentGuest = checkedInGuestName || localStorage.getItem('hema_current_guest_name') || '';
      const newMoment = {
        caption: caption || `Momen Bahagia Bersama ${weddingSettings.coupleTitle || 'Mempelai'}`,
        uploaderName: uploaderName.trim() || currentGuest || 'Tamu Undangan',
        uploaderRole: 'guest',
        type: previewMedia.type,
        category: category,
        previewUrl: previewMedia.url,
        likes: 1,
        timestamp: new Date().toISOString(),
        synced: false,
      };

      const savedMoment = await saveMoment(newMoment);
      await loadMoments();

      // Perbarui kuota upload tamu di localStorage
      const updatedQuota = {
        photos: previewMedia.type === 'photo' ? (uploadQuota.photos || 0) + 1 : (uploadQuota.photos || 0),
        videos: previewMedia.type === 'video' ? (uploadQuota.videos || 0) + 1 : (uploadQuota.videos || 0),
      };
      setUploadQuota(updatedQuota);
      localStorage.setItem('hema_guest_upload_quota', JSON.stringify(updatedQuota));

      setIsUploadOpen(false);
      setPreviewMedia(null);
      setMediaFile(null);
      setCaption('');
      setUploaderName(currentGuest || '');

      // Kirim langsung foto / video ke Google Drive & Sheets jika online
      if (isOnline) {
        try {
          await syncMediaToGoogle(savedMoment);
          await markMomentSynced(savedMoment.id);
          await loadMoments(); // Refresh agar label status langsung bersih
        } catch (err) {
          console.warn('Direct media sync failed, will retry via queue:', err);
        }
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Gagal mengupload momen.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Hidden inputs for native camera & gallery picker */}
      <input
        type="file"
        ref={nativePhotoInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={nativeVideoInputRef}
        accept="video/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*,video/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* In-App Live Camera Viewfinder Modal */}
      <InAppCameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onPhotoCaptured={handleInAppPhotoCaptured}
      />

      {/* Header & Main Camera Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy-950">
            Live Momen & Galeri
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Jepret foto langsung di aplikasi, kamera HP, atau unggah kenangan selfie Anda.
          </p>
        </div>

        {/* Quick Camera Buttons & Quota Badge */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-600">
            <span>Sisa Kuota:</span>
            <span className="font-bold text-navy-950">{MAX_PHOTOS_PER_GUEST - (uploadQuota.photos || 0)} Foto</span>
            <span>•</span>
            <span className="font-bold text-navy-950">{MAX_VIDEOS_PER_GUEST - (uploadQuota.videos || 0)} Video (Maks 30s)</span>
          </div>

          {/* Button 1: In-App Camera */}
          <button
            onClick={handleOpenInAppCamera}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-navy-950 hover:bg-navy-900 text-white font-bold text-xs rounded-xl shadow-md transition active:scale-95"
            title="Buka Kamera di Aplikasi"
          >
            <Camera className="w-4 h-4 text-gold-400" />
            <span>Kamera Web</span>
          </button>

          {/* Button 2: Native Phone Camera / Upload Modal */}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-navy-950 border border-slate-300 font-bold text-xs rounded-xl shadow-sm transition active:scale-95"
          >
            <Smartphone className="w-4 h-4 text-navy-800" />
            <span>Kamera HP / Upload</span>
          </button>
        </div>
      </div>

      {/* Tabs: Semua vs Fotografer vs Tamu */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'all'
              ? 'bg-navy-950 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Semua Momen ({moments.length})
        </button>
        <button
          onClick={() => setActiveTab('photographer')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'photographer'
              ? 'bg-navy-950 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-gold-500" />
          <span>Fotografer Resmi ({moments.filter((m) => m.uploaderRole === 'photographer').length})</span>
        </button>
        <button
          onClick={() => setActiveTab('guest')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
            activeTab === 'guest'
              ? 'bg-navy-950 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Momen Tamu ({moments.filter((m) => m.uploaderRole === 'guest').length})
        </button>
      </div>

      {/* Category Chips Filter */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-navy-900 text-white font-semibold shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
        {filteredMoments.map((item) => (
          <div
            key={item.id}
            onClick={() => setLightboxMoment(item)}
            className="group relative rounded-2xl overflow-hidden bg-white border border-slate-200/90 cursor-pointer shadow-sm hover:shadow-md hover:border-navy-300 transition duration-300 aspect-[4/5] flex flex-col justify-end"
          >
            {/* Image / Video preview */}
            <img
              src={item.previewUrl}
              alt={item.caption}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition duration-500"
              loading="lazy"
            />

            {/* Gradient Overlay for high text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/25 to-transparent" />

            {/* Top Badges */}
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
              {item.uploaderRole === 'photographer' ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-navy-950/90 border border-gold-400/50 text-gold-300 text-[10px] font-semibold backdrop-blur-sm">
                  <Sparkles className="w-3 h-3 text-gold-400" />
                  <span>Official</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-navy-950/85 border border-white/20 text-white text-[10px] font-medium backdrop-blur-sm">
                  Tamu
                </span>
              )}

              {/* Indikator hanya jika perangkat benar-benar offline dan belum tersinkron */}
              {!isOnline && !item.synced && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/90 text-white text-[10px] font-semibold flex items-center gap-1 shadow-sm">
                  <Clock className="w-2.5 h-2.5" />
                  <span>Menunggu Sinyal</span>
                </span>
              )}
            </div>

            {/* Bottom Content Info */}
            <div className="relative p-3 space-y-1 z-10">
              <p className="text-[11px] font-medium text-white line-clamp-2 leading-tight">
                {item.caption}
              </p>
              
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-300 font-medium truncate max-w-[100px]">
                  {item.uploaderName}
                </span>

                {/* Like Button */}
                <button
                  onClick={(e) => handleLike(item.id, e)}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-white transition"
                >
                  <Heart className="w-3 h-3 text-rose-400 fill-rose-400" />
                  <span className="text-[10px] font-mono font-bold text-white">
                    {item.likes || 0}
                  </span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredMoments.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <ImageIcon className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-navy-950">Belum ada momen di kategori ini</p>
          <p className="text-xs text-slate-500 mt-1">Jadilah orang pertama yang mengabadikan momen!</p>
        </div>
      )}

      {/* MODAL UPLOAD / PILIH KAMERA MOMEN TAMU */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-navy-950/70 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-navy-900" />
                <h3 className="font-serif font-bold text-lg text-navy-950">Bagikan Momen</h3>
              </div>
              <button
                onClick={() => {
                  setIsUploadOpen(false);
                  setPreviewMedia(null);
                  setMediaFile(null);
                }}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Selector or Preview */}
            {previewMedia ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-navy-200 bg-slate-900 shadow-inner">
                {previewMedia.type === 'video' ? (
                  <video
                    src={previewMedia.url}
                    controls
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <img
                    src={previewMedia.url}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setPreviewMedia(null);
                    setMediaFile(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition"
                  title="Ganti Foto/Video"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-700">Pilih Cara Mengambil Foto atau Video:</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: In-App Web Camera */}
                  <button
                    type="button"
                    onClick={handleOpenInAppCamera}
                    className="p-3.5 rounded-2xl bg-navy-50 hover:bg-navy-100/80 border border-navy-200 flex items-center gap-3 text-left transition group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-navy-950 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <Camera className="w-5 h-5 text-gold-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-navy-950">Kamera di Aplikasi</p>
                      <p className="text-[10px] text-slate-500">Live viewfinder di web</p>
                    </div>
                  </button>

                  {/* Option 2: Native Phone Camera (Photo) */}
                  <button
                    type="button"
                    onClick={handleTriggerNativePhoto}
                    className="p-3.5 rounded-2xl bg-navy-50 hover:bg-navy-100/80 border border-navy-200 flex items-center gap-3 text-left transition group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-navy-900 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <Smartphone className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-navy-950">Kamera Bawaan HP</p>
                      <p className="text-[10px] text-slate-500">Buka kamera foto HP</p>
                    </div>
                  </button>

                  {/* Option 3: Native Phone Camera (Video) */}
                  <button
                    type="button"
                    onClick={handleTriggerNativeVideo}
                    className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-3 text-left transition group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-navy-800 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <Video className="w-5 h-5 text-amber-300" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-navy-950">Rekam Video HP</p>
                      <p className="text-[10px] text-slate-500">Maks. durasi 30 detik</p>
                    </div>
                  </button>

                  {/* Option 4: Gallery / File Picker */}
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center gap-3 text-left transition group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <FolderOpen className="w-5 h-5 text-gold-300" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-navy-950">Galeri / Album</p>
                      <p className="text-[10px] text-slate-500">Pilih file yang ada</p>
                    </div>
                  </button>
                </div>

                {/* Quota & Video Duration Limit Notice */}
                <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-navy-950">Batas Kuota Pengunggahan Tamu:</span>
                    <span className="font-mono text-[11px] font-bold text-navy-900">
                      {uploadQuota.photos || 0}/{MAX_PHOTOS_PER_GUEST} Foto • {uploadQuota.videos || 0}/{MAX_VIDEOS_PER_GUEST} Video
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    • Maksimal <strong>30 foto</strong> per tamu.<br />
                    • Maksimal <strong>2 video</strong> dengan durasi <strong>maksimal 30 detik</strong> (seperti WhatsApp Story / Status) agar proses kirim cepat dan lancar.
                  </p>
                </div>
              </div>
            )}

            {/* Form details (only show when previewMedia is ready) */}
            {previewMedia && (
              <form onSubmit={handleUploadSubmit} className="space-y-4 pt-1">
                {/* Uploader Name */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      {checkedInGuestName ? 'Nama Pengunggah' : 'Nama Anda (Opsional)'}
                    </label>
                    {checkedInGuestName ? (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        ✓ Terisi Otomatis (Tamu Hadir)
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        Belum scan / konfirmasi hadir
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={uploaderName}
                    onChange={(e) => setUploaderName(e.target.value)}
                    placeholder={checkedInGuestName || "Contoh: Rian & Nisa (Kosongkan untuk Tamu Undangan)"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-navy-600 focus:bg-white transition"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Kategori Momen
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-navy-600 focus:bg-white transition"
                  >
                    <option value="Selfie Tamu">Selfie Tamu</option>
                    <option value="Akad Nikah">Akad Nikah</option>
                    <option value="Resepsi">Resepsi</option>
                    <option value="Dekorasi & Venue">Dekorasi & Venue</option>
                    <option value="Detail Momen">Detail Momen</option>
                  </select>
                </div>

                {/* Caption */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Caption / Pesan Singkat
                  </label>
                  <textarea
                    rows={2}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Tuliskan cerita singkat momen ini..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-navy-600 focus:bg-white transition"
                  />
                </div>

                {/* Offline note */}
                {!isOnline && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Anda sedang offline. Foto akan disimpan di HP dan terunggah otomatis saat sinyal kembali!
                    </span>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full py-3 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 hover:brightness-110 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? 'Menyimpan...' : 'Bagikan ke Galeri Bersama'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {lightboxMoment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/95 backdrop-blur-xl p-2 sm:p-6 animate-fade-in">
          <button
            onClick={() => setLightboxMoment(null)}
            className="absolute top-4 right-4 z-50 p-2.5 rounded-full bg-navy-900/80 text-white hover:bg-navy-800 border border-white/20 transition"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <img
              src={lightboxMoment.previewUrl}
              alt={lightboxMoment.caption}
              className="max-h-[75vh] w-auto object-contain rounded-2xl shadow-2xl border border-navy-700"
            />

            <div className="w-full max-w-xl mt-4 bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-4 shadow-xl">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-navy-950">
                  {lightboxMoment.caption}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="text-navy-800 font-bold">{lightboxMoment.uploaderName}</span>
                  <span>•</span>
                  <span>{new Date(lightboxMoment.timestamp).toLocaleTimeString('id-ID')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={lightboxMoment.previewUrl}
                  download="Wedding_Moment.jpg"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-navy-950 hover:bg-navy-900 text-white transition shadow-sm"
                  title="Unduh Foto Resolusi Asli"
                >
                  <Download className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
