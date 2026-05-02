// ============================================================
// SOAL EDITOR
// Form input 1 soal (Pilgan / Ceklist / Essay)
// Fitur: Read-only mode, Tampilkan komentar validator, Auto-submit revisi
// ============================================================

// ==================== RENDER UTAMA ====================

/**
 * Render halaman editor soal
 */
function renderSoalEditor(container) {
    if (!container) return;
    
    const chapterName = SOAL_STATE.currentChapter;
    const type = SOAL_STATE.currentType;
    const difficulty = SOAL_STATE.currentDifficulty;
    const idx = SOAL_STATE.currentSoalIndex;
    
    const target = getTargetCount(chapterName, type, difficulty);
    const soals = getSoalsByCategory(chapterName, type, difficulty);
    const currentSoal = soals[idx] || createEmptySoal(chapterName, type, difficulty, idx);
    
    SOAL_STATE.currentEditSoal = currentSoal;
    
    // Cek apakah soal ini approved (read-only)
    const isApproved = currentSoal.status_validasi === 'Approved';
    const isRevision = currentSoal.status_validasi === 'Needs Revision';
    SOAL_STATE.isReadOnly = isApproved;
    
    const isFirst = idx === 0;
    const isLast = idx >= target - 1;
    
    container.innerHTML = buildEditorHTML(currentSoal, target, idx, soals, isFirst, isLast, isApproved, isRevision);
    
    setTimeout(() => {
        if (!isApproved) {
            initQuillEditor('quill-editor', currentSoal.pertanyaanHTML || currentSoal.pertanyaan || '');
        }
        const bobotEl = document.getElementById('soal-bobot');
        if (bobotEl) {
            bobotEl.value = currentSoal.bobot || 1;
            if (isApproved) bobotEl.disabled = true;
        }
        if (!isApproved) attachImageListeners();
    }, 200);
}

/**
 * Build HTML editor
 */
function buildEditorHTML(soal, target, idx, soals, isFirst, isLast, isApproved, isRevision) {
    const chapterName = SOAL_STATE.currentChapter;
    const type = SOAL_STATE.currentType;
    const difficulty = SOAL_STATE.currentDifficulty;
    const disabledAttr = isApproved ? 'disabled' : '';
    const readOnlyStyle = isApproved ? 'background:#f8fafc;color:#64748b;' : '';
    
    return `
    <!-- HEADER -->
    <div class="editor-header">
        <div>
            <h2>
                ${isApproved ? '<i class="fas fa-lock" style="color:#059669;"></i>' : '<i class="fas fa-edit" style="color:#2563eb;"></i>'}
                ${isApproved ? 'Lihat Soal (Approved)' : isRevision ? 'Revisi Soal' : 'Input Soal'}
            </h2>
            <p>${escHTML(chapterName)} · ${getTipeIcon(type)} ${formatTipeLabel(type)} · 
               <span style="color:${getDifficultyColor(difficulty)};">${formatDifficultyLabel(difficulty)}</span> · 
               Soal ke-${idx + 1} dari ${target}
               ${isApproved ? '<span style="color:#059669;margin-left:8px;">✅ Approved</span>' : ''}
               ${isRevision ? '<span style="color:#dc2626;margin-left:8px;">🔴 Perlu Revisi</span>' : ''}
            </p>
        </div>
        <div>
            <button class="btn btn-outline" onclick="backToSoalDashboard()"><i class="fas fa-list"></i> Daftar Soal</button>
        </div>
    </div>
    
    <!-- KOMENTAR VALIDATOR (Jika revisi) -->
    ${isRevision && soal.komentar_validator ? `
    <div style="background:#fef2f2;border:2px solid #fecaca;border-radius:12px;padding:14px 18px;margin-bottom:16px;">
        <div style="font-weight:700;color:#dc2626;margin-bottom:6px;"><i class="fas fa-comment-dots"></i> Catatan Validator:</div>
        <div style="font-size:13px;color:#991b1b;line-height:1.6;">${escHTML(soal.komentar_validator)}</div>
    </div>` : ''}
    
    <!-- FORM SOAL -->
    <div class="editor-form" style="${readOnlyStyle}">
        ${buildBobotSelector(soal, isApproved)}
        ${buildPertanyaanEditor(isApproved)}
        ${type === 'pilgan' ? renderPilganForm(soal, isApproved) : ''}
        ${type === 'ceklist' ? renderCeklistForm(soal, isApproved) : ''}
        ${type === 'essay' ? renderEssayForm(soal, isApproved) : ''}
    </div>
    
    <!-- NAVIGASI (hanya jika bukan read-only) -->
    ${!isApproved ? `
    <div class="editor-nav">
        <button class="btn btn-outline" onclick="prevSoal()" ${isFirst ? 'disabled' : ''}><i class="fas fa-chevron-left"></i> Sebelumnya</button>
        <div>
            <button class="btn btn-primary" onclick="saveCurrentSoal()"><i class="fas fa-save"></i> Simpan Soal</button>
            ${!isLast ? `<button class="btn btn-success" onclick="saveAndNext()">Simpan & Lanjut <i class="fas fa-chevron-right"></i></button>` : ''}
        </div>
        <button class="btn btn-outline" onclick="nextSoal()" ${isLast ? 'disabled' : ''}>Selanjutnya <i class="fas fa-chevron-right"></i></button>
    </div>` : `
    <div class="editor-nav">
        <button class="btn btn-outline" onclick="prevSoal()" ${isFirst ? 'disabled' : ''}><i class="fas fa-chevron-left"></i> Sebelumnya</button>
        <div></div>
        <button class="btn btn-outline" onclick="nextSoal()" ${isLast ? 'disabled' : ''}>Selanjutnya <i class="fas fa-chevron-right"></i></button>
    </div>`}
    
    <!-- PROGRESS MINI -->
    <div class="editor-progress">${buildProgressDots(soals, target, idx)}</div>`;
}

// ==================== COMPONENT BUILDERS ====================

function buildBobotSelector(soal, disabled) {
    const options = [1,2,3,4,5].map(v => `<option value="${v}" ${soal.bobot === v ? 'selected' : ''}>${v}</option>`).join('');
    return `
    <div class="form-group">
        <label>🏋️ Bobot Soal</label>
        <select id="soal-bobot" class="form-select" style="width:100px;" ${disabled ? 'disabled' : ''}>${options}</select>
    </div>`;
}

function buildPertanyaanEditor(disabled) {
    if (disabled) {
        return `
        <div class="form-group">
            <label>❓ Pertanyaan</label>
            <div id="quill-editor-readonly" style="min-height:150px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;"></div>
        </div>`;
    }
    return `
    <div class="form-group">
        <label>❓ Pertanyaan</label>
        <div class="quill-wrapper"><div id="quill-editor"></div></div>
        <small style="color:#94a3b8;margin-top:4px;display:block;">🖼️ Klik icon gambar di toolbar. 📐 Klik gambar untuk resize.</small>
    </div>`;
}

function buildProgressDots(soals, target, currentIdx) {
    return Array.from({length: target}, (_, i) => {
        const s = soals[i];
        let color = '#e2e8f0';
        if (s && s.status_validasi === 'Approved') color = '#059669';
        else if (s && s.status_validasi === 'Needs Revision') color = '#dc2626';
        else if (s && s.status === 'submitted') color = '#3b82f6';
        else if (s) color = '#f59e0b';
        if (i === currentIdx) color = '#8b5cf6';
        return `<div class="progress-dot" style="background:${color};" onclick="goToSoalIndex(${i})" title="Soal ${i+1}">${i+1}</div>`;
    }).join('');
}

// ==================== PILGAN FORM ====================

function renderPilganForm(soal, disabled) {
    const labels = ['A', 'B', 'C', 'D'];
    const inputs = labels.map(l => {
        const lower = l.toLowerCase();
        return `
        <div class="opsi-item">
            <div class="opsi-row">
                <span class="opsi-label">${l}</span>
                <input type="text" id="opsi-${lower}" value="${escHTML(soal['opsi'+l] || '')}" placeholder="Opsi ${l}" class="opsi-input" ${disabled ? 'disabled' : ''}>
                ${!disabled ? `<input type="file" id="gambar-${lower}" accept="image/*" class="opsi-file">` : ''}
            </div>
            <div id="gambar-${lower}-preview" class="opsi-preview">
                ${soal['gambar'+l] ? `<img src="${getEmbedUrl(soal['gambar'+l])}" class="opsi-img">` : ''}
            </div>
        </div>`;
    }).join('');
    
    return `
    <div class="form-section">
        <label>📋 Opsi Jawaban</label>
        <div class="opsi-grid">${inputs}</div>
        <div class="form-group" style="margin-top:12px;">
            <label>✅ Kunci Jawaban</label>
            <select id="kunci-jawaban" class="form-select" style="width:100px;" ${disabled ? 'disabled' : ''}>
                <option value="">Pilih</option>
                ${labels.map(l => `<option value="${l}" ${soal.kunci === l ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
        </div>
    </div>`;
}

// ==================== CEKLIST FORM ====================

function renderCeklistForm(soal, disabled) {
    // Parse pernyataan jika masih string JSON
    let pernyataan = soal.pernyataan || [];
    if (typeof pernyataan === 'string') {
        try {
            pernyataan = JSON.parse(pernyataan);
        } catch (e) {
            pernyataan = [];
        }
    }
    
    if (!Array.isArray(pernyataan) || pernyataan.length === 0) {
        pernyataan = [{ text: '', isTrue: true }, { text: '', isTrue: false }];
    }
    
    const items = pernyataan.map((p, i) => `
        <div class="ceklist-row">
            <span class="ceklist-label">${String.fromCharCode(65 + i)}</span>
            <input type="text" class="ceklist-text" data-index="${i}" value="${escHTML(p.text || '')}" placeholder="Pernyataan" class="ceklist-input" ${disabled ? 'disabled' : ''}>
            <select class="ceklist-true" data-index="${i}" class="ceklist-select" ${disabled ? 'disabled' : ''}>
                <option value="true" ${p.isTrue ? 'selected' : ''}>✅ Benar</option>
                <option value="false" ${!p.isTrue ? 'selected' : ''}>❌ Salah</option>
            </select>
        </div>`).join('');
    
    return `
    <div class="form-section">
        <label>📋 Pernyataan Checklist</label>
        <div id="ceklist-items">${items}</div>
        ${!disabled ? `<button class="btn btn-outline btn-sm" onclick="addCeklistItem()" style="margin-top:8px;"><i class="fas fa-plus"></i> Tambah</button>` : ''}
    </div>`;
}

// ==================== ESSAY FORM ====================

function renderEssayForm(soal, disabled) {
    return `
    <div class="form-section">
        <label>📝 Kunci Jawaban / Poin Penting (Opsional)</label>
        <textarea id="jawaban-essay" rows="5" class="form-textarea" ${disabled ? 'disabled' : ''}>${escHTML(soal.jawabanEssay || '')}</textarea>
    </div>`;
}

// ==================== QUILL EDITOR ====================

function initQuillEditor(elementId, content) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (el.classList.contains('ql-container')) el.innerHTML = '';
    
    const quill = new Quill(`#${elementId}`, {
        theme: 'snow',
        modules: {
            toolbar: {
                container: [['bold', 'italic', 'underline', 'strike'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], [{ 'script': 'sub'}, { 'script': 'super' }], [{ 'direction': 'rtl' }], ['image'], ['clean']],
                handlers: { 'image': function() { handleQuillImageUpload(quill); } }
            }
        },
        placeholder: 'Tulis pertanyaan disini...'
    });
    
    if (content) quill.root.innerHTML = content;
    
    quill.root.addEventListener('click', function(e) {
        if (e.target.tagName === 'IMG') showImageResizer(e.target, quill);
    });
    
    window._quillPertanyaan = quill;
}

function showImageResizer(img, quill) {
    const oldPopup = document.querySelector('.img-resize-popup');
    if (oldPopup) oldPopup.remove();
    
    const originalW = img.width || img.naturalWidth || 300;
    const originalH = img.height || img.naturalHeight || 200;
    const ratio = originalW / originalH;
    
    const popup = document.createElement('div');
    popup.className = 'img-resize-popup';
    popup.innerHTML = `
        <div style="font-size:11px;font-weight:600;color:#475569;margin-bottom:8px;">📐 Resize Gambar <span style="font-weight:400;color:#94a3b8;">(${originalW}×${originalH})</span></div>
        <div class="img-resize-controls">
            <span>W:</span><input type="number" id="img-width" value="${originalW}" min="30" max="800" step="10">
            <span>×</span><span>H:</span><input type="number" id="img-height" value="${originalH}" min="30" max="800" step="10">
        </div>
        <div style="margin-top:8px;"><label><input type="checkbox" id="img-keep-ratio" checked> 🔒 Keep aspect ratio</label></div>
        <div style="display:flex;gap:6px;margin-top:10px;justify-content:flex-end;">
            <button onclick="this.closest('.img-resize-popup').remove();">Batal</button>
            <button onclick="applyImageResize(${ratio})" style="background:#3b82f6;color:white;">OK</button>
        </div>`;
    popup.style.cssText = 'position:fixed;z-index:9999;background:white;padding:12px 16px;border-radius:10px;box-shadow:0 8px 25px rgba(0,0,0,0.18);border:1px solid #e2e8f0;min-width:220px;';
    
    const rect = img.getBoundingClientRect();
    popup.style.top = Math.max(10, rect.top - 130) + 'px';
    popup.style.left = Math.min(rect.left, window.innerWidth - 230) + 'px';
    document.body.appendChild(popup);
    
    img.style.outline = '3px solid #3b82f6';
    img.style.outlineOffset = '2px';
    
    const widthInput = popup.querySelector('#img-width');
    const heightInput = popup.querySelector('#img-height');
    const keepRatioCheck = popup.querySelector('#img-keep-ratio');
    
    widthInput.addEventListener('input', function() { if (keepRatioCheck.checked) heightInput.value = Math.round(this.value / ratio); });
    heightInput.addEventListener('input', function() { if (keepRatioCheck.checked) widthInput.value = Math.round(this.value * ratio); });
    setTimeout(() => widthInput.focus(), 100);
    
    setTimeout(() => {
        const closeHandler = function(e) {
            if (!popup.contains(e.target) && e.target !== img) {
                popup.remove(); img.style.outline = '';
                document.removeEventListener('click', closeHandler);
                delete window.applyImageResize;
            }
        };
        document.addEventListener('click', closeHandler);
    }, 100);
    
    window.applyImageResize = function(r) {
        const w = parseInt(document.getElementById('img-width')?.value) || originalW;
        const h = parseInt(document.getElementById('img-height')?.value) || originalH;
        img.setAttribute('width', w); img.setAttribute('height', h);
        img.style.width = w + 'px'; img.style.height = h + 'px';
        popup.remove(); img.style.outline = '';
        delete window.applyImageResize;
    };
}

async function handleQuillImageUpload(quill) {
    const input = document.createElement('input');
    input.setAttribute('type', 'file'); input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = async () => {
        const file = input.files[0]; if (!file) return;
        const range = quill.getSelection();
        const idx = range ? range.index : quill.getLength() - 1;
        quill.insertText(idx, '⏳ Uploading...\n', 'italic', true);
        try {
            const uploadRes = await uploadSoalImage(file);
            if (uploadRes.success) {
                quill.deleteText(idx, 16);
                quill.insertEmbed(idx, 'image', getEmbedUrl(uploadRes.url));
                quill.setSelection(idx + 1);
            } else {
                quill.deleteText(idx, 16);
                quill.insertText(idx, '❌ Gagal upload\n', 'color:#dc2626;', true);
            }
        } catch (e) {
            quill.deleteText(idx, 16);
            quill.insertText(idx, '❌ Gagal upload\n', 'color:#dc2626;', true);
        }
    };
}

// ==================== CEKLIST ITEMS ====================

function addCeklistItem() {
    const container = document.getElementById('ceklist-items');
    if (!container) return;
    const count = container.querySelectorAll('.ceklist-text').length;
    const div = document.createElement('div');
    div.className = 'ceklist-row';
    div.innerHTML = `<span class="ceklist-label">${String.fromCharCode(65 + count)}</span>
        <input type="text" class="ceklist-text" data-index="${count}" placeholder="Pernyataan" class="ceklist-input">
        <select class="ceklist-true" data-index="${count}" class="ceklist-select"><option value="true">✅ Benar</option><option value="false">❌ Salah</option></select>`;
    container.appendChild(div);
}

// ==================== IMAGE UPLOAD ====================

function attachImageListeners() {
    ['a','b','c','d'].forEach(l => {
        const el = document.getElementById(`gambar-${l}`);
        if (el) el.addEventListener('change', e => { if (e.target.files[0]) autoUploadImage(e.target, `gambar-${l}-preview`, `gambar${l.toUpperCase()}`); });
    });
}

async function autoUploadImage(fileInput, previewId, stateKey) {
    const file = fileInput.files[0]; if (!file) return;
    showPreview(previewId, file);
    try {
        const res = await uploadSoalImage(file);
        if (res.success) {
            if (!SOAL_STATE.currentEditSoal) SOAL_STATE.currentEditSoal = {};
            SOAL_STATE.currentEditSoal[stateKey] = res.url;
            showUploadedPreview(previewId, res.url);
        } else { showError(previewId, res.message); }
    } catch (e) { showError(previewId, 'Gagal upload'); }
}

function showPreview(id, file) {
    const reader = new FileReader();
    reader.onload = e => { const el = document.getElementById(id); if (el) el.innerHTML = `<img src="${e.target.result}" class="opsi-img"><div class="upload-status uploading">⏳ Uploading...</div>`; };
    reader.readAsDataURL(file);
}

function showUploadedPreview(id, url) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<img src="${getEmbedUrl(url)}" class="opsi-img"><div class="upload-status success">✅ Done</div>`;
}

function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<div class="upload-status error">❌ ${msg}</div>`;
}

// ==================== SAVE & NAVIGASI ====================

async function saveCurrentSoal() {
    const soal = await collectSoalData();
    if (!soal) return;
    
    const key = `${soal.chapter}_${soal.type}_${soal.difficulty}`;
    if (!SOAL_STATE.allSoals[key]) SOAL_STATE.allSoals[key] = [];
    const idx = SOAL_STATE.currentSoalIndex;
    
    // Jika ini revisi, auto-submit
    if (soal.status_validasi === 'Needs Revision') {
        soal.status = 'submitted';
        soal.komentar_history = soal.komentar_history || [];
        soal.komentar_history.push({
            timestamp: new Date().toLocaleString('id-ID'),
            status: 'submitted (revisi)',
            comment: soal.komentar_validator || ''
        });
    }
    
    const cur = SOAL_STATE.currentEditSoal;
    if (cur) {
        ['gambarSoal','gambarA','gambarB','gambarC','gambarD'].forEach(k => { if (!soal[k] && cur[k]) soal[k] = cur[k]; });
    }
    
    SOAL_STATE.currentEditSoal = soal;
    SOAL_STATE.allSoals[key][idx] = soal;
    
    const res = await saveSoalToServer(soal);
    if (res.success) {
        SOAL_STATE.currentEditSoal = soal;
        SOAL_STATE.allSoals[key][idx] = soal;
        Swal.fire({ title: 'Tersimpan!', text: soal.status === 'submitted' ? 'Soal disimpan & dikirim ke validator.' : 'Soal berhasil disimpan.', icon: 'success', timer: 1500, showConfirmButton: false });
    } else {
        Swal.fire('Error', res.message || 'Gagal menyimpan', 'error');
    }
}

async function saveAndNext() { await saveCurrentSoal(); nextSoal(); }

async function collectSoalData() {
    const ch = SOAL_STATE.currentChapter;
    const type = SOAL_STATE.currentType;
    const diff = SOAL_STATE.currentDifficulty;
    const idx = SOAL_STATE.currentSoalIndex;
    
    const soal = SOAL_STATE.currentEditSoal || createEmptySoal(ch, type, diff, idx);
    
    soal.bobot = parseInt(document.getElementById('soal-bobot')?.value || 1);
    
    if (window._quillPertanyaan && !SOAL_STATE.isReadOnly) {
        soal.pertanyaanHTML = window._quillPertanyaan.root.innerHTML;
        soal.pertanyaan = window._quillPertanyaan.getText().trim();
    }
    
    if (!soal.pertanyaan) { Swal.fire('Oops', 'Pertanyaan wajib diisi!', 'warning'); return null; }
    
    const cur = SOAL_STATE.currentEditSoal;
    ['gambarSoal','gambarA','gambarB','gambarC','gambarD'].forEach(k => { soal[k] = (cur && cur[k]) || soal[k] || ''; });
    
    if (type === 'pilgan') {
        ['A','B','C','D'].forEach(l => soal['opsi'+l] = document.getElementById('opsi-'+l.toLowerCase())?.value || '');
        soal.kunci = document.getElementById('kunci-jawaban')?.value || '';
        if (!soal.opsiA || !soal.opsiB || !soal.opsiC || !soal.opsiD) { Swal.fire('Oops', 'Semua opsi wajib diisi!', 'warning'); return null; }
        if (!soal.kunci) { Swal.fire('Oops', 'Kunci jawaban wajib dipilih!', 'warning'); return null; }
    }
    
    if (type === 'ceklist') {
        const texts = document.querySelectorAll('.ceklist-text');
        const trues = document.querySelectorAll('.ceklist-true');
        soal.pernyataan = [];
        texts.forEach((t, i) => { if (t.value.trim()) soal.pernyataan.push({ text: t.value.trim(), isTrue: trues[i]?.value === 'true' }); });
        if (soal.pernyataan.length < 2) { Swal.fire('Oops', 'Minimal 2 pernyataan!', 'warning'); return null; }
    }
    
    if (type === 'essay') soal.jawabanEssay = document.getElementById('jawaban-essay')?.value || '';
    
    soal.pembahasan = ''; soal.pembahasanHTML = '';
    
    return soal;
}

function nextSoal() {
    const target = getTargetCount(SOAL_STATE.currentChapter, SOAL_STATE.currentType, SOAL_STATE.currentDifficulty);
    if (SOAL_STATE.currentSoalIndex < target - 1) SOAL_STATE.currentSoalIndex++;
    const c = document.getElementById('soal-container'); if (c) renderSoalEditor(c);
}

function prevSoal() {
    if (SOAL_STATE.currentSoalIndex > 0) SOAL_STATE.currentSoalIndex--;
    const c = document.getElementById('soal-container'); if (c) renderSoalEditor(c);
}

function goToSoalIndex(i) { SOAL_STATE.currentSoalIndex = i; const c = document.getElementById('soal-container'); if (c) renderSoalEditor(c); }

function backToSoalDashboard() { SOAL_STATE.viewMode = 'dashboard'; const c = document.getElementById('soal-container'); if (c) renderSoalDashboard(c); }

// ==================== EXPOSE ====================
window.renderSoalEditor = renderSoalEditor;
window.addCeklistItem = addCeklistItem;
window.saveCurrentSoal = saveCurrentSoal;
window.saveAndNext = saveAndNext;
window.nextSoal = nextSoal;
window.prevSoal = prevSoal;
window.goToSoalIndex = goToSoalIndex;
window.backToSoalDashboard = backToSoalDashboard;