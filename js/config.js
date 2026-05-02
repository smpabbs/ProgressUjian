// ============================================================
// CONFIG
// Konfigurasi global, state, dan konstanta
// ============================================================

// ==================== API ENDPOINT ====================
const API_URL = "https://script.google.com/macros/s/AKfycbx79uDJUGFftFg_RX18gpl0xiVoHXMtVdoJACPHfTEnudzY8pYjRvOCT47e9iedM9Rw/exec";

// ==================== DRIVE FOLDER IDS ====================
const DRIVE_FOLDER_IDS = {
    'Matrix'   : '1WaAYNCVYf7hQIaith8G3SMMe07u8VUDg',
    'Soal'     : '1wo2ymUl8qTK-Xo2SsuXZCNRpEEDKJ_VW',
    'Kisi-kisi': '1tns61QVQXDjmMfLkTAE5GQkHJ0j6DYXa',
    'Glossary' : '1aEvgkbpwVLqHyKUkbosZ0us8mYnlVhQH'
};

// ==================== GLOBAL STATE ====================
let ACTIVE_USER    = null;
let GLOBAL_DATA    = [];
let CURRENT_VAL_DOC = null;
let ADMIN_DATA     = [];

// ==================== ALLOWED EXTENSIONS ====================
const ALLOWED_EXTENSIONS = {
    'Matrix'   : ['.xlsx', '.xls'],
    'Soal'     : ['.doc', '.docx'],
    'Kisi-kisi': ['.pdf'],
    'Glossary' : ['.pdf']
};

// ==================== MATRIX STATE ====================
let MATRIX_STATE = {
    patokan: null,
    chapters: [],
    isSubmitted: false,
    isEditing: false
};

// ==================== BANK SOAL CONFIG ====================

// Mapping nama mapel → nama sheet BankSoal
const BANK_SOAL_SHEETS = {
    "IPA": "BankSoal_IPA",
    "Math": "BankSoal_Math",
    "Indonesian": "BankSoal_Indonesian",
    "English": "BankSoal_English",
    "English Cambridge": "BankSoal_English_Cambridge",
    "Social (IPS)": "BankSoal_Social_IPS",
    "IPA Cambridge": "BankSoal_IPA_Cambridge",
    "Math Cambridge": "BankSoal_Math_Cambridge",
    "ICT Progul": "BankSoal_ICT_Progul",
    "ICT non Progul": "BankSoal_ICT_non_Progul",
    "Civic (PKn)": "BankSoal_Civic",
    "IFE": "BankSoal_IFE",
    "Sport (PJOK)": "BankSoal_Sport",
    "Qur'an": "BankSoal_Quran",
    "Javanese": "BankSoal_Javanese"
};

// Status soal
const STATUS_SOAL = {
    DRAFT: 'draft',
    SUBMITTED: 'submitted',
    APPROVED: 'approved',
    REVISION: 'revision'
};

// Status validasi (oleh validator)
const VALIDATION_STATUS = {
    UNDER_REVIEW: 'Under Review',
    APPROVED: 'Approved',
    NEEDS_REVISION: 'Needs Revision'
};

// Tipe soal
const TIPE_SOAL = {
    PILGAN: 'pilgan',
    CEKLIST: 'ceklist',
    ESSAY: 'essay'
};

// Tingkat kesulitan
const KESULITAN = {
    MUDAH: 'mudah',
    SEDANG: 'sedang',
    SULIT: 'sulit'
};

// ==================== SOAL STATE ====================
const SOAL_STATE = {
    chapters: [],
    patokan: null,
    allSoals: {},
    currentChapter: null,
    currentType: null,
    currentDifficulty: null,
    currentSoalIndex: 0,
    currentEditSoal: null,
    targetMap: {},
    viewMode: 'dashboard',     // 'dashboard' | 'editor'
    revisionFilter: 'all',     // 'all' | 'revision' | 'approved' | 'pending'
    isReadOnly: false          // Read-only mode untuk soal approved
};