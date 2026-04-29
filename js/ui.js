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

const getFileIconWithDownload = (status, type, link, isSoal = false) => {
    let boxClass  = 'icon-empty';
    let titleText = 'Belum Upload';

    if      (status === 'blue')   { boxClass = 'icon-approved'; titleText = 'Tervalidasi / Final (Approved)'; }
    else if (status === 'green')  { boxClass = 'icon-review';   titleText = 'Sedang Direview (Under Review)'; }
    else if (status === 'yellow') { boxClass = 'icon-revision'; titleText = 'Perlu Revisi (Needs Revision)'; }

    let iconClass;
    if      (type === 'Matrix')                   iconClass = 'fa-file-excel';
    else if (type === 'Kisi-kisi' || type === 'Kisi') iconClass = 'fa-file-pdf';
    else if (type === 'Soal' || type === 'Glossary')  iconClass = 'fa-file-word';
    else                                           iconClass = 'fa-file';

    let downloadIcon = '';
    if (link) {
        let previewLink = link;
        if (link.includes('drive.google.com')) {
            const fileIdMatch = link.match(/\/d\/([^\/]+)/);
            if (fileIdMatch) previewLink = `https://drive.google.com/file/d/${fileIdMatch[1]}/view`;
        }
        if ((isSoal && status === 'blue') || !isSoal) {
            downloadIcon = `<div class="download-icon" onclick="event.stopPropagation(); window.open('${previewLink}', '_blank')" title="Preview & Download (Tidak bisa edit)"><i class="fas fa-download"></i></div>`;
        }
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
            <td style="text-align: center;">${getFileIconWithDownload(row.docs.Matrix,         'Matrix',   row.docLinks?.Matrix,          false)}</td>
            <td style="text-align: center;">${getFileIconWithDownload(row.docs.Soal,           'Soal',     row.docLinks?.Soal,            true)}</td>
            <td style="text-align: center;">${getFileIconWithDownload(row.docs['Kisi-kisi'],   'Kisi',     row.docLinks?.['Kisi-kisi'],   false)}</td>
            <td style="text-align: center;">${getFileIconWithDownload(row.docs.Glossary,       'Glossary', row.docLinks?.Glossary,        false)}</td>
        </tr>`;
    });

    document.getElementById('public-table-body').innerHTML = html ||
        '<tr><td colspan="8" class="loading-placeholder"><i class="fas fa-folder-open" style="font-size: 24px; margin-bottom: 10px; display: block;"></i> Tidak ada data yang cocok.</td></tr>';
}

// ==================== PANEL GURU ====================

function renderTeacherHeader() {
    const revisionCount = countRevisions();
    const headerLeft    = document.querySelector('#view-teacher .header-left');
    const existingBadge = document.querySelector('.notification-badge');
    if (existingBadge) existingBadge.remove();

    if (revisionCount > 0) {
        const badge = document.createElement('span');
        badge.className = 'notification-badge';
        badge.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${revisionCount} Dokumen Perlu Direvisi`;
        headerLeft.appendChild(badge);
    }

    document.getElementById('teacher-info').innerText =
        `${ACTIVE_USER.nama} • ${ACTIVE_USER.mapel} Kelas ${ACTIVE_USER.level} (${ACTIVE_USER.unit})`;
}

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
        { id: "Matrix",   title: "Matrix Pemetaan", ext: ".xlsx,.xls",  icon: "fa-file-excel", color: "text-emerald-500", versioned: false },
        { id: "Soal",     title: "Naskah Soal",     ext: ".doc,.docx",  icon: "fa-file-word",  color: "text-blue-600",   versioned: true  },
        { id: "Kisi-kisi",title: "Kisi-kisi Ujian", ext: ".pdf",        icon: "fa-file-pdf",   color: "text-red-500",    versioned: false },
        { id: "Glossary", title: "Glossary",         ext: ".pdf",        icon: "fa-file-word",  color: "text-blue-500",   versioned: false }
    ];

    let html = '';
    docs.forEach(d => {
        const status   = ACTIVE_USER.docs[d.id];
        const note     = ACTIVE_USER.notes[d.id];
        const docLink  = ACTIVE_USER.docLinks  ? ACTIVE_USER.docLinks[d.id]  : null;
        const version  = ACTIVE_USER.versions  ? ACTIVE_USER.versions[d.id]  : 1;
        const isApproved = (status === 'Approved');

        let badgeClass = "badge-gray";
        let statusText = "Belum Upload";
        let btnText    = "Pilih Data & Upload";
        let cardClass  = "";

        if      (status === "Under Review")   { badgeClass = "badge-blue";  statusText = "Sedang Direview"; btnText = "Upload Ulang"; }
        else if (status === "Needs Revision") { badgeClass = "badge-red";   statusText = "⚠️ PERLU REVISI!"; btnText = "Upload Revisi"; cardClass = "revision-pulse"; }
        else if (status === "Approved")       { badgeClass = "badge-green"; statusText = "✅ Tervalidasi / Final"; }

        const versionBadge = (d.versioned && status !== "Belum Upload")
            ? `<span class="version-badge"><i class="fas fa-code-branch"></i> v${version}</span>` : '';

        let noteHtml = "";
        if (note && status === "Needs Revision") {
            noteHtml = `<div class="teacher-note note-red"><strong><i class="fas fa-comment-dots"></i> Catatan Validator:</strong><br/>${note}</div>`;
        } else if (note && status === "Approved") {
            noteHtml = `<div class="teacher-note note-green"><strong><i class="fas fa-check-circle"></i> Catatan Validator:</strong><br/>${note}</div>`;
        }

        let uploadSection = '';

        if (isApproved) {
            uploadSection = `
                <div style="padding-top: 16px; margin-top: 16px; border-top: 1px solid #f1f5f9;">
                    ${docLink ? `
                        <button class="btn btn-info" style="width: 100%;" onclick="previewFile('${docLink}')">
                            <i class="fas fa-eye"></i> Lihat Dokumen Final ${d.versioned ? '(v' + version + ')' : ''}
                        </button>` : ''}
                    <div class="final-lock-message">
                        <i class="fas fa-lock"></i> Dokumen sudah final dan terkunci
                    </div>
                </div>`;
        } else {
            const hasUploaded  = (status !== "Belum Upload");
            const needsRevision = (status === "Needs Revision");

            if (d.versioned) {
                if (needsRevision && docLink) {
                    uploadSection = `
                        <div class="button-group">
                            <button class="btn btn-info"    onclick="previewFile('${docLink}')"><i class="fas fa-eye"></i> Lihat v${version}</button>
                            <button class="btn btn-warning" onclick="triggerFileUpload('${d.id}')"><i class="fas fa-upload"></i> Revisi</button>
                        </div>
                        <input type="file" id="up-${d.id}" accept="${d.ext}" style="display: none;" onchange="handleUploadWithConfirm('${d.id}', ${d.versioned}, '${d.title}')">`;
                } else if (hasUploaded && docLink) {
                    uploadSection = `
                        <div class="button-group">
                            <button class="btn btn-info"    onclick="previewFile('${docLink}')"><i class="fas fa-eye"></i> Lihat v${version}</button>
                            <button class="btn btn-outline" onclick="triggerFileUpload('${d.id}')"><i class="fas fa-sync"></i> Upload Ulang</button>
                        </div>
                        <input type="file" id="up-${d.id}" accept="${d.ext}" style="display: none;" onchange="handleUploadWithConfirm('${d.id}', ${d.versioned}, '${d.title}')">`;
                } else {
                    uploadSection = `
                        <div style="padding-top: 16px; margin-top: 16px; border-top: 1px solid #f1f5f9;">
                            <input type="file" id="up-${d.id}" accept="${d.ext}"
                                   style="font-size: 12px; margin-bottom: 12px; width: 100%; cursor: pointer;"
                                   onchange="handleUploadWithConfirm('${d.id}', ${d.versioned}, '${d.title}')">
                            <button class="btn btn-outline" style="width: 100%; border-color: #cbd5e1;"
                                    onclick="handleUploadButtonClick('${d.id}', ${d.versioned}, '${d.title}')">
                                <i class="fas fa-cloud-upload-alt"></i> ${btnText}
                            </button>
                        </div>`;
                }
            } else {
                if (hasUploaded && docLink) {
                    uploadSection = `
                        <div class="button-group">
                            <button class="btn btn-info"    onclick="previewFile('${docLink}')"><i class="fas fa-eye"></i> Lihat Dokumen</button>
                            <button class="btn btn-outline" onclick="triggerFileUpload('${d.id}')"><i class="fas fa-sync"></i> Upload Ulang</button>
                        </div>
                        <input type="file" id="up-${d.id}" accept="${d.ext}" style="display: none;" onchange="handleUploadWithConfirm('${d.id}', ${d.versioned}, '${d.title}')">`;
                } else {
                    uploadSection = `
                        <div style="padding-top: 16px; margin-top: 16px; border-top: 1px solid #f1f5f9;">
                            <input type="file" id="up-${d.id}" accept="${d.ext}"
                                   style="font-size: 12px; margin-bottom: 12px; width: 100%; cursor: pointer;"
                                   onchange="handleUploadWithConfirm('${d.id}', ${d.versioned}, '${d.title}')">
                            <button class="btn btn-outline" style="width: 100%; border-color: #cbd5e1;"
                                    onclick="handleUploadButtonClick('${d.id}', ${d.versioned}, '${d.title}')">
                                <i class="fas fa-cloud-upload-alt"></i> ${btnText}
                            </button>
                        </div>`;
                }
            }
        }

        html += `<div class="upload-card ${cardClass}">
            <div style="display: flex; gap: 16px; margin-bottom: 12px;">
                <div style="font-size: 32px;" class="${d.color}">
                    <i class="fas ${d.icon}"></i>
                </div>
                <div style="flex: 1;">
                    <h3 style="font-size: 15px; font-weight: 600; color: #0f172a; display: flex; align-items: center; justify-content: space-between;">
                        ${d.title}
                        ${versionBadge}
                    </h3>
                    <span class="badge-status ${badgeClass}">${statusText}</span>
                </div>
            </div>
            ${noteHtml}
            ${uploadSection}
        </div>`;
    });

    document.getElementById('upload-cards').innerHTML = html;
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
            <td>${renderAdminDocLink(row.matrixLink, 'Matrix')}</td>
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

function renderAdminDocLink(link, type, version = null) {
    if (!link) return '<span style="color: #cbd5e1;">-</span>';
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
