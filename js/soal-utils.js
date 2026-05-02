// ============================================================
// SOAL UTILS
// Helper functions untuk input soal
// ============================================================

/**
 * Dapatkan nama sheet BankSoal dari mapel
 */
function getBankSoalSheet(mapel) {
    return BANK_SOAL_SHEETS[mapel] || `BankSoal_${mapel.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

/**
 * Generate key unik untuk kategori soal
 */
function getCategoryKey(chapterName, type, difficulty) {
    return `${chapterName}|||${type}|||${difficulty}`;
}

/**
 * Parse category key kembali ke object
 */
function parseCategoryKey(key) {
    const parts = key.split('|||');
    return { chapter: parts[0], type: parts[1], difficulty: parts[2] };
}

/**
 * Hitung target jumlah soal dari matrix untuk kategori tertentu
 */
function getTargetCount(chapterName, type, difficulty) {
    const chapters = MATRIX_STATE.chapters;
    const chapter = chapters.find(c => c.name === chapterName);
    if (!chapter) return 0;
    const fieldKey = `${type}_${difficulty}_keluar`;
    return chapter.data[fieldKey] || 0;
}

/**
 * Hitung berapa soal yang sudah diinput untuk kategori tertentu
 */
function getCompletedCount(chapterName, type, difficulty) {
    const key = `${chapterName}_${type}_${difficulty}`;
    const soals = SOAL_STATE.allSoals[key] || [];
    return soals.filter(s => s.status === 'draft' || s.status === 'submitted').length;
}

/**
 * Hitung progress semua soal
 */
function calculateSoalProgress() {
    let totalTarget = 0;
    let totalCompleted = 0;
    
    const chapters = MATRIX_STATE.chapters;
    const types = ['pilgan', 'ceklist', 'essay'];
    const levels = ['mudah', 'sedang', 'sulit'];
    
    const progressPerChapter = {};
    
    chapters.forEach(ch => {
        let chapterTarget = 0;
        let chapterCompleted = 0;
        
        types.forEach(type => {
            levels.forEach(level => {
                const target = ch.data[`${type}_${level}_keluar`] || 0;
                if (target > 0) {
                    const completed = getCompletedCount(ch.name, type, level);
                    chapterTarget += target;
                    chapterCompleted += completed;
                }
            });
        });
        
        progressPerChapter[ch.name] = { target: chapterTarget, completed: chapterCompleted, percent: chapterTarget > 0 ? Math.round((chapterCompleted / chapterTarget) * 100) : 0 };
        totalTarget += chapterTarget;
        totalCompleted += chapterCompleted;
    });
    
    return { totalTarget, totalCompleted, totalPercent: totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0, chapters: progressPerChapter, isComplete: totalTarget > 0 && totalCompleted >= totalTarget };
}

/**
 * Hitung jumlah soal yang perlu direvisi
 */
function getRevisionCount() {
    let count = 0;
    Object.values(SOAL_STATE.allSoals).forEach(soals => {
        count += soals.filter(s => s.status_validasi === 'Needs Revision' && s.status === 'revision').length;
    });
    return count;
}

/**
 * Hitung jumlah soal yang sudah approved
 */
function getApprovedCount() {
    let count = 0;
    Object.values(SOAL_STATE.allSoals).forEach(soals => {
        count += soals.filter(s => s.status_validasi === 'Approved').length;
    });
    return count;
}

/**
 * Cek apakah ada revisi yang belum dikirim
 */
function hasPendingRevisi() {
    let count = 0;
    Object.values(SOAL_STATE.allSoals).forEach(soals => {
        count += soals.filter(s => s.status_validasi === 'Needs Revision' && s.status === 'draft').length;
    });
    return count > 0;
}

/**
 * Dapatkan daftar soal yang perlu direvisi
 */
function getRevisionItems() {
    const items = [];
    Object.entries(SOAL_STATE.allSoals).forEach(([key, soals]) => {
        soals.forEach(s => {
            if (s.status_validasi === 'Needs Revision') {
                items.push({ ...s, categoryKey: key });
            }
        });
    });
    return items;
}

/**
 * Dapatkan daftar soal untuk kategori tertentu
 */
function getSoalsByCategory(chapterName, type, difficulty) {
    const key = `${chapterName}_${type}_${difficulty}`;
    return SOAL_STATE.allSoals[key] || [];
}

/**
 * Buat objek soal kosong
 */
function createEmptySoal(chapterName, type, difficulty, index) {
    return {
        id: `soal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        chapter: chapterName, type: type, difficulty: difficulty, index: index,
        bobot: 1,
        pertanyaan: '', pertanyaanHTML: '', gambarSoal: null,
        opsiA: '', opsiB: '', opsiC: '', opsiD: '',
        gambarA: null, gambarB: null, gambarC: null, gambarD: null,
        kunci: '',
        pernyataan: [],
        jawabanEssay: '',
        pembahasan: '', pembahasanHTML: '',
        status: 'draft',
        komentar_validator: '',
        status_validasi: 'Under Review',
        komentar_history: [] // Riwayat komentar validator
    };
}

// ==================== FORMATTERS ====================

function formatTipeLabel(type) {
    const labels = { pilgan: 'Pilgan', ceklist: 'Ceklist', essay: 'Essay' };
    return labels[type] || type;
}

function formatDifficultyLabel(difficulty) {
    const labels = { mudah: 'Mudah', sedang: 'Sedang', sulit: 'Sulit' };
    return labels[difficulty] || difficulty;
}

function getDifficultyColor(difficulty) {
    const colors = { mudah: '#10b981', sedang: '#f59e0b', sulit: '#ef4444' };
    return colors[difficulty] || '#94a3b8';
}

function getTipeColor(type) {
    const colors = { pilgan: '#2563eb', ceklist: '#059669', essay: '#d97706' };
    return colors[type] || '#94a3b8';
}

function getTipeIcon(type) {
    const icons = { pilgan: '📝', ceklist: '✅', essay: '📄' };
    return icons[type] || '❓';
}

function escHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Konversi URL Google Drive ke format embed/preview
 */
function getEmbedUrl(url) {
    if (!url) return '';
    if (url.includes('drive.google.com/file/d/')) {
        const match = url.match(/\/d\/([^\/]+)/);
        if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=s1000`;
    }
    if (url.includes('open?id=')) {
        const match = url.match(/id=([^&]+)/);
        if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=s1000`;
    }
    if (url.includes('/view?usp=')) {
        const match = url.match(/\/([^\/]+)\/view/);
        if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=s1000`;
    }
    return url;
}