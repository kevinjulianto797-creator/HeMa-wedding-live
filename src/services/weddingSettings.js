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

    // Auto-detect & sync if opened with URL parameters (e.g. ?couple=...&venue=...&ws=...)
    if (typeof window !== 'undefined' && window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      const coupleParam = urlParams.get('couple') || urlParams.get('mempelai');
      const venueParam = urlParams.get('venue') || urlParams.get('lokasi');
      const dateParam = urlParams.get('date') || urlParams.get('tgl');
      const akadParam = urlParams.get('akad');
      const recParam = urlParams.get('rec') || urlParams.get('resepsi');
      const initParam = urlParams.get('init');
      const wsParam = urlParams.get('ws') || urlParams.get('webhook');

      let hasChanges = false;

      if (coupleParam && coupleParam.trim()) {
        const parts = coupleParam.split('&').map(s => s.trim());
        const groom = parts[0] || settings.groomName;
        const bride = parts[1] || settings.brideName;
        settings.groomName = groom;
        settings.brideName = bride;
        settings.coupleTitle = coupleParam.trim();
        settings.initials = initParam || `${groom[0] || 'C'}${bride[0] || 'M'}`.toUpperCase();
        hasChanges = true;
      }

      if (venueParam && venueParam.trim()) {
        settings.venueName = venueParam.trim();
        hasChanges = true;
      }

      if (dateParam && dateParam.trim()) {
        settings.weddingDateFormatted = dateParam.trim();
        hasChanges = true;
      }

      if (akadParam && akadParam.trim()) {
        settings.akadTime = akadParam.trim();
        hasChanges = true;
      }

      if (recParam && recParam.trim()) {
        settings.receptionTime = recParam.trim();
        hasChanges = true;
      }

      if (initParam && initParam.trim()) {
        settings.initials = initParam.trim().toUpperCase();
        hasChanges = true;
      }

      if (hasChanges) {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      }

      // Auto-sync Google Apps Script Webhook URL to guest's device
      if (wsParam && wsParam.trim().startsWith('http')) {
        try {
          const rawGoogle = localStorage.getItem('hema_google_settings');
          const currentGoogle = rawGoogle ? JSON.parse(rawGoogle) : {};
          if (currentGoogle.sheetsWebhookUrl !== wsParam.trim()) {
            localStorage.setItem('hema_google_settings', JSON.stringify({
              ...currentGoogle,
              sheetsWebhookUrl: wsParam.trim(),
            }));
          }
        } catch (e) {
          console.warn('Error saving Google webhook from URL:', e);
        }
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
  const params = new URLSearchParams();

  if (current.coupleTitle) params.set('couple', current.coupleTitle);
  if (current.venueName) params.set('venue', current.venueName);
  if (current.weddingDateFormatted) params.set('date', current.weddingDateFormatted);
  if (current.akadTime) params.set('akad', current.akadTime);
  if (current.receptionTime) params.set('rec', current.receptionTime);
  if (current.initials) params.set('init', current.initials);

  // Otomatis sertakan URL Webhook Google Apps Script agar HP tamu yang scan barcode langsung terhubung ke database yang sama
  try {
    const rawGoogle = localStorage.getItem('hema_google_settings');
    if (rawGoogle) {
      const parsedGoogle = JSON.parse(rawGoogle);
      if (parsedGoogle.sheetsWebhookUrl && parsedGoogle.sheetsWebhookUrl.startsWith('http')) {
        params.set('ws', parsedGoogle.sheetsWebhookUrl);
      }
    }
  } catch (e) {
    console.warn(e);
  }

  return `${origin}/?${params.toString()}`;
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
