// ==================== MODAL ====================

function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// ==================== TOAST NOTIFIKASI ====================

function showRevisionToast(count, details = []) {
    if (count === 0) return;

    let message = `Anda memiliki <strong>${count} dokumen</strong> yang perlu direvisi.`;
    if (details.length > 0) {
        message += '<br><br><div style="text-align: left; font-size: 13px;">';
        details.forEach(d => {
            message += `• ${d.type}: "${d.note.substring(0, 50)}${d.note.length > 50 ? '...' : ''}"<br>`;
        });
        message += '</div>';
    }

    Swal.fire({
        title            : '⚠️ Perhatian!',
        html             : message,
        icon             : 'warning',
        confirmButtonText: 'Saya Mengerti',
        confirmButtonColor: '#dc2626',
        background       : '#fef2f2',
        iconColor        : '#dc2626'
    });
}

// ==================== ICON FILE DENGAN DOWNLOAD ====================

const getFileIconWithDownload = (status, type, link, isSoal = false, guruName = null, mapelName = null, levelNum = null) => {
    let boxClass  = 'icon-empty';
    let titleText = 'Belum Upload';

    if      (status === 'blue')   { boxClass = 'icon-approved'; titleText = 'Tervalidasi / Final (Approved)'; }
    else if (status === 'green')  { boxClass = 'icon-review';   titleText = 'Sedang Direview (Under Review)'; }
    else if (status === 'yellow') { boxClass = 'icon-revision'; titleText = 'Perlu Revisi (Needs Revision)'; }

    let iconClass;
    if      (type === 'Matrix')                        iconClass = 'fa-file-excel';
    else if (type === 'Kisi-kisi' || type === 'Kisi')  iconClass = 'fa-file-pdf';
    else if (type === 'Soal' || type === 'Glossary')   iconClass = 'fa-file-word';
    else                                               iconClass = 'fa-file';

    let downloadIcon = '';
    if (link && link !== 'MATRIX_INPUT') {
        let previewLink = link;
        if (link.includes('drive.google.com')) {
            const fileIdMatch = link.match(/\/d\/([^\/]+)/);
            if (fileIdMatch) previewLink = `https://drive.google.com/file/d/${fileIdMatch[1]}/view`;
        }
        if ((isSoal && status === 'blue') || !isSoal) {
            downloadIcon = `<div class="download-icon" onclick="event.stopPropagation(); window.open('${previewLink}', '_blank')" title="Preview & Download (Tidak bisa edit)"><i class="fas fa-download"></i></div>`;
        }
    }
    
    // Khusus Matrix yang diinput (bukan upload)
    if (type === 'Matrix' && link === 'MATRIX_INPUT') {
        boxClass = 'icon-approved';
        titleText = 'Matrix Diinput (Approved) - Klik untuk lihat';
        
        // Escape parameter untuk HTML
        const safeGuru = escHTML(guruName || '');
        const safeMapel = escHTML(mapelName || '');
        const safeLevel = escHTML(levelNum || '');
        
        downloadIcon = `<div class="download-icon" onclick="event.stopPropagation(); viewMatrixDetail('${safeGuru}', '${safeMapel}', '${safeLevel}')" title="Lihat Detail Matrix"><i class="fas fa-eye"></i></div>`;
    }

    return `<div class="icon-box-wrapper">
        <div class="icon-box ${boxClass}" title="${titleText}"><i class="fas ${iconClass}"></i></div>
        ${downloadIcon}
    </div>`;
};

// ==================== STATISTIK PUBLIK ====================

function updateStats() {
    const total = GLOBAL_DATA.length;
    let matrixUploaded = 0, soalUploaded = 0, soalApproved = 0,
        kisiUploaded = 0, glossaryUploaded = 0, complete = 0;

    GLOBAL_DATA.forEach(r => {
        if (r.docs.Matrix       !== 'gray') matrixUploaded++;
        if (r.docs.Soal         !== 'gray') soalUploaded++;
        if (r.docs.Soal         === 'blue') soalApproved++;
        if (r.docs['Kisi-kisi'] !== 'gray') kisiUploaded++;
        if (r.docs.Glossary     !== 'gray') glossaryUploaded++;

        if (r.docs.Soal === 'blue' &&
            r.docs.Matrix !== 'gray' &&
            r.docs['Kisi-kisi'] !== 'gray' &&
            r.docs.Glossary !== 'gray') complete++;
    });

    updateCardProgress('matrix',  matrixUploaded,  total);
    updateCardProgress('soal',    soalUploaded,     total);
    updateCardProgress('kisi',    kisiUploaded,     total);
    updateCardProgress('glossary',glossaryUploaded, total);

    const approvedPercent = soalUploaded > 0 ? (soalApproved / soalUploaded * 100) : 0;
    document.getElementById('approved-count').innerText   = `${soalApproved}/${soalUploaded}`;
    document.getElementById('approved-percent').innerText = `${Math.round(approvedPercent)}%`;
    document.getElementById('approved-bar').style.width   = approvedPercent + '%';

    document.getElementById('footer-total').innerText    = total;
    document.getElementById('footer-complete').innerText = complete;
    document.getElementById('footer-action').innerText   = total - complete;
}

function updateCardProgress(type, uploaded, total) {
    const percent = total > 0 ? (uploaded / total * 100) : 0;
    const elements = {
        'matrix'  : { count: 'card-matrix-count',   percent: 'card-matrix-percent',   bar: 'card-matrix-bar'   },
        'soal'    : { count: 'card-soal-count',     percent: 'card-soal-percent',     bar: 'card-soal-bar'     },
        'kisi'    : { count: 'card-kisi-count',     percent: 'card-kisi-percent',     bar: 'card-kisi-bar'     },
        'glossary': { count: 'card-glossary-count', percent: 'card-glossary-percent', bar: 'card-glossary-bar' }
    };
    const el = elements[type];
    if (el) {
        document.getElementById(el.count).innerText   = `${uploaded}/${total}`;
        document.getElementById(el.percent).innerText = `${Math.round(percent)}%`;
        document.getElementById(el.bar).style.width   = percent + '%';
    }
}

// ==================== TABEL PUBLIK & FILTER ====================

function applyFilters() {
    const sortVal  = document.getElementById('sort-by').value;
    const levelF   = document.getElementById('filter-level').value;
    const mapelF   = document.getElementById('filter-mapel').value;
    const searchF  = document.getElementById('search-guru').value.toLowerCase();

    let filtered = GLOBAL_DATA.filter(row => {
        const matchLevel  = levelF === 'all' || row.level.toString() === levelF;
        const matchMapel  = mapelF === 'all' || row.mapel === mapelF;
        const matchSearch = row.guru.toLowerCase().includes(searchF) ||
                            row.mapel.toLowerCase().includes(searchF) ||
                            (row.unit || "").toLowerCase().includes(searchF);
        return matchLevel && matchMapel && matchSearch;
    });

    filtered.sort((a, b) => {
        if (sortVal === 'status') return a.priority - b.priority || a.level - b.level;
        if (sortVal === 'unit')   return (a.unit || "").localeCompare(b.unit || "") || a.level - b.level;
        return (a.level === b.level) ? a.mapel.localeCompare(b.mapel) : a.level - b.level;
    });

    let html = '';
    filtered.forEach(row => {
        html += `<tr>
            <td><strong>Kls ${row.level}</strong></td>
            <td><span class="unit-badge">${row.unit || '-'}</span></td>
            <td>
                <div style="font-weight: 600; color: #0f172a;">${row.mapel}</div>
                <div class="guru-info">${row.guru}</div>
            </td>
            <td><span class="badge-status ${row.badgeClass}">${row.overallStatus}</span></td>
            <td style="text-align: center;">${getFileIconWithDownload(row.docs.Matrix, 'Matrix', row.docLinks?.Matrix, false, row.guru, row.mapel, row.level)}</td>
            <td style="text-align: center;">${getFileIconWithDownload(row.docs.Soal,           'Soal',     row.docLinks?.Soal,            true)}</td>
            <td style="text-align: center;">${getFileIconWithDownload(row.docs['Kisi-kisi'],   'Kisi',     row.docLinks?.['Kisi-kisi'],   false)}</td>
            <td style="text-align: center;">${getFileIconWithDownload(row.docs.Glossary,       'Glossary', row.docLinks?.Glossary,        false)}</td>
        </tr>`;
    });

    document.getElementById('public-table-body').innerHTML = html ||
        '<tr><td colspan="8" class="loading-placeholder"><i class="fas fa-folder-open" style="font-size: 24px; margin-bottom: 10px; display: block;"></i> Tidak ada data yang cocok.</td></tr>';
}

// ==================== PANEL GURU ====================

async function renderTeacherHeader() {
    const headerLeft = document.querySelector('#view-teacher .header-left');
    const existingBadge = document.querySelector('.notification-badge');
    if (existingBadge) existingBadge.remove();

    document.getElementById('teacher-info').innerText =
        `${ACTIVE_USER.nama} • ${ACTIVE_USER.mapel} Kelas ${ACTIVE_USER.level} (${ACTIVE_USER.unit})`;
    
    // 🔧 FETCH ULANG DATA SOAL DARI SERVER
    let totalRevision = countRevisions(); // Dari Rekap_Upload
    
    try {
        const soals = await fetchSoals();
        if (soals && soals.length > 0) {
            // Reset & isi ulang SOAL_STATE.allSoals
            SOAL_STATE.allSoals = {};
            soals.forEach(s => {
                const key = `${s.chapter}_${s.type}_${s.difficulty}`;
                if (!SOAL_STATE.allSoals[key]) SOAL_STATE.allSoals[key] = [];
                SOAL_STATE.allSoals[key].push(s);
            });
            
            // 🔧 Hitung yang PERLU DIREVISI: status = 'revision' dan blm diresubmit
            const soalRevisionCount = soals.filter(s => 
                s.status === 'revision' && s.status_validasi === 'Needs Revision'
            ).length;
            
            totalRevision += soalRevisionCount;
        }
    } catch (e) {
        console.error('Gagal fetch soal:', e);
    }
    
    // Tampilkan badge jika ada yang perlu direvisi
    if (totalRevision > 0) {
        const badge = document.createElement('span');
        badge.className = 'notification-badge';
        badge.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${totalRevision} dokumen perlu direvisi`;
        headerLeft.appendChild(badge);
    }
    
    // Re-render upload cards dengan data terbaru
    renderUploadCards();
}

/**
 * Cek notifikasi dari BankSoal
 */
async function checkBankSoalNotifications() {
    try {
        const soals = await fetchSoals();
        if (!soals || soals.length === 0) return 0;
        
        // Simpan ke SOAL_STATE untuk digunakan renderUploadCards
        SOAL_STATE.allSoals = {};
        soals.forEach(s => {
            const key = `${s.chapter}_${s.type}_${s.difficulty}`;
            if (!SOAL_STATE.allSoals[key]) SOAL_STATE.allSoals[key] = [];
            SOAL_STATE.allSoals[key].push(s);
        });
        
        return soals.filter(s => s.status_validasi === 'Needs Revision').length;
    } catch (e) {
        return 0;
    }
}

/**
 * Hitung jumlah soal yang perlu direvisi (dari BankSoal)
 */

function countRevisions() {
    if (!ACTIVE_USER || !ACTIVE_USER.docs) return 0;
    return Object.values(ACTIVE_USER.docs).filter(s => s === 'Needs Revision').length;
}

function getRevisionDetails() {
    if (!ACTIVE_USER || !ACTIVE_USER.docs) return [];
    const docNames = { 'Matrix': 'Matrix Pemetaan', 'Soal': 'Naskah Soal',
                       'Kisi-kisi': 'Kisi-kisi Ujian', 'Glossary': 'Glossary' };
    return Object.keys(ACTIVE_USER.docs)
        .filter(key => ACTIVE_USER.docs[key] === 'Needs Revision')
        .map(key => ({ type: docNames[key] || key, note: ACTIVE_USER.notes[key] || '(Tidak ada catatan)' }));
}

function checkAndShowRevisionNotification() {
    const count = countRevisions();
    if (count > 0) showRevisionToast(count, getRevisionDetails());
}

function renderUploadCards() {
    const docs = [
        { id: "Matrix",   title: "Matrix Pemetaan", ext: ".xlsx,.xls",  icon: "fa-file-excel", color: "text-emerald-500", versioned: false, isMatrix: true },
        { id: "Soal",     title: "Naskah Soal",     ext: ".doc,.docx",  icon: "fa-file-word",  color: "text-blue-600",   versioned: true,  isMatrix: false },
        { id: "Kisi-kisi",title: "Kisi-kisi Ujian", ext: ".pdf",        icon: "fa-file-pdf",   color: "text-red-500",    versioned: false, isMatrix: false },
        { id: "Glossary", title: "Glossary",         ext: ".pdf",        icon: "fa-file-word",  color: "text-blue-500",   versioned: false, isMatrix: false }
    ];

    let html = '';
    docs.forEach(d => {
        const status   = ACTIVE_USER.docs[d.id];
        const note     = ACTIVE_USER.notes[d.id];
        const docLink  = ACTIVE_USER.docLinks ? ACTIVE_USER.docLinks[d.id] : null;
        const version  = ACTIVE_USER.versions ? ACTIVE_USER.versions[d.id] : 1;
        
        let badgeClass = "badge-gray";
        let statusText = "Belum Upload";
        let cardClass  = "";
        let noteHtml   = "";
        let actionSection = "";

        // ==================== MATRIX CARD ====================
        if (d.isMatrix) {
            const isApproved = (status === 'Approved');
            if (isApproved || MATRIX_STATE.isSubmitted) {
                badgeClass = "badge-green";
                statusText = "✅ Tervalidasi / Final";
                actionSection = `
                    <div style="padding-top:16px;margin-top:16px;border-top:1px solid #f1f5f9;">
                        <button class="btn btn-info" style="width:100%;" onclick="viewMatrixDetail()">
                            <i class="fas fa-eye"></i> Lihat Matrix
                        </button>
                        <div class="final-lock-message"><i class="fas fa-lock"></i> Matrix sudah disubmit dan terkunci</div>
                    </div>`;
            } else {
                actionSection = `
                    <div style="padding-top:16px;margin-top:16px;border-top:1px solid #f1f5f9;">
                        <button class="btn btn-success" style="width:100%;" onclick="openMatrixInput()">
                            <i class="fas fa-edit"></i> Input Matrix Pemetaan
                        </button>
                    </div>`;
            }
        }
        
        // ==================== SOAL CARD ====================
        else if (d.id === "Soal") {
            const matrixApproved = ACTIVE_USER.docs['Matrix'] === 'Approved' || MATRIX_STATE.isSubmitted;
            
            // 🔧 Cek status soal dari BankSoal (SOAL_STATE.allSoals)
            let effectiveStatus = status;
            let effectiveNote = '';
            
            if (SOAL_STATE.allSoals && Object.keys(SOAL_STATE.allSoals).length > 0) {
                const allSoals = Object.values(SOAL_STATE.allSoals).flat();
                const totalCount = allSoals.length;
                
                // Cek apakah semua soal sudah approved
                const allApproved = allSoals.length > 0 && allSoals.every(s => 
                    s.status === 'approved' || s.status_validasi === 'Approved'
                );
                
                // Cek apakah ada yang perlu direvisi (status = 'revision', belum diresubmit)
                const revisionSoals = allSoals.filter(s => 
                    s.status === 'revision' && s.status_validasi === 'Needs Revision'
                );
                
                // Cek apakah ada yang submitted (menunggu review)
                const submittedSoals = allSoals.filter(s => s.status === 'submitted');
                
                // Cek apakah ada draft
                const draftSoals = allSoals.filter(s => s.status === 'draft');
                
                if (allApproved) {
                    effectiveStatus = 'Approved';
                    effectiveNote = `${totalCount} soal disetujui`;
                } else if (revisionSoals.length > 0) {
                    effectiveStatus = 'Needs Revision';
                    effectiveNote = `${revisionSoals.length} soal perlu direvisi`;
                } else if (submittedSoals.length > 0) {
                    effectiveStatus = 'Under Review';
                    effectiveNote = `${submittedSoals.length} soal menunggu review`;
                } else if (draftSoals.length > 0) {
                    effectiveStatus = 'Draft';
                    effectiveNote = `${draftSoals.length} soal draft`;
                }
            }
            
            // Set badge & action
            if (effectiveStatus === 'Approved') {
                badgeClass = "badge-green"; statusText = "✅ Approved";
                noteHtml = effectiveNote ? `<div class="teacher-note note-green"><strong>✅ Status:</strong><br/>${effectiveNote}</div>` : "";
                actionSection = `
                    <div style="padding-top:16px;margin-top:16px;border-top:1px solid #f1f5f9;">
                        <button class="btn btn-info" style="width:100%;" onclick="openSoalDashboard()">
                            <i class="fas fa-eye"></i> Lihat Soal (Read-only)
                        </button>
                        <div class="final-lock-message"><i class="fas fa-lock"></i> Soal sudah final dan terkunci</div>
                    </div>`;
            } else if (effectiveStatus === 'Needs Revision') {
                badgeClass = "badge-red"; statusText = "🔴 Perlu Revisi!";
                cardClass = "revision-pulse";
                noteHtml = effectiveNote ? `<div class="teacher-note note-red"><strong><i class="fas fa-comment-dots"></i> Catatan:</strong><br/>${effectiveNote}</div>` : "";
                actionSection = `
                    <div style="padding-top:16px;margin-top:16px;border-top:1px solid #f1f5f9;">
                        <button class="btn btn-warning" style="width:100%;" onclick="openSoalDashboard()">
                            <i class="fas fa-edit"></i> Lihat & Revisi Soal
                        </button>
                    </div>`;
            } else if (effectiveStatus === 'Under Review') {
                badgeClass = "badge-blue"; statusText = "🔵 Menunggu Review";
                noteHtml = effectiveNote ? `<div class="teacher-note" style="border-left-color:#3b82f6;background:#eff6ff;"><strong>🔵 Status:</strong><br/>${effectiveNote}</div>` : "";
                actionSection = `
                    <div style="padding-top:16px;margin-top:16px;border-top:1px solid #f1f5f9;">
                        <button class="btn btn-info" style="width:100%;" onclick="openSoalDashboard()">
                            <i class="fas fa-eye"></i> Lihat Progress Soal
                        </button>
                    </div>`;
            } else if (effectiveStatus === 'Draft') {
                badgeClass = "badge-gray"; statusText = "📝 Draft";
                actionSection = `
                    <div style="padding-top:16px;margin-top:16px;border-top:1px solid #f1f5f9;">
                        <button class="btn btn-success" style="width:100%;" onclick="openSoalDashboard()">
                            <i class="fas fa-edit"></i> Lanjut Input Soal
                        </button>
                    </div>`;
            } else if (matrixApproved) {
                badgeClass = "badge-gray"; statusText = "Belum Upload";
                actionSection = `
                    <div style="padding-top:16px;margin-top:16px;border-top:1px solid #f1f5f9;">
                        <button class="btn btn-success" style="width:100%;" onclick="openSoalDashboard()">
                            <i class="fas fa-edit"></i> Input Soal Manual
                        </button>
                    </div>`;
            } else {
                badgeClass = "badge-gray"; statusText = "Belum Upload";
                actionSection = `
                    <div style="padding-top:16px;margin-top:16px;border-top:1px solid #f1f5f9;">
                        <div style="text-align:center;padding:14px;background:#fffbeb;border-radius:8px;font-size:12px;color:#d97706;border:1px solid #fde68a;">
                            <i class="fas fa-exclamation-triangle"></i> Harap input <strong>Matrix</strong> terlebih dahulu!
                        </div>
                    </div>`;
            }
        }
        
        // ==================== KISI-KISI & GLOSSARY ====================
        else {
            const isApproved = (status === 'Approved');
            if (isApproved) {
                badgeClass = "badge-green"; statusText = "✅ Tervalidasi / Final";
                actionSection = `
                    <div style="padding-top:16px;margin-top:16px;border-top:1px solid #f1f5f9;">
                        ${docLink ? `<button class="btn btn-info" style="width:100%;" onclick="previewFile('${docLink}')"><i class="fas fa-eye"></i> Lihat Dokumen Final</button>` : ''}
                        <div class="final-lock-message"><i class="fas fa-lock"></i> Dokumen sudah final dan terkunci</div>
                    </div>`;
            } else if (status === "Needs Revision") {
                badgeClass = "badge-red"; statusText = "⚠️ PERLU REVISI!";
                cardClass = "revision-pulse";
                if (note) noteHtml = `<div class="teacher-note note-red"><strong><i class="fas fa-comment-dots"></i> Catatan Validator:</strong><br/>${note}</div>`;
                actionSection = `
                    <div class="button-group">
                        ${docLink ? `<button class="btn btn-info" onclick="previewFile('${docLink}')"><i class="fas fa-eye"></i> Lihat</button>` : ''}
                        <button class="btn btn-warning" onclick="triggerFileUpload('${d.id}')"><i class="fas fa-upload"></i> Upload Revisi</button>
                    </div>
                    <input type="file" id="up-${d.id}" accept="${d.ext}" style="display:none;" onchange="handleUploadWithConfirm('${d.id}', ${d.versioned}, '${d.title}')">`;
            } else if (status === "Under Review") {
                badgeClass = "badge-blue"; statusText = "Sedang Direview";
            } else {
                actionSection = `
                    <div style="padding-top:16px;margin-top:16px;border-top:1px solid #f1f5f9;">
                        <input type="file" id="up-${d.id}" accept="${d.ext}" style="font-size:12px;margin-bottom:12px;width:100%;cursor:pointer;" onchange="handleUploadWithConfirm('${d.id}', ${d.versioned}, '${d.title}')">
                        <button class="btn btn-outline" style="width:100%;" onclick="handleUploadButtonClick('${d.id}', ${d.versioned}, '${d.title}')">
                            <i class="fas fa-cloud-upload-alt"></i> Upload File
                        </button>
                    </div>`;
            }
        }

        const versionBadge = (d.versioned && status !== "Belum Upload") ? 
            `<span class="version-badge"><i class="fas fa-code-branch"></i> v${version}</span>` : '';

        html += `<div class="upload-card ${cardClass}">
            <div style="display:flex;gap:16px;margin-bottom:12px;">
                <div style="font-size:32px;" class="${d.color}"><i class="fas ${d.icon}"></i></div>
                <div style="flex:1;">
                    <h3 style="font-size:15px;font-weight:600;color:#0f172a;display:flex;align-items:center;justify-content:space-between;">
                        ${d.title} ${versionBadge}
                    </h3>
                    <span class="badge-status ${badgeClass}">${statusText}</span>
                </div>
            </div>
            ${noteHtml}
            ${actionSection}
        </div>`;
    });

    document.getElementById('upload-cards').innerHTML = html;
}
// ==================== VIEW MATRIX DETAIL (READ ONLY) ====================

async function viewMatrixDetail(guruName, mapelName, levelNum) {
    // Jika dipanggil dari public (home), parameter akan diisi
    // Jika dari panel guru, gunakan ACTIVE_USER
    
    let guru, mapel, level;
    
    if (guruName && mapelName && levelNum) {
        // Dari public (home) - parameter dikirim dari ikon
        guru = decodeURIComponent(guruName);
        mapel = decodeURIComponent(mapelName);
        level = levelNum;
    } else if (typeof ACTIVE_USER !== 'undefined' && ACTIVE_USER) {
        // Dari panel guru
        guru = ACTIVE_USER.nama;
        mapel = ACTIVE_USER.mapel;
        level = ACTIVE_USER.level;
    } else {
        return Swal.fire('Error', 'Tidak dapat memuat matrix.', 'error');
    }
    
    Swal.fire({ 
        title: 'Memuat matrix...', 
        allowOutsideClick: false, 
        didOpen: () => Swal.showLoading() 
    });
    
    let result;
    if (typeof ACTIVE_USER !== 'undefined' && ACTIVE_USER && ACTIVE_USER.nama === guru) {
        // Guru lihat matrix sendiri
        const chapters = await fetchMatrix();
        result = { success: true, data: chapters, guru, mapel, level };
    } else {
        // Public / admin lihat matrix guru tertentu
        result = await fetchPublicMatrix(guru, mapel, level);
    }
    
    Swal.close();
    
    if (!result || !result.success || !result.data || result.data.length === 0) {
        return Swal.fire({
            title: 'Belum Ada Data',
            text: 'Matrix belum diinput oleh guru yang bersangkutan.',
            icon: 'info',
            confirmButtonColor: '#2563eb'
        });
    }
    
    const chapters = result.data;
    const fields = getMatrixFields();
    const totals = {};
    fields.forEach(f => {
        totals[f.key] = chapters.reduce((sum, ch) => sum + (ch.data?.[f.key] || 0), 0);
    });
    
    // Build tabel HTML
    let tableHTML = buildViewMatrixHTML(chapters, totals, fields, result);
    
    // Tampilkan di SweetAlert dengan tombol download
const swalResult = await Swal.fire({
    title: `<span style="font-size:15px;">📋 Matrix ${result.mapel} - Kelas ${result.level}<br><span style="font-size:11px;color:#64748b;font-weight:400;">Guru: ${result.guru}</span></span>`,
    html: tableHTML,
    width: '95%',
    showCloseButton: true,
    showConfirmButton: true,
    confirmButtonText: '<i class="fas fa-file-csv"></i> Download CSV',
    confirmButtonColor: '#16a34a',
    showCancelButton: true,
    cancelButtonText: 'Tutup',
    cancelButtonColor: '#64748b',
    customClass: {
        popup: 'swal-wide-view'
    }
});

if (swalResult.isConfirmed) {
    // Download CSV
    downloadMatrixCSV(chapters, totals, fields, result);
}
}
// ==================== INPUT SOAL MANUAL ====================

// ==================== INPUT SOAL MANUAL ====================

async function openSoalDashboard() {
    // Sembunyikan upload cards
    const uploadCards = document.getElementById('upload-cards');
    if (uploadCards) uploadCards.style.display = 'none';
    
    // Cari atau buat container soal
    let soalContainer = document.getElementById('soal-container');
    if (!soalContainer) {
        soalContainer = document.createElement('div');
        soalContainer.id = 'soal-container';
        soalContainer.className = 'soal-container animate-in';
        
        const viewTeacher = document.getElementById('view-teacher');
        if (viewTeacher) {
            viewTeacher.appendChild(soalContainer);
        } else {
            Swal.fire('Error', 'Tidak dapat membuka halaman input soal.', 'error');
            return;
        }
    }
    
    soalContainer.style.display = 'block';
    soalContainer.innerHTML = '<div style="text-align:center;padding:60px;"><div class="spinner"></div><p>Memuat data soal...</p></div>';
    
    // Load matrix dari server (bukan dari state lokal)
    const matrixChapters = await fetchMatrix();
    if (matrixChapters && matrixChapters.length > 0) {
        SOAL_STATE.chapters = matrixChapters;
        // Update MATRIX_STATE juga
        MATRIX_STATE.chapters = matrixChapters;
    } else if (MATRIX_STATE.chapters && MATRIX_STATE.chapters.length > 0) {
        SOAL_STATE.chapters = MATRIX_STATE.chapters;
    } else {
        soalContainer.innerHTML = `
            <div style="text-align:center;padding:40px;color:#ef4444;">
                <i class="fas fa-exclamation-circle" style="font-size:48px;margin-bottom:16px;"></i>
                <p>Data matrix tidak ditemukan.</p>
                <p style="font-size:12px;color:#64748b;">Silakan input matrix terlebih dahulu.</p>
                <button class="btn btn-outline" onclick="closeSoalInput()" style="margin-top:16px;">Kembali</button>
            </div>`;
        return;
    }
    
    // Load patokan dari server jika belum ada
    if (!MATRIX_STATE.patokan) {
        const patokan = await fetchPatokan(ACTIVE_USER.mapel);
        if (patokan) {
            MATRIX_STATE.patokan = patokan;
        }
    }
    SOAL_STATE.patokan = MATRIX_STATE.patokan;
    
    // Fetch soal yang sudah diinput
    const existingSoals = await fetchSoals();
    
    // Organize soal by category
    SOAL_STATE.allSoals = {};
    if (existingSoals && existingSoals.length > 0) {
        existingSoals.forEach(s => {
            const key = `${s.chapter}_${s.type}_${s.difficulty}`;
            if (!SOAL_STATE.allSoals[key]) SOAL_STATE.allSoals[key] = [];
            SOAL_STATE.allSoals[key].push(s);
        });
    }
    
    SOAL_STATE.viewMode = 'dashboard';
    
    // Render dashboard
    if (typeof renderSoalDashboard === 'function') {
        renderSoalDashboard(soalContainer);
    } else {
        soalContainer.innerHTML = '<p style="text-align:center;padding:40px;">Modul input soal sedang dimuat... Mohon tunggu.</p>';
    }
}

function closeSoalInput() {
    const soalContainer = document.getElementById('soal-container');
    if (soalContainer) soalContainer.style.display = 'none';
    const uploadCards = document.getElementById('upload-cards');
    if (uploadCards) uploadCards.style.display = '';
}

// Expose ke global
window.openSoalDashboard = openSoalDashboard;
window.closeSoalInput = closeSoalInput;

function closeSoalInput() {
    const soalContainer = document.getElementById('soal-container');
    if (soalContainer) soalContainer.style.display = 'none';
    const uploadCards = document.getElementById('upload-cards');
    if (uploadCards) uploadCards.style.display = '';
}

// Expose ke global
window.openSoalDashboard = openSoalDashboard;
window.closeSoalInput = closeSoalInput;

function getMatrixFields() {
    const types = ['pilgan','ceklist','essay'];
    const levels = ['mudah','sedang','sulit'];
    const metrics = ['keluar','bank'];
    const result = [];
    types.forEach(t => levels.forEach(l => metrics.forEach(m => result.push({key: `${t}_${l}_${m}`, type:t, level:l, metric:m}))));
    return result;
}
function escHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
function buildViewMatrixHTML(chapters, totals, fields, info) {
    let html = `
    <div id="matrix-view-content" style="background:white;padding:12px;border-radius:8px;">
        <div style="overflow-x:auto;max-height:50vh;border-radius:8px;border:1px solid #e2e8f0;">
            <table style="width:100%;border-collapse:collapse;font-size:11px;min-width:1400px;">
                <thead>
                    <tr style="background:#f8fafc;">
                        <th style="padding:8px;border:1px solid #e2e8f0;position:sticky;top:0;background:#f8fafc;z-index:2;">Chapter</th>
                        <th colspan="2" style="padding:6px;border:1px solid #e2e8f0;background:#dbeafe;color:#1e40af;position:sticky;top:0;z-index:2;">Pilgan Mudah</th>
                        <th colspan="2" style="padding:6px;border:1px solid #e2e8f0;background:#dbeafe;color:#1e40af;position:sticky;top:0;z-index:2;">Pilgan Sedang</th>
                        <th colspan="2" style="padding:6px;border:1px solid #e2e8f0;background:#dbeafe;color:#1e40af;position:sticky;top:0;z-index:2;">Pilgan Sulit</th>
                        <th colspan="2" style="padding:6px;border:1px solid #e2e8f0;background:#dcfce7;color:#166534;position:sticky;top:0;z-index:2;">Ceklist Mudah</th>
                        <th colspan="2" style="padding:6px;border:1px solid #e2e8f0;background:#dcfce7;color:#166534;position:sticky;top:0;z-index:2;">Ceklist Sedang</th>
                        <th colspan="2" style="padding:6px;border:1px solid #e2e8f0;background:#dcfce7;color:#166534;position:sticky;top:0;z-index:2;">Ceklist Sulit</th>
                        <th colspan="2" style="padding:6px;border:1px solid #e2e8f0;background:#fef3c7;color:#92400e;position:sticky;top:0;z-index:2;">Essay Mudah</th>
                        <th colspan="2" style="padding:6px;border:1px solid #e2e8f0;background:#fef3c7;color:#92400e;position:sticky;top:0;z-index:2;">Essay Sedang</th>
                        <th colspan="2" style="padding:6px;border:1px solid #e2e8f0;background:#fef3c7;color:#92400e;position:sticky;top:0;z-index:2;">Essay Sulit</th>
                    </tr>
                    <tr style="background:#fafafa;font-size:10px;">
                        <th style="padding:4px;border:1px solid #e2e8f0;"></th>
                        <th style="padding:3px;border:1px solid #e2e8f0;">Keluar</th><th style="padding:3px;border:1px solid #e2e8f0;">Bank</th>
                        <th style="padding:3px;border:1px solid #e2e8f0;">Keluar</th><th style="padding:3px;border:1px solid #e2e8f0;">Bank</th>
                        <th style="padding:3px;border:1px solid #e2e8f0;">Keluar</th><th style="padding:3px;border:1px solid #e2e8f0;">Bank</th>
                        <th style="padding:3px;border:1px solid #e2e8f0;">Keluar</th><th style="padding:3px;border:1px solid #e2e8f0;">Bank</th>
                        <th style="padding:3px;border:1px solid #e2e8f0;">Keluar</th><th style="padding:3px;border:1px solid #e2e8f0;">Bank</th>
                        <th style="padding:3px;border:1px solid #e2e8f0;">Keluar</th><th style="padding:3px;border:1px solid #e2e8f0;">Bank</th>
                        <th style="padding:3px;border:1px solid #e2e8f0;">Keluar</th><th style="padding:3px;border:1px solid #e2e8f0;">Bank</th>
                        <th style="padding:3px;border:1px solid #e2e8f0;">Keluar</th><th style="padding:3px;border:1px solid #e2e8f0;">Bank</th>
                        <th style="padding:3px;border:1px solid #e2e8f0;">Keluar</th><th style="padding:3px;border:1px solid #e2e8f0;">Bank</th>
                    </tr>
                </thead>
                <tbody>`;
    
    chapters.forEach((ch, i) => {
        const d = ch.data || {};
        const bg = i % 2 === 0 ? 'background:#fff;' : 'background:#f8fafc;';
        html += `<tr style="${bg}">
            <td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:600;">${escHTML(ch.name)}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.pilgan_mudah_keluar||0}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.pilgan_mudah_bank||0}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.pilgan_sedang_keluar||0}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.pilgan_sedang_bank||0}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.pilgan_sulit_keluar||0}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.pilgan_sulit_bank||0}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.ceklist_mudah_keluar||0}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.ceklist_mudah_bank||0}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.ceklist_sedang_keluar||0}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.ceklist_sedang_bank||0}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.ceklist_sulit_keluar||0}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.ceklist_sulit_bank||0}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.essay_mudah_keluar||0}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.essay_mudah_bank||0}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.essay_sedang_keluar||0}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.essay_sedang_bank||0}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.essay_sulit_keluar||0}</td>
            <td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">${d.essay_sulit_bank||0}</td>
        </tr>`;
    });
    
    // Total row
    html += `<tr style="background:#f1f5f9;font-weight:700;">
        <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">TOTAL</td>`;
    fields.forEach(f => {
        html += `<td style="padding:6px;border:1px solid #e2e8f0;text-align:center;font-weight:700;">${totals[f.key]||0}</td>`;
    });
    html += `</tr></tbody></table></div></div>`;
    
    return html;
}

// Download matrix sebagai gambar PNG
// Download matrix - Preview gambar di tab baru
async function downloadMatrixAsImage() {
    Swal.fire({
        title: 'Membuat preview...',
        text: 'Mohon tunggu sebentar',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
    });
    
    try {
        const sourceContent = document.getElementById('matrix-view-content');
        if (!sourceContent) {
            throw new Error('Konten matrix tidak ditemukan');
        }
        
        const mapel = ACTIVE_USER?.mapel || 'Mapel';
        const level = ACTIVE_USER?.level || 'X';
        const guru = ACTIVE_USER?.nama || 'Guru';
        const tanggal = new Date().toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        
        // Ambil tabel dari source content
        const table = sourceContent.querySelector('table');
        if (!table) {
            throw new Error('Tabel tidak ditemukan');
        }
        
        // Clone tabel
        const clonedTable = table.cloneNode(true);
        
        // Build halaman preview lengkap dengan styling INLINE
        const previewHTML = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Matrix ${mapel} - Kelas ${level}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            background: #f8fafc;
            padding: 24px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .preview-card {
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            padding: 24px;
            max-width: 100%;
            overflow-x: auto;
            border: 1px solid #e2e8f0;
        }
        
        .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 2px solid #e2e8f0;
        }
        .header h1 {
            font-size: 18px;
            color: #1e293b;
            margin-bottom: 6px;
        }
        .header .info {
            font-size: 13px;
            color: #64748b;
        }
        .header .info span {
            margin: 0 8px;
        }
        .header .badge {
            display: inline-block;
            background: #dcfce7;
            color: #059669;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            min-width: 1300px;
        }
        th, td {
            border: 1px solid #cbd5e1;
            padding: 5px 6px;
            text-align: center;
            vertical-align: middle;
        }
        th {
            background: #f1f5f9;
            font-weight: 600;
            color: #475569;
            font-size: 10px;
        }
        .group-pilgan { background: #dbeafe; color: #1e40af; }
        .group-ceklist { background: #dcfce7; color: #166534; }
        .group-essay { background: #fef3c7; color: #92400e; }
        .total-row { background: #f1f5f9; font-weight: 700; }
        .total-row td { font-weight: 700; }
        td:first-child { font-weight: 600; text-align: left; }
        tr:nth-child(even) { background: #f8fafc; }
        tr:hover { background: #f1f5f9; }
        
        .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            font-size: 11px;
            color: #94a3b8;
        }
        .download-btn {
            display: inline-block;
            margin-top: 16px;
            padding: 10px 20px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
        }
        .download-btn:hover {
            background: #1d4ed8;
        }
        .hint {
            text-align: center;
            margin-top: 16px;
            font-size: 12px;
            color: #64748b;
            background: #f8fafc;
            padding: 10px 16px;
            border-radius: 8px;
            border: 1px dashed #cbd5e1;
        }
        
        @media print {
            body { background: white; padding: 0; }
            .preview-card { box-shadow: none; border-radius: 0; padding: 16px; }
            .download-btn { display: none; }
            .hint { display: none; }
            @page { size: landscape; margin: 8mm; }
        }
    </style>
</head>
<body>
    <div class="preview-card">
        <div class="header">
            <h1>📋 Matrix Pemetaan Soal</h1>
            <p class="info">
                <strong>${mapel}</strong>
                <span>·</span>
                Kelas ${level}
                <span>·</span>
                ${guru}
            </p>
            <p class="info" style="margin-top:4px;font-size:11px;">
                ${tanggal}
                <span>·</span>
                <span class="badge">✅ Approved</span>
            </p>
        </div>
        
        ${clonedTable.outerHTML}
        
        <div class="footer">
            <p>Dicetak dari Sistem PSAT SMP Al Abidin</p>
        </div>
    </div>
    
    <div class="hint">
        💡 <strong>Tips:</strong> Klik kanan pada tabel → <strong>"Save Image as..."</strong> atau tekan <strong>Ctrl+P</strong> → <strong>Save as PDF</strong>
    </div>
    
    <button class="download-btn" onclick="window.print()">
        🖨️ Print / Save as PDF
    </button>
    
    <script>
        // Hapus atribut style bawaan dari tabel clone
        document.querySelectorAll('table [style]').forEach(el => {
            // Keep necessary styles
        });
    <\\/script>
</body>
</html>`;
        
        // Buka di tab baru
        const printWindow = window.open('', '_blank', 'width=1400,height=900');
        if (!printWindow) {
            throw new Error('Popup diblokir browser');
        }
        
        printWindow.document.write(previewHTML);
        printWindow.document.close();
        
        Swal.fire({
            title: 'Preview Dibuka! ✨',
            html: `
                <p>Matrix ditampilkan di <strong>tab baru</strong> dengan tampilan rapi.</p>
                <div style="background:#f8fafc;border-radius:8px;padding:12px;margin-top:12px;text-align:left;font-size:12px;color:#64748b;border:1px dashed #cbd5e1;">
                    <strong>💡 Cara menyimpan:</strong><br>
                    • Klik kanan tabel → <strong>Save Image as...</strong><br>
                    • Atau klik <strong>Print/Save as PDF</strong>
                </div>
            `,
            icon: 'success',
            timer: 5000,
            showConfirmButton: true,
            confirmButtonText: 'OK',
            confirmButtonColor: '#2563eb'
        });
        
    } catch (e) {
        console.error('❌ Error:', e);
        Swal.fire({
            title: 'Gagal Membuka Preview',
            text: e.message || 'Terjadi kesalahan. Silakan coba Download CSV.',
            icon: 'error',
            confirmButtonColor: '#16a34a',
            confirmButtonText: 'Download CSV',
            showCancelButton: true,
            cancelButtonText: 'Tutup'
        }).then((result) => {
            if (result.isConfirmed) {
                const chapters = MATRIX_STATE?.chapters || [];
                const fields = typeof getMatrixFields === 'function' ? getMatrixFields() : [];
                const totals = {};
                fields.forEach(f => {
                    totals[f.key] = chapters.reduce((sum, ch) => sum + (ch.data?.[f.key] || 0), 0);
                });
                downloadMatrixCSV(chapters, totals, fields, { mapel: ACTIVE_USER?.mapel, level: ACTIVE_USER?.level });
            }
        });
    }
}

// Download CSV
function downloadMatrixCSV(chapters, totals, fields, info) {
    let csv = '\uFEFFChapter,' + fields.map(f => f.key.replace(/_/g, ' ')).join(',') + '\n';
    
    chapters.forEach(ch => {
        const d = ch.data || {};
        csv += `"${ch.name}",` + fields.map(f => d[f.key] || 0).join(',') + '\n';
    });
    
    csv += 'TOTAL,' + fields.map(f => totals[f.key] || 0).join(',') + '\n';
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Matrix_${info?.mapel || 'Mapel'}_Kelas${info?.level || 'X'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    Swal.fire({
        title: 'Berhasil!',
        text: 'CSV matrix berhasil didownload.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
    });
}

// ==================== TABEL ADMIN ====================

function applyAdminFilters() {
    const levelF  = document.getElementById('admin-filter-level').value;
    const mapelF  = document.getElementById('admin-filter-mapel').value;
    const statusF = document.getElementById('admin-filter-status').value;
    const searchF = document.getElementById('admin-search').value.toLowerCase();

    let filtered = ADMIN_DATA.filter(row => {
        const matchLevel  = levelF  === 'all' || row.level.toString() === levelF;
        const matchMapel  = mapelF  === 'all' || row.mapel === mapelF;
        const matchStatus = statusF === 'all' || row.soalStatus === statusF;
        const matchSearch = !searchF ||
            row.guru.toLowerCase().includes(searchF) ||
            row.mapel.toLowerCase().includes(searchF) ||
            (row.unit || "").toLowerCase().includes(searchF);
        return matchLevel && matchMapel && matchStatus && matchSearch;
    });

    filtered.sort((a, b) => a.level !== b.level ? a.level - b.level : a.mapel.localeCompare(b.mapel));

    let html = '';
    filtered.forEach((row, index) => {
        const statusBadge = getAdminStatusBadge(row.soalStatus);
        html += `<tr>
            <td>${index + 1}</td>
            <td><strong>${row.level}</strong></td>
            <td>${row.mapel}</td>
            <td>${row.guru}</td>
            <td><span class="unit-badge">${row.unit || '-'}</span></td>
            <td>${renderAdminMatrixCell(row)}</td>
            <td>${renderAdminDocLink(row.soalLink,   'Soal', row.soalVersion)}</td>
            <td>${renderAdminDocLink(row.kisiLink,   'Kisi')}</td>
            <td>${renderAdminDocLink(row.glossLink,  'Glossary')}</td>
            <td><span class="badge-status ${statusBadge.class}">${statusBadge.text}</span></td>
            <td class="bank-info"><span class="bank-name">${row.bank     || '-'}</span></td>
            <td class="bank-info"><span class="rek-number">${row.rekening || '-'}</span></td>
        </tr>`;
    });

    document.getElementById('admin-table-body').innerHTML = html ||
        '<tr><td colspan="12" class="loading-placeholder">Tidak ada data yang cocok.</td></tr>';
}

function renderAdminMatrixCell(row) {
    if (row.matrixSubmitted && row.matrixLink === 'MATRIX_INPUT') {
        return `<button class="admin-link-btn" onclick="viewAdminMatrix('${row.guru}','${row.mapel}','${row.level}')" title="Lihat Matrix">
                    <i class="fas fa-table"></i> Lihat
                </button>`;
    }
    return renderAdminDocLink(row.matrixLink, 'Matrix');
}

async function viewAdminMatrix(guru, mapel, level) {
    await viewMatrixDetail(guru, mapel, level);
}

function renderAdminDocLink(link, type, version = null) {
    if (!link || link === 'MATRIX_INPUT') return '<span style="color: #cbd5e1;">-</span>';
    const versionText = version ? ` (v${version})` : '';
    return `<a href="${link}" target="_blank" class="admin-link-btn" title="Preview ${type}${versionText}">
                <i class="fas fa-eye"></i> Lihat
            </a>`;
}

function getAdminStatusBadge(status) {
    if (status === 'Approved')      return { class: 'badge-green', text: '✅ Approved' };
    if (status === 'Under Review')  return { class: 'badge-blue',  text: '🔵 Review'  };
    if (status === 'Needs Revision')return { class: 'badge-red',   text: '⚠️ Revisi'  };
    return { class: 'badge-gray', text: '📤 Belum' };
}