// Wedding Settings Service

const SETTINGS_STORAGE_KEY = 'hema_wedding_settings';

export const DEFAULT_WEDDING_SETTINGS = {
  groomName: 'Cecep',
  brideName: 'Memey',
  coupleTitle: 'Cecep & Memey',
  initials: 'CM',
  weddingDateFormatted: 'Minggu, 18 Oktober 2026',
  weddingDateRaw: '2026-10-18',
  venueName: 'Grand Ballroom Hotel Mulia',
  venueAddress: 'Jl. Asia Afrika Senayan, Gelora, Jakarta Pusat',
  akadTime: '08:00 - 10:00 WIB',
  receptionTime: '11:00 - 14:00 WIB',
  welcomeMessage: 'Selamat datang di Buku Tamu Digital & Live Momen Pernikahan kami. Kehadiran dan doa restu Anda adalah anugerah terindah bagi kami.',
  adminPin: '1234',
  photographerPin: '8888',
  enableGuestUpload: true,
  enableVoiceNote: true,
};

export function getWeddingSettings() {
  try {
    let settings = { ...DEFAULT_WEDDING_SETTINGS };
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      settings = { ...settings, ...JSON.parse(saved) };
    }

    // Auto-detect & sync if opened with URL parameters (e.g. ?couple=Cecep+%26+Memey or ?mempelai=...)
    if (typeof window !== 'undefined' && window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      const coupleParam = urlParams.get('couple') || urlParams.get('mempelai');
      if (coupleParam && coupleParam.trim() && settings.coupleTitle !== coupleParam.trim()) {
        const parts = coupleParam.split('&').map(s => s.trim());
        const groom = parts[0] || settings.groomName;
        const bride = parts[1] || settings.brideName;
        settings = {
          ...settings,
          groomName: groom,
          brideName: bride,
          coupleTitle: coupleParam.trim(),
          initials: `${groom[0] || 'C'}${bride[0] || 'M'}`.toUpperCase(),
        };
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      }
    }

    return settings;
  } catch (err) {
    console.error('Error reading wedding settings:', err);
  }
  return DEFAULT_WEDDING_SETTINGS;
}

export function saveWeddingSettings(newSettings) {
  try {
    const groom = newSettings.groomName || 'Cecep';
    const bride = newSettings.brideName || 'Memey';
    const updated = {
      ...getWeddingSettings(),
      ...newSettings,
      groomName: groom,
      brideName: bride,
      coupleTitle: `${groom} & ${bride}`,
      initials: newSettings.initials || `${groom[0] || 'C'}${bride[0] || 'M'}`.toUpperCase(),
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));

    // Dynamic browser title & meta tags sync
    if (typeof document !== 'undefined') {
      document.title = `The Wedding of ${updated.coupleTitle} | Live Moments`;
      const metaOgTitle = document.querySelector('meta[property="og:title"]');
      if (metaOgTitle) metaOgTitle.setAttribute('content', `The Wedding of ${updated.coupleTitle} | Live Moments`);
      const metaTwTitle = document.querySelector('meta[name="twitter:title"]');
      if (metaTwTitle) metaTwTitle.setAttribute('content', `The Wedding of ${updated.coupleTitle} | Live Moments`);
    }

    window.dispatchEvent(new CustomEvent('wedding-settings-updated', { detail: updated }));
    return updated;
  } catch (err) {
    console.error('Error saving wedding settings:', err);
    return null;
  }
}

export function getShareableWeddingUrl(settings) {
  const current = settings || getWeddingSettings();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://wedding-live.hemanet.my.id';
  return `${origin}/?couple=${encodeURIComponent(current.coupleTitle || 'Cecep & Memey')}`;
}

export function getWhatsAppShareText(settings) {
  const current = settings || getWeddingSettings();
  const link = getShareableWeddingUrl(current);
  return `💍 The Wedding of ${current.coupleTitle || 'Cecep & Memey'} 💍\n\n` +
    `Buku Tamu Digital & Live Momen Pernikahan:\n` +
    `✨ Check-in Barcode Tamu\n` +
    `💌 Kirim Doa & Rekam Voice Note\n` +
    `📸 Bagikan & Tonton Galeri Foto Realtime\n\n` +
    `Silakan buka tautan di bawah ini:\n${link}`;
}
