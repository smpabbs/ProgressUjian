// ============================================================
// SOAL VALIDATOR
// Tampilan validator untuk review soal satu per satu
// Fitur: Simpan per soal, Kirim hasil validasi batch, Lihat riwayat
// ============================================================

let VALIDATOR_SOALS = [];
let VALIDATOR_CURRENT_INDEX = 0;
let VALIDATOR_GURU = null;
let VALIDATOR_MAPEL = null;
let VALIDATOR_LEVEL = null;

/**
 * Buka halaman validator soal
 */
async function openValidatorSoal(guru, mapel, level) {
    VALIDATOR_GURU = guru;
    VALIDATOR_MAPEL = mapel;
    VALIDATOR_LEVEL = level;
    VALIDATOR_CURRENT_INDEX = 0;
    
    Swal.fire({ title: 'Memuat soal...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    const data = await fetchSoalsForValidation(guru, mapel, level);
    Swal.close();
    
    if (!data || data.length === 0) {
        return Swal.fire({ title: 'Belum Ada Soal', text: 'Guru belum menginput atau mensubmit soal.', icon: 'info', confirmButtonColor: '#2563eb' });
    }
    
    VALIDATOR_SOALS = data;
    
    let validatorContainer = document.getElementById('validator-soal-container');
    if (!validatorContainer) {
        validatorContainer = document.createElement('div');
        validatorContainer.id = 'validator-soal-container';
        validatorContainer.className = 'soal-container animate-in';
        
        const viewValidator = document.getElementById('view-validator');
        if (viewValidator) {
            const tableWrapper = viewValidator.querySelector('.table-wrapper');
            if (tableWrapper) tableWrapper.style.display = 'none';
            viewValidator.appendChild(validatorContainer);
        }
    }
    
    validatorContainer.style.display = 'block';
    renderValidatorView(validatorContainer);
}

/**
 * Render tampilan validator
 */
function renderValidatorView(container) {
    if (!container) return;
    
    const soal = VALIDATOR_SOALS[VALIDATOR_CURRENT_INDEX];
    if (!soal) {
        container.innerHTML = '<p style="text-align:center;padding:40px;">Tidak ada soal.</p>';
        return;
    }
    
    const totalSoal = VALIDATOR_SOALS.length;
    const isFirst = VALIDATOR_CURRENT_INDEX === 0;
    const isLast = VALIDATOR_CURRENT_INDEX >= totalSoal - 1;
    
    // Hitung progress
    const approved = VALIDATOR_SOALS.filter(s => s.status_validasi === 'Approved').length;
    const revision = VALIDATOR_SOALS.filter(s => s.status_validasi === 'Needs Revision').length;
    const pending = totalSoal - approved - revision;
    const allReviewed = pending === 0;
    
    // Build sidebar
    let sidebarHTML = '';
    VALIDATOR_SOALS.forEach((s, i) => {
        let bg = '#f8fafc';
        let icon = '⬜';
        
        if (s.status_validasi === 'Approved') { bg = '#dcfce7'; icon = '✅'; }
        else if (s.status_validasi === 'Needs Revision') { bg = '#fef2f2'; icon = '🔴'; }
        
        if (i === VALIDATOR_CURRENT_INDEX) { bg = '#eff6ff'; }
        
        sidebarHTML += `
        <div onclick="VALIDATOR_CURRENT_INDEX=${i}; renderValidatorView(document.getElementById('validator-soal-container'));" 
             style="padding:10px 12px;cursor:pointer;${i === VALIDATOR_CURRENT_INDEX ? 'border-left:3px solid #2563eb;' : ''}background:${bg};border-bottom:1px solid #e2e8f0;font-size:12px;transition:all 0.15s;">
            <span style="margin-right:6px;">${icon}</span>
            <strong>#${i + 1}</strong>
            <span style="color:#64748b;margin-left:4px;">${formatTipeLabel(s.type)} · ${formatDifficultyLabel(s.difficulty)}</span>
        </div>`;
    });
    
    // Build konten utama
    let soalContent = '';
    
    if (soal.type === 'pilgan') {
        soalContent = `
        <div style="margin-top:12px;">
            <div style="font-weight:600;color:#475569;margin-bottom:8px;">📋 Opsi Jawaban:</div>
            <div style="display:grid;gap:6px;">
                ${['A','B','C','D'].map(l => `
                    <div style="padding:8px 12px;background:${soal.kunci === l ? '#dcfce7' : '#f8fafc'};border-radius:6px;border:1px solid ${soal.kunci === l ? '#bbf7d0' : '#e2e8f0'};">
                        <strong>${l}.</strong> ${escHTML(soal['opsi'+l] || '')} ${soal.kunci === l ? '<span style="color:#059669;">✅</span>' : ''}
                        ${soal['gambar'+l] ? `<br><img src="${getEmbedUrl(soal['gambar'+l])}" style="max-width:100px;max-height:60px;margin-top:4px;border-radius:4px;">` : ''}
                    </div>`).join('')}
            </div>
            <div style="margin-top:8px;font-size:12px;color:#64748b;">Kunci Jawaban: <strong style="color:#059669;">${soal.kunci}</strong></div>
        </div>`;
    } else if (soal.type === 'ceklist') {
        const pernyataan = typeof soal.pernyataan === 'string' ? JSON.parse(soal.pernyataan || '[]') : (soal.pernyataan || []);
        soalContent = `
        <div style="margin-top:12px;">
            <div style="font-weight:600;color:#475569;margin-bottom:8px;">📋 Pernyataan & Jawaban:</div>
            ${pernyataan.map((p, i) => `
                <div style="padding:8px 12px;background:${p.isTrue ? '#dcfce7' : '#fef2f2'};border-radius:6px;border:1px solid ${p.isTrue ? '#bbf7d0' : '#fecaca'};margin-bottom:4px;">
                    <strong>${String.fromCharCode(65 + i)}.</strong> ${escHTML(p.text)} 
                    ${p.isTrue ? '<span style="color:#059669;">✅ Benar</span>' : '<span style="color:#dc2626;">❌ Salah</span>'}
                </div>`).join('')}
        </div>`;
    } else if (soal.type === 'essay') {
        soalContent = `
        <div style="margin-top:12px;">
            <div style="font-weight:600;color:#475569;margin-bottom:8px;">📝 Kunci Jawaban:</div>
            <div style="padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;font-size:13px;white-space:pre-wrap;">${escHTML(soal.jawabanEssay || '(Tidak ada kunci jawaban)')}</div>
        </div>`;
    }
    
    // Riwayat komentar
    let historyHTML = '';
    const history = soal.komentar_history || [];
    if (history.length > 0) {
        historyHTML = `
        <div style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
            <div style="font-weight:600;color:#475569;margin-bottom:8px;font-size:11px;">📜 Riwayat Validasi:</div>
            ${history.map(h => `
                <div style="font-size:11px;padding:4px 0;border-bottom:1px solid #e2e8f0;">
                    <span style="color:#94a3b8;">${h.timestamp || ''}</span> · 
                    <span style="color:${h.status === 'Approved' ? '#059669' : '#dc2626'};font-weight:600;">${h.status === 'Approved' ? '✅' : '🔴'} ${h.status}</span>
                    ${h.comment ? `<div style="color:#475569;margin-top:2px;">"${h.comment}"</div>` : ''}
                </div>`).join('')}
        </div>`;
    }
    
    container.innerHTML = `
    <!-- HEADER -->
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;background:white;border-radius:14px;padding:16px 20px;margin-bottom:16px;border:1px solid #e2e8f0;">
        <div>
            <h2 style="margin:0;font-size:18px;font-weight:700;color:#0f172a;"><i class="fas fa-user-shield" style="color:#d97706;"></i> Review Soal</h2>
            <p style="margin:2px 0 0;font-size:12px;color:#64748b;">${VALIDATOR_MAPEL} · Kelas ${VALIDATOR_LEVEL} · ${VALIDATOR_GURU}</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
            <span style="font-size:12px;background:#dcfce7;color:#059669;padding:6px 12px;border-radius:20px;font-weight:600;">✅ ${approved}</span>
            <span style="font-size:12px;background:#fef2f2;color:#dc2626;padding:6px 12px;border-radius:20px;font-weight:600;">🔴 ${revision}</span>
            <span style="font-size:12px;background:#f1f5f9;color:#64748b;padding:6px 12px;border-radius:20px;font-weight:600;">⬜ ${pending}</span>
            <button class="btn btn-outline" onclick="closeValidatorView()" style="padding:10px 16px;font-size:13px;"><i class="fas fa-arrow-left"></i> Kembali</button>
            ${allReviewed ? `<button class="btn btn-warning" onclick="submitBatchValidation()" style="padding:10px 16px;font-size:13px;font-weight:600;"><i class="fas fa-paper-plane"></i> Kirim Hasil Validasi</button>` : ''}
        </div>
    </div>
    
    <div style="display:flex;gap:16px;flex-wrap:wrap;">
        <!-- SIDEBAR -->
        <div style="width:220px;flex-shrink:0;background:white;border-radius:14px;border:1px solid #e2e8f0;overflow:hidden;max-height:60vh;overflow-y:auto;">
            <div style="padding:12px;background:#f8fafc;font-weight:700;font-size:12px;color:#475569;border-bottom:2px solid #e2e8f0;position:sticky;top:0;">📋 Daftar Soal (${totalSoal})</div>
            ${sidebarHTML}
        </div>
        
        <!-- MAIN CONTENT -->
        <div style="flex:1;min-width:400px;background:white;border-radius:14px;padding:20px 24px;border:1px solid #e2e8f0;">
            <!-- INFO SOAL -->
            <div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
                <span style="background:${getDifficultyColor(soal.difficulty)};color:white;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;">${formatDifficultyLabel(soal.difficulty)}</span>
                <span style="background:#eff6ff;color:#2563eb;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;">${getTipeIcon(soal.type)} ${formatTipeLabel(soal.type)}</span>
                <span style="background:#f1f5f9;color:#475569;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;">🏋️ Bobot: ${soal.bobot || 1}</span>
                <span style="background:#f1f5f9;color:#475569;padding:4px 10px;border-radius:12px;font-size:11px;font-weight:600;">📖 ${escHTML(soal.chapter || '')}</span>
                <span style="margin-left:auto;font-size:13px;color:#64748b;">Soal <strong>#${VALIDATOR_CURRENT_INDEX + 1}</strong> dari ${totalSoal}</span>
            </div>
            
            <!-- PERTANYAAN -->
            <div style="margin-bottom:16px;padding:16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;">
                <div style="font-weight:600;color:#0f172a;margin-bottom:8px;">❓ Pertanyaan:</div>
                <div style="font-size:14px;line-height:1.6;">${soal.pertanyaanHTML || soal.pertanyaan || '(Tidak ada pertanyaan)'}</div>
                ${soal.gambarSoal ? `<img src="${getEmbedUrl(soal.gambarSoal)}" style="max-width:100%;margin-top:8px;border-radius:8px;">` : ''}
            </div>
            
            ${soalContent}
            
            ${historyHTML}
            
            <!-- KOMENTAR VALIDATOR -->
            <div style="margin-top:16px;padding-top:16px;border-top:2px solid #e2e8f0;">
                <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">💬 Komentar Validator</label>
                <textarea id="val-komentar" rows="3" placeholder="Tulis komentar atau catatan untuk soal ini..." style="width:100%;padding:12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;resize:vertical;">${escHTML(soal.komentar_validator || '')}</textarea>
            </div>
            
            <!-- STATUS -->
            <div style="margin-top:12px;display:flex;align-items:center;gap:12px;">
                <label style="font-size:12px;font-weight:600;color:#475569;">Status:</label>
                <select id="val-status-soal" style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;">
                    <option value="Under Review" ${soal.status_validasi === 'Under Review' || !soal.status_validasi ? 'selected' : ''}>🔵 Under Review</option>
                    <option value="Approved" ${soal.status_validasi === 'Approved' ? 'selected' : ''}>✅ Approved</option>
                    <option value="Needs Revision" ${soal.status_validasi === 'Needs Revision' ? 'selected' : ''}>🔴 Needs Revision</option>
                </select>
            </div>
            
            <!-- NAVIGASI -->
            <div style="display:flex;justify-content:space-between;gap:12px;margin-top:20px;flex-wrap:wrap;">
                <button class="btn btn-outline" onclick="prevValidatorSoal()" ${isFirst ? 'disabled' : ''}><i class="fas fa-chevron-left"></i> Sebelumnya</button>
                <button class="btn btn-success" onclick="saveValidatorReview()"><i class="fas fa-save"></i> Simpan Review</button>
                <button class="btn btn-outline" onclick="nextValidatorSoal()" ${isLast ? 'disabled' : ''}>Selanjutnya <i class="fas fa-chevron-right"></i></button>
            </div>
        </div>
    </div>`;
}

/**
 * Simpan review validator untuk soal saat ini
 */
async function saveValidatorReview() {
    const soal = VALIDATOR_SOALS[VALIDATOR_CURRENT_INDEX];
    if (!soal) return;
    
    const status = document.getElementById('val-status-soal')?.value || 'Under Review';
    const comment = document.getElementById('val-komentar')?.value || '';
    
    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    const res = await updateSoalValidation(soal.id, status, comment);
    
    if (res.success) {
        soal.status_validasi = status;
        soal.komentar_validator = comment;
        
        Swal.fire({ title: 'Tersimpan!', text: 'Review berhasil disimpan.', icon: 'success', timer: 1500, showConfirmButton: false });
        
        const container = document.getElementById('validator-soal-container');
        if (container) renderValidatorView(container);
    } else {
        Swal.fire('Error', res.message || 'Gagal menyimpan review', 'error');
    }
}

/**
 * Kirim hasil validasi batch ke guru
 */
async function submitBatchValidation() {
    const confirm = await Swal.fire({
        title: 'Kirim Hasil Validasi?',
        text: 'Hasil validasi akan dikirim ke guru. Lanjutkan?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Kirim',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#d97706'
    });
    
    if (!confirm.isConfirmed) return;
    
    Swal.fire({ title: 'Mengirim...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    // 🔧 PANGGIL LANGSUNG sendRequest, bypass api.js
    const payload = { 
        guru: VALIDATOR_GURU, 
        mapel: VALIDATOR_MAPEL, 
        level: VALIDATOR_LEVEL 
    };
    
    console.log('🔴 Mengirim payload:', payload);
    
    try {
        const res = await sendRequest("submitBatchValidation", payload);
        console.log('🔴 Response:', res);
        
        if (res.success) {
            Swal.fire({ title: 'Berhasil!', text: res.message, icon: 'success', confirmButtonColor: '#16a34a' });
            closeValidatorView();
        } else {
            Swal.fire('Error', res.message || 'Gagal mengirim', 'error');
        }
    } catch (e) {
        console.error('🔴 Error:', e);
        Swal.fire('Error', e.toString(), 'error');
    }
}

function nextValidatorSoal() {
    if (VALIDATOR_CURRENT_INDEX < VALIDATOR_SOALS.length - 1) VALIDATOR_CURRENT_INDEX++;
    const container = document.getElementById('validator-soal-container');
    if (container) renderValidatorView(container);
}

function prevValidatorSoal() {
    if (VALIDATOR_CURRENT_INDEX > 0) VALIDATOR_CURRENT_INDEX--;
    const container = document.getElementById('validator-soal-container');
    if (container) renderValidatorView(container);
}

function closeValidatorView() {
    const container = document.getElementById('validator-soal-container');
    if (container) container.style.display = 'none';
    const viewValidator = document.getElementById('view-validator');
    if (viewValidator) {
        const tableWrapper = viewValidator.querySelector('.table-wrapper');
        if (tableWrapper) tableWrapper.style.display = '';
    }
    if (typeof loadValidationData === 'function') loadValidationData();
}

// Expose
window.openValidatorSoal = openValidatorSoal;
window.renderValidatorView = renderValidatorView;
window.saveValidatorReview = saveValidatorReview;
window.submitBatchValidation = submitBatchValidation;
window.nextValidatorSoal = nextValidatorSoal;
window.prevValidatorSoal = prevValidatorSoal;
window.closeValidatorView = closeValidatorView;