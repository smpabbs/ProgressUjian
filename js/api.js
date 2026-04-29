// ==================== UTILITY ====================

/**
 * Format nomor WA ke format 62xxxxxxxxx
 */
function formatWA(val) {
    if (!val) return '';
    let num = val.replace(/\D/g, '');
    if (num.startsWith('0'))  num = num.substring(1);
    if (num.startsWith('62')) num = num.substring(2);
    return '62' + num;
}

/**
 * Validasi ekstensi file sesuai jenis dokumen
 */
function validateFileType(file, docType) {
    const fileName = file.name.toLowerCase();
    const allowed  = ALLOWED_EXTENSIONS[docType] || [];
    for (let ext of allowed) {
        if (fileName.endsWith(ext)) return { valid: true };
    }
    return {
        valid: false,
        message: `File harus berekstensi ${allowed.join(' atau ')}`
    };
}

/**
 * Download file melalui link
 */
function downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href     = url;
    link.download = filename || '';
    link.target   = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Buka file dalam mode preview Google Drive (bukan mode edit)
 */
function previewFile(link) {
    if (!link) return;
    let previewLink = link;
    if (link.includes('drive.google.com')) {
        const fileIdMatch = link.match(/\/d\/([^\/]+)/);
        if (fileIdMatch) {
            previewLink = `https://drive.google.com/file/d/${fileIdMatch[1]}/view`;
        }
    }
    window.open(previewLink, '_blank');
}

// ==================== CORE API ====================

/**
 * Kirim request ke Google Apps Script backend
 * @param {string} action - nama action yang akan dijalankan
 * @param {object} data   - payload data
 * @returns {object} response JSON dari server
 */
async function sendRequest(action, data) {
    try {
        const response = await fetch(API_URL, {
            method  : "POST",
            redirect: "follow",
            headers : { "Content-Type": "text/plain;charset=utf-8" },
            body    : JSON.stringify({ action, data })
        });
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        return { success: false, message: "Gagal terhubung ke server" };
    }
}

// ==================== REGISTRASI ====================

async function submitRegister() {
    const waRaw   = document.getElementById('reg-wa').value;
    const nama    = document.getElementById('reg-nama').value;
    const level   = document.getElementById('reg-level').value;
    const subject = document.getElementById('reg-subject').value;
    const unit    = document.getElementById('reg-unit').value;
    const bank    = document.getElementById('reg-bank').value;
    const rekening = document.getElementById('reg-rek').value;

    if (!waRaw)   return Swal.fire('Oops', 'Nomor WhatsApp wajib diisi!', 'warning');
    if (!nama)    return Swal.fire('Oops', 'Nama lengkap wajib diisi!', 'warning');
    if (!level)   return Swal.fire('Oops', 'Level/Kelas wajib dipilih!', 'warning');
    if (!subject) return Swal.fire('Oops', 'Mata Pelajaran wajib dipilih!', 'warning');
    if (!unit)    return Swal.fire('Oops', 'Unit wajib dipilih!', 'warning');

    const waNumber = formatWA(waRaw);
    if (waNumber.length < 10)
        return Swal.fire('Oops', 'Nomor WhatsApp tidak valid! Minimal 10 digit.', 'warning');

    const payload = {
        nama    : nama.trim(),
        level, subject, unit,
        whatsapp: waNumber,
        bank    : bank     ? bank.trim()     : '',
        rekening: rekening ? rekening.trim() : ''
    };

    Swal.fire({ title: 'Menyimpan data...', text: 'Mohon tunggu sebentar',
                allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const res = await sendRequest("register", payload);
        if (res.success) {
            await Swal.fire({
                title: 'Registrasi Berhasil!',
                text : 'Data Anda telah tersimpan. Silakan login untuk mengunggah dokumen.',
                icon : 'success', confirmButtonText: 'OK', confirmButtonColor: '#10b981'
            });
            closeModal('modal-register');
            ['reg-nama','reg-level','reg-subject','reg-unit','reg-wa','reg-bank','reg-rek']
                .forEach(id => document.getElementById(id).value = '');
        } else {
            Swal.fire({ title: 'Registrasi Gagal',
                        text: res.message || 'Terjadi kesalahan pada server. Silakan coba lagi.',
                        icon: 'error', confirmButtonText: 'Mengerti' });
        }
    } catch (error) {
        console.error('Register error:', error);
        Swal.fire({ title: 'Koneksi Gagal',
                    text: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
                    icon: 'error', confirmButtonText: 'Mengerti' });
    }
}

// ==================== LOGIN GURU ====================

async function submitLogin() {
    const waRaw = document.getElementById('login-wa').value;
    const mapel = document.getElementById('login-mapel').value;

    if (!waRaw || !mapel)
        return Swal.fire('Oops', 'Isi Nomor WA dan pilih Mapel!', 'warning');

    const payload = { whatsapp: formatWA(waRaw), mapel };

    Swal.fire({ title: 'Memverifikasi...', allowOutsideClick: false,
                didOpen: () => Swal.showLoading() });

    const res = await sendRequest("login", payload);

    if (res.success) {
        Swal.close();
        ACTIVE_USER          = res;
        ACTIVE_USER.whatsapp = payload.whatsapp;

        document.getElementById('view-public').classList.add('hidden');
        document.getElementById('footer-copyright').classList.add('hidden');
        closeModal('modal-login');
        document.getElementById('view-teacher').classList.remove('hidden');

        renderTeacherHeader();
        renderUploadCards();
        checkAndShowRevisionNotification();
    } else {
        Swal.fire('Ditolak', 'Kombinasi WA dan Mapel tidak ditemukan.', 'error');
    }
}

/**
 * Refresh data guru yang sedang login (dipakai setelah upload)
 */
async function refreshTeacherData() {
    if (!ACTIVE_USER) return;
    const payload = { whatsapp: ACTIVE_USER.whatsapp, mapel: ACTIVE_USER.mapel };
    const res = await sendRequest("login", payload);
    if (res.success) {
        ACTIVE_USER          = res;
        ACTIVE_USER.whatsapp = payload.whatsapp;
    }
}

// ==================== UPLOAD DOKUMEN ====================

function triggerFileUpload(type) {
    document.getElementById('up-' + type).click();
}

function handleUploadButtonClick(type, versioned, title) {
    const fileInput = document.getElementById('up-' + type);
    if (!fileInput.files || fileInput.files.length === 0) {
        Swal.fire('Oops', 'Pilih file terlebih dahulu!', 'warning');
        return;
    }
    handleUploadWithConfirm(type, versioned, title);
}

async function handleUploadWithConfirm(type, versioned, title) {
    const fileInput = document.getElementById('up-' + type);
    const file = fileInput.files[0];

    if (!file) return Swal.fire('Oops', 'Pilih file terlebih dahulu!', 'warning');

    const validation = validateFileType(file, type);
    if (!validation.valid) {
        fileInput.value = '';
        return Swal.fire({ title: 'Format File Tidak Sesuai', text: validation.message,
                           icon: 'error', confirmButtonText: 'Mengerti' });
    }

    if (versioned) {
        const currentStatus  = ACTIVE_USER.docs[type];
        const currentVersion = ACTIVE_USER.versions ? ACTIVE_USER.versions[type] : 0;

        const confirmText = currentStatus === 'Belum Upload'
            ? `Anda akan mengunggah ${title} versi 1. Lanjutkan?`
            : `Anda akan mengunggah revisi ${title}. File versi ${currentVersion} akan dihapus permanen dan diganti dengan versi ${currentVersion + 1}. Lanjutkan?`;

        const result = await Swal.fire({
            title: 'Konfirmasi Upload', text: confirmText, icon: 'question',
            showCancelButton: true, confirmButtonText: 'Ya, Lanjutkan',
            cancelButtonText: 'Batal', confirmButtonColor: '#2563eb'
        });

        if (!result.isConfirmed) { fileInput.value = ''; return; }
    }

    performUpload(type, file);
}

function performUpload(type, file) {
    const reader = new FileReader();

    reader.onload = async (e) => {
        const payload = {
            base64  : e.target.result.split(',')[1],
            fileName: file.name,
            mimeType: file.type,
            type,
            nama : ACTIVE_USER.nama,
            mapel: ACTIVE_USER.mapel,
            level: ACTIVE_USER.level
        };

        Swal.fire({ title: 'Mengunggah...', allowOutsideClick: false,
                    didOpen: () => Swal.showLoading() });

        const res = await sendRequest("upload", payload);

        if (res.success) {
            let successMsg = res.newVersion
                ? `File berhasil diunggah sebagai versi ${res.newVersion}`
                : 'File berhasil diunggah';

            await refreshTeacherData();

            Swal.fire({ title: 'Sukses!',
                        text: successMsg + ' dan sedang dalam antrian review.',
                        icon: 'success', confirmButtonText: 'OK' });

            renderTeacherHeader();
            renderUploadCards();

            const fileInput = document.getElementById('up-' + type);
            if (fileInput) fileInput.value = '';
        } else {
            Swal.fire('Error', res.message || 'Gagal mengunggah file', 'error');
        }
    };

    reader.readAsDataURL(file);
}

// ==================== VALIDATOR ====================

async function submitValLogin() {
    const username = document.getElementById('val-user').value;
    const password = document.getElementById('val-pass').value;

    if (!username || !password)
        return Swal.fire('Perhatian', 'Harap isi username dan password validator.', 'warning');

    Swal.fire({ title: 'Otentikasi...', allowOutsideClick: false,
                didOpen: () => Swal.showLoading() });

    const res = await sendRequest("validatorLogin", { username, password });

    if (res.success) {
        Swal.close();
        document.getElementById('view-public').classList.add('hidden');
        document.getElementById('footer-copyright').classList.add('hidden');
        closeModal('modal-val-login');
        document.getElementById('view-validator').classList.remove('hidden');
        loadValidationData();
    } else {
        Swal.fire('Gagal', res.message || 'Username atau password salah!', 'error');
    }
}

async function loadValidationData() {
    Swal.fire({ title: 'Memuat data...', allowOutsideClick: false,
                didOpen: () => Swal.showLoading() });

    const res = await sendRequest("getValidationData", {});

    if (res.success) {
        let html = '';
        res.data.forEach(d => {
            let badgeClass = "badge-blue";
            let statusText = "Review";
            if (d.status === "Approved")      { badgeClass = "badge-green"; statusText = "Approved"; }
            else if (d.status === "Needs Revision") { badgeClass = "badge-red";   statusText = "Revisi"; }

            const versionBadge = d.version ? `<span class="version-badge">v${d.version}</span>` : '';
            const rowBg = d.status === 'Under Review'   ? 'background: #fffbeb;'
                        : d.status === 'Needs Revision' ? 'background: #fef2f2;' : '';
            const dataStr = JSON.stringify(d).replace(/'/g, "&#39;").replace(/"/g, '&quot;');

            html += `<tr style="${rowBg}">
                <td>${d.timestamp}</td>
                <td>
                    <div><strong>${d.mapel}</strong> ${versionBadge}</div>
                    <div style="font-size:12px; color:#64748b;">Kelas ${d.level}</div>
                </td>
                <td>${d.guru}</td>
                <td><span class="badge-status ${badgeClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-outline" style="padding: 6px 12px; font-size: 12px;"
                            onclick='openValidationModal(${dataStr})'>
                        <i class="fas fa-edit"></i> Periksa
                    </button>
                </td>
            </tr>`;
        });

        document.getElementById('validator-table-body').innerHTML = html ||
            '<tr><td colspan="5" class="loading-placeholder">Belum ada dokumen naskah soal yang diunggah.</td></tr>';
        Swal.close();
    } else {
        Swal.fire('Error', 'Gagal memuat data validasi', 'error');
    }
}

function openValidationModal(data) {
    CURRENT_VAL_DOC = data;
    const versionInfo = data.version ? ` (v${data.version})` : '';
    document.getElementById('val-doc-info').innerHTML =
        `<strong>${data.mapel} (Kls ${data.level})</strong> - ${data.jenis}${versionInfo}<br/>Guru: ${data.guru}`;
    document.getElementById('val-btn-drive').href = data.link;
    document.getElementById('val-status').value   = data.status  || "Under Review";
    document.getElementById('val-note').value     = data.catatan || "";
    openModal('modal-validation');
}

async function submitValidation() {
    const payload = {
        row    : CURRENT_VAL_DOC.row,
        status : document.getElementById('val-status').value,
        catatan: document.getElementById('val-note').value
    };

    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false,
                didOpen: () => Swal.showLoading() });

    const res = await sendRequest("updateValidation", payload);

    if (res.success) {
        Swal.fire('Disimpan', 'Status berhasil diperbarui.', 'success');
        closeModal('modal-validation');
        loadValidationData();
    } else {
        Swal.fire('Error', res.message || 'Gagal menyimpan', 'error');
    }
}

// ==================== ADMIN ====================

function openDriveFolder(type) {
    const folderId = DRIVE_FOLDER_IDS[type];
    if (folderId) window.open(`https://drive.google.com/drive/folders/${folderId}`, '_blank');
}

async function submitAdminLogin() {
    const username = document.getElementById('admin-user').value;
    const password = document.getElementById('admin-pass').value;

    if (!username || !password)
        return Swal.fire('Perhatian', 'Harap isi username dan password.', 'warning');

    Swal.fire({ title: 'Otentikasi...', allowOutsideClick: false,
                didOpen: () => Swal.showLoading() });

    const res = await sendRequest("adminLogin", { username, password });

    if (res.success) {
        Swal.close();
        document.getElementById('view-public').classList.add('hidden');
        document.getElementById('footer-copyright').classList.add('hidden');
        closeModal('modal-admin-login');
        document.getElementById('view-admin').classList.remove('hidden');
        loadAdminData();
    } else {
        Swal.fire('Gagal', res.message || 'Username atau password salah!', 'error');
    }
}

async function loadAdminData() {
    Swal.fire({ title: 'Memuat data...', allowOutsideClick: false,
                didOpen: () => Swal.showLoading() });

    const res = await sendRequest("getAdminData", {});

    if (res.success) {
        ADMIN_DATA = res.data;
        applyAdminFilters();
        Swal.close();
    } else {
        Swal.fire('Error', 'Gagal memuat data admin', 'error');
    }
}

function exportToExcel() {
    if (!ADMIN_DATA || ADMIN_DATA.length === 0)
        return Swal.fire('Oops', 'Tidak ada data untuk diexport.', 'warning');

    let csv = 'No,Level,Mapel,Guru,Unit,Link Matrix,Link Soal (Versi),Link Kisi,Link Glossary,Status Soal,Bank,No Rekening\n';

    ADMIN_DATA.forEach((row, index) => {
        const versionInfo = row.soalVersion ? `v${row.soalVersion}` : '';
        const rowData = [
            index + 1, row.level,
            `"${row.mapel}"`, `"${row.guru}"`, `"${row.unit || ''}"`,
            row.matrixLink || '',
            row.soalLink ? `${row.soalLink} (${versionInfo})` : '',
            row.kisiLink  || '', row.glossLink || '',
            row.soalStatus || 'Belum Upload',
            `"${row.bank     || ''}"`, `"${row.rekening || ''}"`
        ];
        csv += rowData.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url  = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `PSAT_Data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire('Sukses', 'Data berhasil diexport ke CSV.', 'success');
}
