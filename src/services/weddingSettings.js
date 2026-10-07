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

    // Auto-detect & sync if opened with URL parameters, clean slug path, or hash
    if (typeof window !== 'undefined') {
      let hasChanges = false;
      const urlParams = new URLSearchParams(window.location.search || '');
      let coupleParam = urlParams.get('couple') || urlParams.get('mempelai');
      let venueParam = urlParams.get('venue') || urlParams.get('lokasi');
      let dateParam = urlParams.get('date') || urlParams.get('tgl');
      let akadParam = urlParams.get('akad');
      let recParam = urlParams.get('rec') || urlParams.get('resepsi');
      let initParam = urlParams.get('init');
      let sParam = urlParams.get('s');
      let wsParam = urlParams.get('ws') || urlParams.get('webhook');

      // 1. Cek parameter dari hash (contoh: #/Hendra&Maya?s=AKfy... atau #Hendra&Maya)
      if (window.location.hash) {
        const hashContent = window.location.hash.replace(/^#\/?/, '');
        const hashParts = hashContent.split('?');
        const hashPath = hashParts[0] ? decodeURIComponent(hashParts[0]).trim() : '';
        const hashQuery = hashParts[1] || '';

        if (hashQuery) {
          const hashParams = new URLSearchParams(hashQuery);
          if (!sParam) sParam = hashParams.get('s');
          if (!wsParam) wsParam = hashParams.get('ws') || hashParams.get('webhook');
          if (!coupleParam) coupleParam = hashParams.get('couple') || hashParams.get('mempelai');
        }

        const reservedPages = ['home', 'checkin', 'moments', 'wishes', 'admin', 'photographer', 'live'];
        if (hashPath && !reservedPages.includes(hashPath.toLowerCase())) {
          if (!coupleParam && (hashPath.includes('&') || hashPath.includes('-'))) {
            coupleParam = hashPath;
          }
        }
      }

      // 2. Cek parameter dari pathname (contoh: /Hendra&Maya)
      if (window.location.pathname && window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
        const cleanPath = decodeURIComponent(window.location.pathname.replace(/^\//, '')).trim();
        const reservedPages = ['home', 'checkin', 'moments', 'wishes', 'admin', 'photographer', 'live'];
        if (cleanPath && !reservedPages.includes(cleanPath.toLowerCase())) {
          if (!coupleParam && (cleanPath.includes('&') || cleanPath.includes('-'))) {
            coupleParam = cleanPath;
          }
        }
      }

      // Parse nama pengantin
      if (coupleParam && coupleParam.trim()) {
        const separator = coupleParam.includes('&') ? '&' : '-';
        const parts = coupleParam.split(separator).map(s => s.trim());
        const groom = parts[0] || settings.groomName;
        const bride = parts[1] || settings.brideName;
        if (groom && bride) {
          settings.groomName = groom;
          settings.brideName = bride;
          settings.coupleTitle = `${groom} & ${bride}`;
          settings.initials = initParam || `${groom[0] || 'C'}${bride[0] || 'M'}`.toUpperCase();
          hasChanges = true;
        }
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

      // Auto-sync Google Apps Script Webhook URL ke HP tamu
      let targetWebhookUrl = '';
      if (sParam && sParam.trim()) {
        const cleanS = sParam.trim();
        targetWebhookUrl = cleanS.startsWith('http') 
          ? cleanS 
          : `https://script.google.com/macros/s/${cleanS}/exec`;
      } else if (wsParam && wsParam.trim().startsWith('http')) {
        targetWebhookUrl = wsParam.trim();
      }

      if (targetWebhookUrl) {
        try {
          const rawGoogle = localStorage.getItem('hema_google_settings');
          const currentGoogle = rawGoogle ? JSON.parse(rawGoogle) : {};
          if (currentGoogle.sheetsWebhookUrl !== targetWebhookUrl) {
            localStorage.setItem('hema_google_settings', JSON.stringify({
              ...currentGoogle,
              sheetsWebhookUrl: targetWebhookUrl,
            }));
            window.dispatchEvent(new CustomEvent('wedding-url-webhook-detected'));
          }
        } catch (e) {
          console.warn('Error saving Google webhook from URL:', e);
        }
      }

      if (hasChanges) {
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

// Tautan pendek dan elegan: https://wedding-live.hemanet.my.id/#/Groom&Bride?s=ScriptId
export function getShareableWeddingUrl(settings) {
  const current = settings || getWeddingSettings();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://wedding-live.hemanet.my.id';
  const groom = (current.groomName || 'Cecep').trim();
  const bride = (current.brideName || 'Memey').trim();
  const coupleSlug = `${groom}&${bride}`;

  // Ambil scriptId singkat dari sheetsWebhookUrl (misal: AKfycb...)
  let scriptId = '';
  try {
    const rawGoogle = localStorage.getItem('hema_google_settings');
    if (rawGoogle) {
      const parsedGoogle = JSON.parse(rawGoogle);
      const url = parsedGoogle.sheetsWebhookUrl || '';
      const match = url.match(/\/s\/([a-zA-Z0-9_-]+)\/exec/);
      if (match && match[1]) {
        scriptId = match[1];
      } else if (url.startsWith('http')) {
        scriptId = url;
      }
    }
  } catch (e) {
    console.warn(e);
  }

  if (scriptId) {
    const paramKey = scriptId.startsWith('http') ? 'ws' : 's';
    return `${origin}/#/${encodeURIComponent(coupleSlug)}?${paramKey}=${encodeURIComponent(scriptId)}`;
  }
  return `${origin}/#/${encodeURIComponent(coupleSlug)}`;
}

// Tautan cantik murni: https://wedding-live.hemanet.my.id/#/Groom&Bride
export function getCleanCoupleUrl(settings) {
  const current = settings || getWeddingSettings();
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://wedding-live.hemanet.my.id';
  const groom = (current.groomName || 'Cecep').trim();
  const bride = (current.brideName || 'Memey').trim();
  return `${origin}/#/${encodeURIComponent(groom)}&${encodeURIComponent(bride)}`;
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
