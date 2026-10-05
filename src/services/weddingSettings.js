// Wedding Settings Service

const SETTINGS_STORAGE_KEY = 'hema_wedding_settings';

export const DEFAULT_WEDDING_SETTINGS = {
  groomName: 'Hendra',
  brideName: 'Maya',
  coupleTitle: 'Hendra & Maya',
  initials: 'HM',
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
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_WEDDING_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.error('Error reading wedding settings:', err);
  }
  return DEFAULT_WEDDING_SETTINGS;
}

export function saveWeddingSettings(newSettings) {
  try {
    const updated = {
      ...getWeddingSettings(),
      ...newSettings,
      coupleTitle: `${newSettings.groomName || 'Hendra'} & ${newSettings.brideName || 'Maya'}`,
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('wedding-settings-updated', { detail: updated }));
    return updated;
  } catch (err) {
    console.error('Error saving wedding settings:', err);
    return null;
  }
}
