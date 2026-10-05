// Initial Dummy Guests list with unique QR tokens
export const INITIAL_GUESTS = [
  {
    id: 'GUEST-001',
    name: 'Bpk. Ahmad Fauzi & Keluarga',
    category: 'VIP / Tamu Kehormatan',
    pax: 2,
    table: 'Meja VIP 01',
    checkedIn: false,
    checkedInAt: null,
    qrToken: 'HEMA-VIP-AF001'
  },
  {
    id: 'GUEST-002',
    name: 'Ibu Ratna Dewi, S.E.',
    category: 'Keluarga Mempelai Pria',
    pax: 3,
    table: 'Meja Keluarga 02',
    checkedIn: false,
    checkedInAt: null,
    qrToken: 'HEMA-FAM-RD002'
  },
  {
    id: 'GUEST-003',
    name: 'Dimas Wicaksono',
    category: 'Sahabat SMA / Groomsmen',
    pax: 1,
    table: 'Meja Sahabat 05',
    checkedIn: true,
    checkedInAt: '2026-10-05T09:45:00.000Z',
    qrToken: 'HEMA-FRN-DW003'
  },
  {
    id: 'GUEST-004',
    name: 'dr. Sarah Amanda',
    category: 'Sahabat Kuliah / Bridesmaid',
    pax: 2,
    table: 'Meja Bridesmaid 04',
    checkedIn: true,
    checkedInAt: '2026-10-05T10:15:00.000Z',
    qrToken: 'HEMA-BRD-SA004'
  },
  {
    id: 'GUEST-005',
    name: 'Rian Pratama & Partner',
    category: 'Rekan Kantor Google / Tech',
    pax: 2,
    table: 'Meja Rekan 07',
    checkedIn: false,
    checkedInAt: null,
    qrToken: 'HEMA-WRK-RP005'
  },
  {
    id: 'GUEST-006',
    name: 'Bpk. H. Sulaiman & Ibu',
    category: 'Tokoh Masyarakat',
    pax: 2,
    table: 'Meja VIP 03',
    checkedIn: false,
    checkedInAt: null,
    qrToken: 'HEMA-VIP-SL006'
  },
];

// Initial Photographer and Guest Moments
export const INITIAL_MOMENTS = [
  {
    id: 'mmt_photo_01',
    caption: 'Ijab Qobul Akad Nikah yang khidmat dan penuh haru ✨',
    uploaderName: 'Official Lens Art (Fotografer)',
    uploaderRole: 'photographer',
    type: 'photo',
    category: 'Akad Nikah',
    previewUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    likes: 48,
    timestamp: '2026-10-05T08:30:00.000Z',
    synced: true,
  },
  {
    id: 'mmt_photo_02',
    caption: 'Tatapan cinta pertama sesudah sah menjadi suami istri 💍🤍',
    uploaderName: 'Official Lens Art (Fotografer)',
    uploaderRole: 'photographer',
    type: 'photo',
    category: 'Akad Nikah',
    previewUrl: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
    likes: 62,
    timestamp: '2026-10-05T09:00:00.000Z',
    synced: true,
  },
  {
    id: 'mmt_photo_03',
    caption: 'Dekorasi pelaminan Grand Ballroom bernuansa Midnight Navy & Gold ✨🏛️',
    uploaderName: 'Official Lens Art (Fotografer)',
    uploaderRole: 'photographer',
    type: 'photo',
    category: 'Dekorasi & Venue',
    previewUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
    likes: 35,
    timestamp: '2026-10-05T09:30:00.000Z',
    synced: true,
  },
  {
    id: 'mmt_guest_01',
    caption: 'Selfie bareng pengantin tercantik hari ini! Happy wedding Maya & Hendra! 🎉🥰',
    uploaderName: 'dr. Sarah Amanda',
    uploaderRole: 'guest',
    type: 'photo',
    category: 'Selfie Tamu',
    previewUrl: 'https://images.unsplash.com/photo-1529636798458-92182e662485?auto=format&fit=crop&w=1000&q=80',
    likes: 27,
    timestamp: '2026-10-05T10:20:00.000Z',
    synced: true,
  },
  {
    id: 'mmt_photo_04',
    caption: 'Cincin pernikahan lambang ikatan suci abadi 💍',
    uploaderName: 'Official Lens Art (Fotografer)',
    uploaderRole: 'photographer',
    type: 'photo',
    category: 'Detail Momen',
    previewUrl: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1200&q=80',
    likes: 41,
    timestamp: '2026-10-05T10:40:00.000Z',
    synced: true,
  },
];

// Initial Guest Wishes (with text and sample voice notes)
export const INITIAL_WISHES = [
  {
    id: 'wsh_01',
    senderName: 'Dimas Wicaksono',
    relationship: 'Sahabat SMA',
    message: 'Barakallahu lakum wa baraka alaikum! Selamat menempuh hidup baru sahabatku Hendra dan Maya. Semoga menjadi keluarga yang sakinah mawaddah warahmah selamanya!',
    type: 'text',
    audioDuration: 0,
    timestamp: '2026-10-05T09:50:00.000Z',
    synced: true,
  },
  {
    id: 'wsh_02',
    senderName: 'dr. Sarah Amanda',
    relationship: 'Bridesmaid',
    message: 'Cantik banget Maya hari ini, pangling total! Selamat ya kalian berdua, semoga selalu diberkahi kebahagiaan dan rezeki yang melimpah! Aminnn 🤍✨',
    type: 'text',
    audioDuration: 0,
    timestamp: '2026-10-05T10:18:00.000Z',
    synced: true,
  },
  {
    id: 'wsh_03',
    senderName: 'Keluarga Besar Bpk. H. Ridwan',
    relationship: 'Keluarga',
    message: 'Doa kami dari keluarga besar selalu menyertai langkah kalian berdua. Selamat menua bersama dengan penuh cinta.',
    type: 'voice',
    audioDuration: 18, // 18 seconds simulated voice note
    audioSampleType: 'demo',
    timestamp: '2026-10-05T10:35:00.000Z',
    synced: true,
  },
];
