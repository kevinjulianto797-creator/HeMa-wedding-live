// Cloudflare Settings Service (R2 Storage & Pages)

const CF_SETTINGS_KEY = 'hema_cloudflare_settings';

export const DEFAULT_CF_SETTINGS = {
  r2BucketName: '',
  r2PublicDomain: '', // e.g. https://pub-xxxx.r2.dev or https://media.yourdomain.com
  r2WorkerUploadUrl: '', // Cloudflare Worker endpoint for direct presigned uploads
  enableCloudflareR2: false,
};

export function getCloudflareSettings() {
  try {
    const raw = localStorage.getItem(CF_SETTINGS_KEY);
    return raw ? { ...DEFAULT_CF_SETTINGS, ...JSON.parse(raw) } : DEFAULT_CF_SETTINGS;
  } catch {
    return DEFAULT_CF_SETTINGS;
  }
}

export function saveCloudflareSettings(settings) {
  localStorage.setItem(CF_SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('cloudflare-settings-updated', { detail: settings }));
}
