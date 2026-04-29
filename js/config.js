// ==================== CONFIG ====================
// Simpan URL endpoint Google Apps Script di sini
const API_URL = "https://script.google.com/macros/s/AKfycbwxdWAU5im_LqEFAYrMnqibShn603Ko7NoPTDuuv4_BuHHUeSjRQTU4bQ98FjXVoG-M/exec";

// Folder ID Google Drive untuk setiap jenis dokumen (digunakan oleh Admin)
const DRIVE_FOLDER_IDS = {
    'Matrix'   : '1WaAYNCVYf7hQIaith8G3SMMe07u8VUDg',
    'Soal'     : '1wo2ymUl8qTK-Xo2SsuXZCNRpEEDKJ_VW',
    'Kisi-kisi': '1tns61QVQXDjmMfLkTAE5GQkHJ0j6DYXa',
    'Glossary' : '1aEvgkbpwVLqHyKUkbosZ0us8mYnlVhQH'
};

// ==================== GLOBAL STATE ====================
let ACTIVE_USER    = null;   // Data guru yang sedang login
let GLOBAL_DATA    = [];     // Data publik (semua guru)
let CURRENT_VAL_DOC = null;  // Dokumen yang sedang divalidasi
let ADMIN_DATA     = [];     // Data lengkap untuk admin

// ==================== KONSTANTA ====================
// Ekstensi file yang diizinkan untuk setiap jenis dokumen
const ALLOWED_EXTENSIONS = {
    'Matrix'   : ['.xlsx', '.xls'],
    'Soal'     : ['.doc', '.docx'],
    'Kisi-kisi': ['.pdf'],
    'Glossary' : ['.pdf']
};
