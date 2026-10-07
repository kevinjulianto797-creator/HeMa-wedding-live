import * as XLSX from 'xlsx';
import { getAppState, setAppState } from './db';
import { 
  syncGuestToGoogle, 
  syncAllGuestsToGoogle,
  deleteGuestFromGoogle,
  clearAllGuestsFromGoogle 
} from './googleSync';

const GUEST_STORAGE_KEY = 'hema_guest_list_master';

// Generate unique, clean QR Token (e.g., HEMA-VIP-8A2F)
export function generateGuestToken(name = '', category = 'Tamu') {
  const catUpper = (category || '').toUpperCase();
  const catPrefix = catUpper.includes('VIP') 
    ? 'VIP' 
    : catUpper.includes('KELUARGA') 
      ? 'FAM' 
      : 'GST';
  const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
  const timestamp = Date.now().toString(36).slice(-3).toUpperCase();
  return `HEMA-${catPrefix}-${randomHex}${timestamp}`;
}

// Get all guests from Local/IndexedDB
export async function getAllGuests() {
  try {
    let list = await getAppState(GUEST_STORAGE_KEY);
    if (!Array.isArray(list)) {
      const local = localStorage.getItem(GUEST_STORAGE_KEY);
      list = local ? JSON.parse(local) : [];
    }

    // Pembersihan otomatis: Hapus data dummy bawaan (Ahmad Fauzi & Ratna Dewi) jika masih tersimpan di memori lokal HP/laptop
    const cleaned = (list || []).filter((g) => {
      if (!g || !g.name) return false;
      const isDummyId = g.id === 'GUEST-001' || g.id === 'GUEST-002' || g.id === 'GUEST-003' || g.id === 'GUEST-004';
      const isDummyName = g.name.includes('Ahmad Fauzi') || g.name.includes('Ratna Dewi') || g.name.includes('Dimas Wicaksono') || g.name.includes('Sarah Amanda');
      return !isDummyId && !isDummyName;
    });

    if (cleaned.length !== (list || []).length) {
      await saveAllGuests(cleaned);
    }

    return cleaned;
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

  // Otomatis sinkronkan tamu baru ke sheet Daftar_Undangan di Google Spreadsheet
  try {
    await syncGuestToGoogle(newGuest);
  } catch (err) {
    console.warn('Sync guest to Google failed:', err);
  }

  return newGuest;
}

// Delete a guest (Lokal + Google Spreadsheet)
export async function deleteGuest(id) {
  const current = await getAllGuests();
  const target = current.find((g) => g.id === id);
  const updated = current.filter((g) => g.id !== id);
  await saveAllGuests(updated);

  if (target) {
    try {
      await deleteGuestFromGoogle(target.id, target.name);
    } catch (err) {
      console.warn('Gagal menghapus tamu dari Google Spreadsheet:', err);
    }
  }

  return updated;
}

// Clear all guests (Lokal + Google Spreadsheet)
export async function clearAllGuests() {
  await saveAllGuests([]);
  try {
    await clearAllGuestsFromGoogle();
  } catch (err) {
    console.warn('Gagal mengosongkan tamu di Google Spreadsheet:', err);
  }
  return [];
}

// Parse and Import directly from Excel File (.xlsx, .xls, .csv)
export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to json array of objects
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          resolve([]);
          return;
        }

        // Smart column mapping (case-insensitive)
        const guests = rawJson.map((row, idx) => {
          let name = '';
          let category = 'Tamu Undangan';
          let pax = 1;
          let table = 'Meja Reguler';

          for (const key of Object.keys(row)) {
            const k = key.trim().toLowerCase();
            const val = row[key];

            if (k.includes('nama') || k.includes('name') || k.includes('tamu')) {
              name = String(val).trim();
            } else if (k.includes('kategori') || k.includes('category') || k.includes('status') || k.includes('hubungan')) {
              category = String(val).trim() || 'Tamu Undangan';
            } else if (k.includes('pax') || k.includes('jumlah') || k.includes('orang') || k.includes('kursi')) {
              pax = parseInt(val, 10) || 1;
            } else if (k.includes('meja') || k.includes('table') || k.includes('no')) {
              table = String(val).trim() || 'Meja Reguler';
            }
          }

          // If headers weren't named, fallback to row object values
          if (!name) {
            const values = Object.values(row).map(v => String(v).trim()).filter(v => v.length > 0);
            if (values.length > 0) name = values[0];
            if (values.length > 1) category = values[1];
            if (values.length > 2) pax = parseInt(values[2], 10) || 1;
            if (values.length > 3) table = values[3];
          }

          return {
            id: `GUEST-${Date.now().toString(36).toUpperCase()}-${idx}_${Math.random().toString(36).slice(2, 5)}`,
            name: name || `Tamu Undangan #${idx + 1}`,
            category,
            pax,
            table,
            checkedIn: false,
            checkedInAt: null,
            checkedInBy: null,
            qrToken: generateGuestToken(name, category),
          };
        }).filter(g => g.name && g.name.length > 0);

        resolve(guests);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Import Excel File directly and merge with current guests
export async function importGuestsFromExcelFile(file) {
  const parsedGuests = await parseExcelFile(file);
  const current = await getAllGuests();
  const merged = [...parsedGuests, ...current];
  await saveAllGuests(merged);

  // Otomatis sinkronkan seluruh tamu hasil impor ke Google Spreadsheet
  try {
    await syncAllGuestsToGoogle(parsedGuests);
  } catch (err) {
    console.warn('Sync imported guests to Google failed:', err);
  }

  return parsedGuests;
}

// Download Excel Template for Guests (.xlsx)
export function downloadGuestTemplateExcel() {
  const templateData = [
    { 'Nama Tamu': 'Bpk. Bambang & Istri', 'Kategori': 'VIP / Kehormatan', 'Pax': 2, 'Meja': 'Meja VIP 01' },
    { 'Nama Tamu': 'dr. Sarah Amanda', 'Kategori': 'Sahabat / Bridesmaid', 'Pax': 2, 'Meja': 'Meja 04' },
    { 'Nama Tamu': 'Rian Pratama & Partner', 'Kategori': 'Teman Kerja / Rekan Kantor', 'Pax': 2, 'Meja': 'Meja 07' },
    { 'Nama Tamu': 'Keluarga Bpk. H. Ridwan', 'Kategori': 'Keluarga Mempelai Pria', 'Pax': 4, 'Meja': 'Meja Keluarga 02' },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daftar_Tamu');
  XLSX.writeFile(wb, 'Template_Daftar_Tamu_HeMa_Wedding.xlsx');
}

// Merge and reconcile cloud guests from Google Spreadsheet (Source of Truth)
export async function mergeCloudGuests(cloudGuests) {
  if (!Array.isArray(cloudGuests)) return 0;
  const current = await getAllGuests();

  // Jika Google Spreadsheet kosong dan di aplikasi lokal masih ada tamu:
  // Berarti pengguna telah menghapus seluruh daftar tamu di Google Spreadsheet!
  if (cloudGuests.length === 0) {
    if (current.length > 0) {
      await saveAllGuests([]);
      return current.length;
    }
    return 0;
  }

  const localMap = new Map();
  for (const g of current) {
    const key = g.id || g.name;
    localMap.set(key, g);
    if (g.name) localMap.set(g.name.trim().toLowerCase(), g);
  }

  // Bangun daftar tamu berdasarkan data resmi dari Google Spreadsheet
  const resultList = [];
  let isDifferent = false;

  for (const cg of cloudGuests) {
    if (!cg || !cg.name) continue;
    const existing = localMap.get(cg.id) || localMap.get(cg.name) || localMap.get(cg.name.trim().toLowerCase());

    if (!existing) {
      resultList.push({
        id: cg.id || `GST_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        name: cg.name,
        category: cg.category || 'Tamu Undangan',
        pax: cg.pax || 1,
        table: cg.table || 'Meja Reguler',
        qrToken: cg.qrToken || generateGuestToken(cg.name, cg.category),
        checkedIn: cg.checkedIn || false,
        checkedInAt: cg.checkedInAt || null,
      });
      isDifferent = true;
    } else {
      const isCheckedIn = cg.checkedIn !== undefined ? cg.checkedIn : existing.checkedIn;
      const checkinTime = cg.checkedInAt || existing.checkedInAt || null;

      if (
        existing.name !== cg.name ||
        existing.category !== (cg.category || existing.category) ||
        existing.pax !== (cg.pax || existing.pax) ||
        existing.table !== (cg.table || existing.table) ||
        existing.checkedIn !== isCheckedIn
      ) {
        isDifferent = true;
      }

      resultList.push({
        ...existing,
        name: cg.name,
        category: cg.category || existing.category,
        pax: cg.pax || existing.pax,
        table: cg.table || existing.table,
        qrToken: cg.qrToken || existing.qrToken,
        checkedIn: isCheckedIn,
        checkedInAt: checkinTime,
      });
    }
  }

  // Jika ada tamu di lokal yang tidak lagi ada di Google Spreadsheet,
  // berarti tamu tersebut telah dihapus oleh pengguna dari spreadsheet!
  if (current.length !== resultList.length) {
    isDifferent = true;
  }

  if (isDifferent) {
    await saveAllGuests(resultList);
    return resultList.length;
  }

  return 0;
}

