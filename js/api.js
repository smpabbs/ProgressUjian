// ==================== UTILITY ====================


function formatWA(val) {
    if (!val) return '';
    let num = val.replace(/\D/g, '');
    if (num.startsWith('0'))  num = num.substring(1);
    if (num.startsWith('62')) num = num.substring(2);
    return '62' + num;
}

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

function downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href     = url;
    link.download = filename || '';
    link.target   = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

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

async function sendRequest(action, data) {
    console.log('📤 Sending request:', action, data);
    
    try {
        const response = await fetch(API_URL, {
            method  : "POST",
            redirect: "follow",
            headers : { "Content-Type": "text/plain;charset=utf-8" },
            body    : JSON.stringify({ action, data })
        });
        
        console.log('📥 Response status:', response.status);
        
        const text = await response.text();
        console.log('📥 Response text:', text);
        
        try {
            const json = JSON.parse(text);
            console.log('📥 Response JSON:', json);
            return json;
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError);
            console.error('❌ Raw text:', text);
            return { success: false, message: "Response bukan JSON: " + text.substring(0, 200) };
        }
    } catch (error) {
        console.error("❌ Fetch Error:", error);
        return { success: false, message: "Gagal terhubung ke server: " + error.message };
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
    if (!bank)    return Swal.fire('Oops', 'Bank wajib dipilih!', 'warning');
    if (!rekening) return Swal.fire('Oops', 'No Rekening wajib diisi!', 'warning');

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

    Swal.fire({ title: 'Menyimpan data...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    const res = await sendRequest("register", payload);
    
    console.log('Register response:', res);
    
    if (res.success) {
        await Swal.fire({
            title: 'Registrasi Berhasil!',
            text : 'Data Anda telah tersimpan. Silakan login.',
            icon : 'success', confirmButtonText: 'OK', confirmButtonColor: '#10b981'
        });
        closeModal('modal-register');
    } else {
        Swal.fire({ title: 'Registrasi Gagal', text: res.message || 'Error', icon: 'error' });
    }
}

// ==================== LOGIN GURU ====================

async function submitLogin() {
    const waRaw = document.getElementById('login-wa').value;
    const mapel = document.getElementById('login-mapel').value;

    console.log('🔑 Login attempt - WA:', waRaw, 'Mapel:', mapel);

    if (!waRaw || !mapel) {
        console.log('❌ WA atau Mapel kosong');
        return Swal.fire('Oops', 'Isi Nomor WA dan pilih Mapel!', 'warning');
    }

    const waNumber = formatWA(waRaw);
    console.log('🔑 Formatted WA:', waNumber);
    
    const payload = { whatsapp: waNumber, mapel };
    console.log('🔑 Payload:', payload);
    console.log('🔑 API_URL:', API_URL);

    Swal.fire({ 
        title: 'Memverifikasi...', 
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading() 
    });

    const res = await sendRequest("login", payload);
    
    console.log('🔑 Login response:', res);
    
    Swal.close();

    if (res.success) {
        console.log('✅ Login berhasil!');
        ACTIVE_USER          = res;
        ACTIVE_USER.whatsapp = waNumber;
        MATRIX_STATE.isSubmitted = res.matrixSubmitted || false;

        document.getElementById('view-public').classList.add('hidden');
        document.getElementById('footer-copyright').classList.add('hidden');
        closeModal('modal-login');
        document.getElementById('view-teacher').classList.remove('hidden');

        await renderTeacherHeader();  // ← tambah await karena sekarang async
// renderUploadCards() sudah dipanggil di dalam renderTeacherHeader
checkAndShowRevisionNotification();
    } else {
        console.log('❌ Login gagal:', res.message);
        Swal.fire('Ditolak', res.message || 'Kombinasi WA dan Mapel tidak ditemukan.', 'error');
    }
}

async function refreshTeacherData() {
    if (!ACTIVE_USER) return;
    const payload = { whatsapp: ACTIVE_USER.whatsapp, mapel: ACTIVE_USER.mapel };
    const res = await sendRequest("login", payload);
    if (res.success) {
        ACTIVE_USER          = res;
        ACTIVE_USER.whatsapp = payload.whatsapp;
        MATRIX_STATE.isSubmitted = res.matrixSubmitted || false;
    }
}

// ==================== UPLOAD ====================

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
        return Swal.fire({ title: 'Format File Tidak Sesuai', text: validation.message, icon: 'error' });
    }

    if (versioned) {
        const currentVersion = ACTIVE_USER.versions ? ACTIVE_USER.versions[type] : 0;
        const confirmText = `Anda akan mengunggah revisi. Versi ${currentVersion} → ${currentVersion + 1}. Lanjutkan?`;
        const result = await Swal.fire({
            title: 'Konfirmasi Upload', text: confirmText, icon: 'question',
            showCancelButton: true, confirmButtonText: 'Ya', cancelButtonText: 'Batal'
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

        Swal.fire({ title: 'Mengunggah...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        const res = await sendRequest("upload", payload);

        if (res.success) {
            await refreshTeacherData();
            Swal.fire('Sukses!', 'File berhasil diunggah.', 'success');
            renderTeacherHeader();
            renderUploadCards();
            const fileInput = document.getElementById('up-' + type);
            if (fileInput) fileInput.value = '';
        } else {
            Swal.fire('Error', res.message || 'Gagal', 'error');
        }
    };
    reader.readAsDataURL(file);
}

// ==================== MATRIX API ====================

async function fetchPatokan(mapel) {
    const res = await sendRequest("getPatokan", { mapel });
    return res.success ? res.data : null;
}

async function saveMatrixToServer(chapters) {
    const payload = {
        whatsapp: ACTIVE_USER.whatsapp,
        level: ACTIVE_USER.level,
        mapel: ACTIVE_USER.mapel,
        guru: ACTIVE_USER.nama,
        unit: ACTIVE_USER.unit,
        chapters: chapters
    };
    return await sendRequest("saveMatrix", payload);
}

async function fetchMatrix() {
    const payload = {
        whatsapp: ACTIVE_USER.whatsapp,
        level: ACTIVE_USER.level.toString(),
        mapel: ACTIVE_USER.mapel
    };
    const res = await sendRequest("getMatrix", payload);
    return res.success ? res.data : [];
}
/**
 * Ambil matrix untuk public view (tanpa login)
 */
async function fetchPublicMatrix(guru, mapel, level) {
    const res = await sendRequest("getPublicMatrix", { guru, mapel, level });
    return res;
}
async function fetchMatrixForAdmin() {
    const res = await sendRequest("getMatrixForAdmin", {});
    return res.success ? res.data : [];
}
// ==================== SOAL API ====================

/**
 * Ambil semua soal yang sudah diinput guru
 */
async function fetchSoals() {
    const payload = {
        whatsapp: ACTIVE_USER.whatsapp,
        level: ACTIVE_USER.level.toString(),
        mapel: ACTIVE_USER.mapel
    };
    const res = await sendRequest("getSoals", payload);
    return res.success ? res.data : [];
}

/**
 * Simpan 1 soal (create/update)
 */
async function saveSoalToServer(soalData) {
    const payload = {
        whatsapp: ACTIVE_USER.whatsapp,
        level: ACTIVE_USER.level,
        mapel: ACTIVE_USER.mapel,
        guru: ACTIVE_USER.nama,
        soal: soalData
    };
    return await sendRequest("saveSoal", payload);
}

/**
 * Submit semua soal ke validator
 */
async function submitAllSoals() {
    const payload = {
        whatsapp: ACTIVE_USER.whatsapp,
        level: ACTIVE_USER.level.toString(),
        mapel: ACTIVE_USER.mapel
    };
    return await sendRequest("submitSoals", payload);
}

/**
 * Ambil soal untuk validator
 */
async function fetchSoalsForValidation(guru, mapel, level) {
    const res = await sendRequest("getSoalsForValidation", { guru, mapel, level });
    return res.success ? res.data : [];
}

/**
 * Update status validasi 1 soal
 */
async function updateSoalValidation(soalId, status, comment) {
    return await sendRequest("updateSoalValidation", { soalId, status, comment });
}

/**
 * Upload gambar soal ke Drive
 */
async function uploadSoalImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const payload = {
                base64: e.target.result.split(',')[1],
                fileName: file.name,
                mimeType: file.type
            };
            const res = await sendRequest("uploadSoalImage", payload);
            resolve(res);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Generate Word dari soal yang sudah diinput
 */
async function generateWordSoal() {
    const payload = {
        whatsapp: ACTIVE_USER.whatsapp,
        level: ACTIVE_USER.level.toString(),
        mapel: ACTIVE_USER.mapel
    };
    return await sendRequest("generateSoalWord", payload);
}
/**
 * Submit batch validation (validator kirim hasil review)
 */
async function submitBatchValidation(guru, mapel, level) {
    const payload = { guru, mapel, level };
    return await sendRequest("submitBatchValidation", payload);
}

/**
 * Submit revisi soal (guru kirim revisi ke validator)
 */
async function submitRevisi() {
    const payload = {
        whatsapp: ACTIVE_USER.whatsapp,
        level: ACTIVE_USER.level.toString(),
        mapel: ACTIVE_USER.mapel
    };
    return await sendRequest("submitRevisi", payload);
}

/**
 * Ambil soal untuk validator dengan filter
 */
async function fetchSoalsForValidationFiltered(guru, mapel, level, filter = 'all') {
    const res = await sendRequest("getSoalsForValidation", { guru, mapel, level, filter });
    return res.success ? res.data : [];
}
// ==================== VALIDATOR ====================

async function submitValLogin() {
    const username = document.getElementById('val-user').value;
    const password = document.getElementById('val-pass').value;
    if (!username || !password) return Swal.fire('Perhatian', 'Isi username dan password.', 'warning');

    Swal.fire({ title: 'Otentikasi...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
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
    Swal.fire({ title: 'Memuat...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const res = await sendRequest("getValidationData", {});
    if (res.success) {
        let html = '';
        res.data.forEach(d => {
            let badgeClass = d.status === "Approved" ? "badge-green" : d.status === "Needs Revision" ? "badge-red" : "badge-blue";
            let statusText = d.status === "Approved" ? "Approved" : d.status === "Needs Revision" ? "Revisi" : "Review";
            const dataStr = JSON.stringify(d).replace(/'/g, "&#39;").replace(/"/g, '&quot;');
            
            // Cek apakah ini dari BankSoal (input manual)
            if (d.isBankSoal) {
                html += `<tr>
                    <td>${d.timestamp}</td>
                    <td><strong>${d.mapel}</strong> (Kls ${d.level})</td>
                    <td>${d.guru}</td>
                    <td><span class="badge-status ${badgeClass}">${statusText}</span></td>
                    <td>
                        <button class="btn btn-outline" style="padding:6px 12px;font-size:12px;"
                                onclick='openValidatorSoal("${d.guru}", "${d.mapel}", "${d.level}")'>
                            <i class="fas fa-edit"></i> Review Soal
                        </button>
                        <span style="font-size:10px;color:#64748b;display:block;margin-top:2px;">📝 ${d.catatan}</span>
                    </td>
                </tr>`;
            } else {
                html += `<tr>
                    <td>${d.timestamp}</td>
                    <td><strong>${d.mapel}</strong> (Kls ${d.level})</td>
                    <td>${d.guru}</td>
                    <td><span class="badge-status ${badgeClass}">${statusText}</span></td>
                    <td>
                        <button class="btn btn-outline" style="padding:6px 12px;font-size:12px;"
                                onclick='openValidationModal(${dataStr})'>
                            <i class="fas fa-edit"></i> Periksa
                        </button>
                    </td>
                </tr>`;
            }
        });
        document.getElementById('validator-table-body').innerHTML = html || '<tr><td colspan="5" class="loading-placeholder">Belum ada data.</td></tr>';
        Swal.close();
    } else {
        Swal.fire('Error', 'Gagal memuat data', 'error');
    }
}

function openValidationModal(data) {
    CURRENT_VAL_DOC = data;
    document.getElementById('val-doc-info').innerHTML = `<strong>${data.mapel} (Kls ${data.level})</strong> - ${data.jenis}<br/>Guru: ${data.guru}`;
    document.getElementById('val-btn-drive').href = data.link;
    document.getElementById('val-status').value = data.status || "Under Review";
    document.getElementById('val-note').value = data.catatan || "";
    openModal('modal-validation');
}

async function submitValidation() {
    const payload = {
        row    : CURRENT_VAL_DOC.row,
        status : document.getElementById('val-status').value,
        catatan: document.getElementById('val-note').value
    };
    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const res = await sendRequest("updateValidation", payload);
    if (res.success) {
        Swal.fire('Disimpan', 'Status berhasil diperbarui.', 'success');
        closeModal('modal-validation');
        loadValidationData();
    } else {
        Swal.fire('Error', res.message || 'Gagal', 'error');
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
    if (!username || !password) return Swal.fire('Perhatian', 'Isi username dan password.', 'warning');

    Swal.fire({ title: 'Otentikasi...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
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
    Swal.fire({ title: 'Memuat...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
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
    if (!ADMIN_DATA || ADMIN_DATA.length === 0) return Swal.fire('Oops', 'Tidak ada data.', 'warning');
    let csv = 'No,Level,Mapel,Guru,Unit,Matrix,Soal,Kisi,Glossary,Status,Bank,Rekening\n';
    ADMIN_DATA.forEach((row, i) => {
        csv += `${i+1},${row.level},"${row.mapel}","${row.guru}","${row.unit||''}",${row.matrixLink||''},${row.soalLink||''},${row.kisiLink||''},${row.glossLink||''},${row.soalStatus||''},"${row.bank||''}","${row.rekening||''}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PSAT_Data_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    Swal.fire('Sukses', 'Data diexport.', 'success');
}