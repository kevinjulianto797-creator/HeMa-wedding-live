// Guest List & Barcode Management Service
import { getAppState, setAppState } from './db';

const GUEST_STORAGE_KEY = 'hema_guest_list_master';

// Generate unique, clean QR Token (e.g., HEMA-VIP-8A2F)
export function generateGuestToken(name = '', category = 'Tamu') {
  const catPrefix = category.toUpperCase().includes('VIP') 
    ? 'VIP' 
    : category.toUpperCase().includes('KELUARGA') 
      ? 'FAM' 
      : 'GST';
  const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestamp = Date.now().toString(36).slice(-3).toUpperCase();
  return `HEMA-${catPrefix}-${randomHex}${timestamp}`;
}

// Get all guests from Local/IndexedDB
export async function getAllGuests() {
  try {
    const list = await getAppState(GUEST_STORAGE_KEY);
    if (Array.isArray(list)) {
      return list;
    }
    // Fallback localStorage
    const local = localStorage.getItem(GUEST_STORAGE_KEY);
    return local ? JSON.parse(local) : [];
  } catch (err) {
    console.error('Error fetching guests:', err);
    return [];
  }
}

// Save entire guest list
export async function saveAllGuests(guests) {
  try {
    await setAppState(GUEST_STORAGE_KEY, guests);
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guests));
    window.dispatchEvent(new CustomEvent('wedding-guests-updated', { detail: guests }));
    return guests;
  } catch (err) {
    console.error('Error saving guests:', err);
    return [];
  }
}

// Add a single guest
export async function addGuest({ name, category, pax, table, notes }) {
  const current = await getAllGuests();
  const newGuest = {
    id: `GUEST-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
    name: name.trim(),
    category: category || 'Tamu Undangan',
    pax: parseInt(pax, 10) || 1,
    table: table ? table.trim() : 'Meja Reguler',
    notes: notes ? notes.trim() : '',
    checkedIn: false,
    checkedInAt: null,
    checkedInBy: null,
    qrToken: generateGuestToken(name, category),
  };

  const updated = [newGuest, ...current];
  await saveAllGuests(updated);
  return newGuest;
}

// Update an existing guest
export async function updateGuest(id, fields) {
  const current = await getAllGuests();
  const updated = current.map((g) => (g.id === id ? { ...g, ...fields } : g));
  await saveAllGuests(updated);
  return updated;
}

// Delete a guest
export async function deleteGuest(id) {
  const current = await getAllGuests();
  const updated = current.filter((g) => g.id !== id);
  await saveAllGuests(updated);
  return updated;
}

// Bulk Import from CSV / Plain Text
// Format expected per line: Nama, Kategori, Pax, Meja
// Or simple list of names: Satu nama per baris
export async function importGuestsFromText(rawText) {
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const current = await getAllGuests();
  const newGuests = [];

  for (const line of lines) {
    // Check if line contains comma (CSV format)
    const parts = line.split(',').map((p) => p.trim());
    const name = parts[0];
    if (!name) continue;

    const category = parts[1] || 'Tamu Undangan';
    const pax = parseInt(parts[2], 10) || 1;
    const table = parts[3] || 'Meja Reguler';

    newGuests.push({
      id: `GUEST-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}_${Math.random().toString(36).slice(2, 5)}`,
      name,
      category,
      pax,
      table,
      notes: '',
      checkedIn: false,
      checkedInAt: null,
      checkedInBy: null,
      qrToken: generateGuestToken(name, category),
    });
  }

  const merged = [...newGuests, ...current];
  await saveAllGuests(merged);
  return newGuests;
}
