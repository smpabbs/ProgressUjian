// ==================== MATRIX INPUT ====================

async function openMatrixInput() {
    // Sembunyikan upload cards
    const uploadCards = document.getElementById('upload-cards');
    if (uploadCards) uploadCards.style.display = 'none';
    
    // Cari atau buat container matrix
    let matrixContainer = document.getElementById('matrix-container');
    if (!matrixContainer) {
        matrixContainer = document.createElement('div');
        matrixContainer.id = 'matrix-container';
        matrixContainer.className = 'matrix-container animate-in';
        
        // Cari parent yang tepat
        const viewTeacher = document.getElementById('view-teacher');
        if (viewTeacher) {
            viewTeacher.appendChild(matrixContainer);
        } else {
            console.error('❌ view-teacher tidak ditemukan');
            Swal.fire('Error', 'Tidak dapat membuka halaman matrix.', 'error');
            return;
        }
    }
    
    matrixContainer.style.display = 'block';
    matrixContainer.innerHTML = '<div style="text-align:center;padding:60px;"><div class="spinner"></div><p>Memuat patokan...</p></div>';
    
    // Fetch patokan
    const patokan = await fetchPatokan(ACTIVE_USER.mapel);
    console.log('📊 Patokan:', patokan);
    
    if (!patokan) {
        matrixContainer.innerHTML = `
            <div style="text-align:center;padding:40px;color:#ef4444;">
                <i class="fas fa-exclamation-circle" style="font-size:48px;margin-bottom:16px;"></i>
                <p>Patokan untuk mapel <strong>${ACTIVE_USER.mapel}</strong> tidak ditemukan.</p>
                <p style="font-size:12px;color:#64748b;">Pastikan sheet <strong>Patokan_Soal</strong> sudah ada di spreadsheet.</p>
                <button class="btn btn-outline" onclick="closeMatrixInput()" style="margin-top:16px;">Kembali</button>
            </div>`;
        return;
    }
    
    MATRIX_STATE.patokan = patokan;
    
    // Cek existing data
    const existingChapters = await fetchMatrix();
    if (existingChapters && existingChapters.length > 0) {
        MATRIX_STATE.chapters = existingChapters;
    } else {
        MATRIX_STATE.chapters = [
            createMatrixChapter('Chapter 1'),
            createMatrixChapter('Chapter 2')
        ];
    }
    
    renderMatrixPage(matrixContainer);
}

function closeMatrixInput() {
    const matrixContainer = document.getElementById('matrix-container');
    if (matrixContainer) matrixContainer.style.display = 'none';
    const uploadCards = document.getElementById('upload-cards');
    if (uploadCards) uploadCards.style.display = '';
}

function createMatrixChapter(name = '') {
    return {
        id: 'ch_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: name,
        data: {}
    };
}

function renderMatrixPage(container) {
    if (!container) return;
    
    const patokan = MATRIX_STATE.patokan;
    const chapters = MATRIX_STATE.chapters;
    const totals = calculateMatrixTotals();
    
    const mc = patokan.multiple_choice;
    const cl = patokan.checklist;
    const ur = patokan.uraian;
    
    // ========== PILGAN ==========
    const pmK = totals.pilgan_mudah_keluar || 0, pmB = totals.pilgan_mudah_bank || 0;
    const psK = totals.pilgan_sedang_keluar || 0, psB = totals.pilgan_sedang_bank || 0;
    const psuK = totals.pilgan_sulit_keluar || 0, psuB = totals.pilgan_sulit_bank || 0;
    const pilganK = pmK + psK + psuK, pilganB = pmB + psB + psuB;
    const tPilganK = mc.mudah_keluar + mc.sedang_keluar + mc.sulit_keluar;
    const tPilganB = mc.mudah_bank + mc.sedang_bank + mc.sulit_bank;
    const pilganOK = pilganK === tPilganK && pilganB === tPilganB;
    
    // ========== CEKLIST ==========
    const cmK = totals.ceklist_mudah_keluar || 0, cmB = totals.ceklist_mudah_bank || 0;
    const csK = totals.ceklist_sedang_keluar || 0, csB = totals.ceklist_sedang_bank || 0;
    const csuK = totals.ceklist_sulit_keluar || 0, csuB = totals.ceklist_sulit_bank || 0;
    const ceklistK = cmK + csK + csuK, ceklistB = cmB + csB + csuB;
    const tCeklistK = cl.mudah_keluar + cl.sedang_keluar + cl.sulit_keluar;
    const tCeklistB = cl.mudah_bank + cl.sedang_bank + cl.sulit_bank;
    const ceklistOK = ceklistK === tCeklistK && ceklistB === tCeklistB;
    
    // ========== ESSAY ==========
    const emK = totals.essay_mudah_keluar || 0, emB = totals.essay_mudah_bank || 0;
    const esK = totals.essay_sedang_keluar || 0, esB = totals.essay_sedang_bank || 0;
    const esuK = totals.essay_sulit_keluar || 0, esuB = totals.essay_sulit_bank || 0;
    const essayK = emK + esK + esuK, essayB = emB + esB + esuB;
    const tEssayK = ur.mudah_keluar + ur.sedang_keluar + ur.sulit_keluar;
    const tEssayB = ur.mudah_bank + ur.sedang_bank + ur.sulit_bank;
    const essayOK = essayK === tEssayK && essayB === tEssayB;
    
    // ========== GRAND TOTAL ==========
    const totalK = pilganK + ceklistK + essayK;
    const totalB = pilganB + ceklistB + essayB;
    const tTotalK = tPilganK + tCeklistK + tEssayK;
    const tTotalB = tPilganB + tCeklistB + tEssayB;
    const allOK = pilganOK && ceklistOK && essayOK;
    
    const ok = (v, t) => v === t;
    const clr = (v, t) => ok(v, t) ? '#059669' : '#dc2626';
    const ico = (v, t) => ok(v, t) ? '✅' : '❌';
    
    // Fungsi render row patokan per tingkat kesulitan (DENGAN ID)
    const patokanRow = (prefix, level, kVal, kTarget, bVal, bTarget) => `
        <div id="patokan-${prefix}-${level}" style="display:flex;align-items:center;padding:6px 8px;font-size:12px;gap:8px;border-bottom:1px solid #f1f5f9;background:${(ok(kVal,kTarget)&&ok(bVal,bTarget)) ? '#f8fafc' : '#fef2f2'};border-radius:4px;">
            <span style="width:55px;font-weight:500;color:#475569;">${level.charAt(0).toUpperCase()+level.slice(1)}</span>
            <span class="patokan-k" style="flex:1;display:flex;align-items:center;gap:4px;color:${clr(kVal,kTarget)};font-weight:600;">
                <span style="font-size:10px;color:#64748b;">Keluar</span> ${kVal}<span style="color:#cbd5e1;">/</span>${kTarget} ${ico(kVal,kTarget)}
            </span>
            <span class="patokan-b" style="flex:1;display:flex;align-items:center;gap:4px;color:${clr(bVal,bTarget)};font-weight:600;">
                <span style="font-size:10px;color:#64748b;">Bank</span> ${bVal}<span style="color:#cbd5e1;">/</span>${bTarget} ${ico(bVal,bTarget)}
            </span>
        </div>`;
    
    container.innerHTML = `
        <!-- ==================== HEADER ==================== -->
        <div class="matrix-header-bar" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;background:white;border-radius:16px;padding:16px 24px;margin-bottom:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <div>
                <h2 style="margin:0;font-size:18px;font-weight:700;color:#0f172a;"><i class="fas fa-table" style="color:#2563eb;"></i> Input Matrix Pemetaan</h2>
                <p style="margin:2px 0 0;font-size:12px;color:#64748b;">${ACTIVE_USER.mapel} · Kelas ${ACTIVE_USER.level} · ${ACTIVE_USER.nama} · ${ACTIVE_USER.unit}</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-outline" onclick="closeMatrixInput()" style="padding:10px 16px;font-size:13px;"><i class="fas fa-arrow-left"></i> Kembali</button>
                <button class="btn btn-outline" onclick="addMatrixChapter()" style="padding:10px 16px;font-size:13px;"><i class="fas fa-plus"></i> Chapter</button>
                <button class="btn btn-success" id="btn-submit-matrix" ${allOK ? '' : 'disabled'} onclick="submitMatrix()" style="padding:10px 20px;font-size:13px;font-weight:600;opacity:${allOK ? '1' : '0.5'};"><i class="fas fa-paper-plane"></i> Submit Matrix</button>
            </div>
        </div>
        
        <!-- ==================== PATOKAN BAR ==================== -->
        <div style="background:white;border-radius:16px;padding:20px 24px;margin-bottom:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <div style="font-weight:700;margin-bottom:16px;font-size:14px;color:#0f172a;">
                <i class="fas fa-bullseye" style="color:#ef4444;"></i> Target Patokan Pembagian Soal
                <span style="font-weight:400;font-size:11px;color:#94a3b8;margin-left:8px;">(isi tabel hingga semua ✅)</span>
            </div>
            
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:14px;">
                
                <!-- ========== PILGAN CARD ========== -->
                <div id="patokan-pilgan-card" style="background:linear-gradient(135deg,#f8fafc,#eff6ff);border-radius:12px;padding:14px 16px;border:1.5px solid ${pilganOK ? '#bbf7d0' : '#e2e8f0'};">
                    <div style="font-weight:700;color:#1e40af;margin-bottom:12px;font-size:13px;display:flex;align-items:center;gap:6px;">
                        <span style="background:#dbeafe;width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;">📝</span> Multiple Choice
                        <span id="patokan-pilgan-badge" style="margin-left:auto;background:#dcfce7;color:#059669;padding:2px 8px;border-radius:12px;font-size:10px;display:${pilganOK?'inline':'none'};">✅ OK</span>
                    </div>
                    ${patokanRow('pilgan', 'mudah', pmK, mc.mudah_keluar, pmB, mc.mudah_bank)}
                    ${patokanRow('pilgan', 'sedang', psK, mc.sedang_keluar, psB, mc.sedang_bank)}
                    ${patokanRow('pilgan', 'sulit', psuK, mc.sulit_keluar, psuB, mc.sulit_bank)}
                    <div id="patokan-pilgan-total" style="display:flex;align-items:center;padding:8px 8px 0;font-size:11px;font-weight:700;gap:8px;margin-top:6px;border-top:2px solid #e2e8f0;color:#1e40af;">
                        <span style="width:55px;">Total</span>
                        <span class="patokan-total-k" style="flex:1;color:${clr(pilganK,tPilganK)};">Keluar ${pilganK}/${tPilganK} ${ico(pilganK,tPilganK)}</span>
                        <span class="patokan-total-b" style="flex:1;color:${clr(pilganB,tPilganB)};">Bank ${pilganB}/${tPilganB} ${ico(pilganB,tPilganB)}</span>
                    </div>
                </div>
                
                <!-- ========== CEKLIST CARD ========== -->
                <div id="patokan-ceklist-card" style="background:linear-gradient(135deg,#f8fafc,#f0fdf4);border-radius:12px;padding:14px 16px;border:1.5px solid ${ceklistOK ? '#bbf7d0' : '#e2e8f0'};">
                    <div style="font-weight:700;color:#166534;margin-bottom:12px;font-size:13px;display:flex;align-items:center;gap:6px;">
                        <span style="background:#dcfce7;width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;">✅</span> Checklist
                        <span id="patokan-ceklist-badge" style="margin-left:auto;background:#dcfce7;color:#059669;padding:2px 8px;border-radius:12px;font-size:10px;display:${ceklistOK?'inline':'none'};">✅ OK</span>
                    </div>
                    ${patokanRow('ceklist', 'mudah', cmK, cl.mudah_keluar, cmB, cl.mudah_bank)}
                    ${patokanRow('ceklist', 'sedang', csK, cl.sedang_keluar, csB, cl.sedang_bank)}
                    ${patokanRow('ceklist', 'sulit', csuK, cl.sulit_keluar, csuB, cl.sulit_bank)}
                    <div id="patokan-ceklist-total" style="display:flex;align-items:center;padding:8px 8px 0;font-size:11px;font-weight:700;gap:8px;margin-top:6px;border-top:2px solid #e2e8f0;color:#166534;">
                        <span style="width:55px;">Total</span>
                        <span class="patokan-total-k" style="flex:1;color:${clr(ceklistK,tCeklistK)};">Keluar ${ceklistK}/${tCeklistK} ${ico(ceklistK,tCeklistK)}</span>
                        <span class="patokan-total-b" style="flex:1;color:${clr(ceklistB,tCeklistB)};">Bank ${ceklistB}/${tCeklistB} ${ico(ceklistB,tCeklistB)}</span>
                    </div>
                </div>
                
                <!-- ========== ESSAY CARD ========== -->
                <div id="patokan-essay-card" style="background:linear-gradient(135deg,#f8fafc,#fffbeb);border-radius:12px;padding:14px 16px;border:1.5px solid ${essayOK ? '#bbf7d0' : '#e2e8f0'};">
                    <div style="font-weight:700;color:#92400e;margin-bottom:12px;font-size:13px;display:flex;align-items:center;gap:6px;">
                        <span style="background:#fef3c7;width:24px;height:24px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;">📄</span> Essay (Uraian)
                        <span id="patokan-essay-badge" style="margin-left:auto;background:#dcfce7;color:#059669;padding:2px 8px;border-radius:12px;font-size:10px;display:${essayOK?'inline':'none'};">✅ OK</span>
                    </div>
                    ${patokanRow('essay', 'mudah', emK, ur.mudah_keluar, emB, ur.mudah_bank)}
                    ${patokanRow('essay', 'sedang', esK, ur.sedang_keluar, esB, ur.sedang_bank)}
                    ${patokanRow('essay', 'sulit', esuK, ur.sulit_keluar, esuB, ur.sulit_bank)}
                    <div id="patokan-essay-total" style="display:flex;align-items:center;padding:8px 8px 0;font-size:11px;font-weight:700;gap:8px;margin-top:6px;border-top:2px solid #e2e8f0;color:#92400e;">
                        <span style="width:55px;">Total</span>
                        <span class="patokan-total-k" style="flex:1;color:${clr(essayK,tEssayK)};">Keluar ${essayK}/${tEssayK} ${ico(essayK,tEssayK)}</span>
                        <span class="patokan-total-b" style="flex:1;color:${clr(essayB,tEssayB)};">Bank ${essayB}/${tEssayB} ${ico(essayB,tEssayB)}</span>
                    </div>
                </div>
            </div>
            
            <!-- ========== GRAND TOTAL BAR ========== -->
            <div id="matrix-grand-total" style="text-align:center;padding:14px 20px;border-radius:12px;font-weight:700;font-size:14px;${allOK ? 'background:linear-gradient(135deg,#dcfce7,#d1fae5);color:#065f46;border:2px solid #6ee7b7;' : 'background:linear-gradient(135deg,#fef2f2,#fee2e2);color:#991b1b;border:2px solid #fca5a5;'}">
                ${allOK 
                    ? '🎉 Semua Sesuai Patokan! · Total Keluar: ' + totalK + '/' + tTotalK + ' · Total Bank: ' + totalB + '/' + tTotalB + ' · Siap Submit!'
                    : '⚠️ Belum Sesuai · Total Keluar: ' + totalK + '/' + tTotalK + ' ❌ · Total Bank: ' + totalB + '/' + tTotalB + ' ❌ · Lengkapi hingga semua ✅'}
            </div>
        </div>
        
        <!-- ==================== TABEL INPUT ==================== -->
        <div style="background:white;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <div style="overflow-x:auto;max-height:50vh;">
                <table class="matrix-input-table" style="width:100%;border-collapse:collapse;font-size:13px;min-width:1500px;">
                    <thead>
                        <tr style="background:#f8fafc;">
                            <th rowspan="2" style="padding:10px 8px;border-bottom:2px solid #e2e8f0;width:40px;font-size:11px;color:#64748b;position:sticky;top:0;z-index:5;background:#f8fafc;">No</th>
                            <th rowspan="2" style="padding:10px 12px;border-bottom:2px solid #e2e8f0;width:170px;text-align:left;font-size:11px;color:#64748b;position:sticky;top:0;z-index:5;background:#f8fafc;">Nama Chapter</th>
                            
                            <th colspan="2" style="padding:8px 4px;border-bottom:2px solid #bfdbfe;background:#eff6ff;color:#1e40af;font-size:11px;position:sticky;top:0;z-index:5;">Pilgan<br>Mudah</th>
                            <th colspan="2" style="padding:8px 4px;border-bottom:2px solid #bfdbfe;background:#eff6ff;color:#1e40af;font-size:11px;position:sticky;top:0;z-index:5;">Pilgan<br>Sedang</th>
                            <th colspan="2" style="padding:8px 4px;border-bottom:2px solid #bfdbfe;background:#eff6ff;color:#1e40af;font-size:11px;position:sticky;top:0;z-index:5;">Pilgan<br>Sulit</th>
                            
                            <th colspan="2" style="padding:8px 4px;border-bottom:2px solid #bbf7d0;background:#f0fdf4;color:#166534;font-size:11px;position:sticky;top:0;z-index:5;">Ceklist<br>Mudah</th>
                            <th colspan="2" style="padding:8px 4px;border-bottom:2px solid #bbf7d0;background:#f0fdf4;color:#166534;font-size:11px;position:sticky;top:0;z-index:5;">Ceklist<br>Sedang</th>
                            <th colspan="2" style="padding:8px 4px;border-bottom:2px solid #bbf7d0;background:#f0fdf4;color:#166534;font-size:11px;position:sticky;top:0;z-index:5;">Ceklist<br>Sulit</th>
                            
                            <th colspan="2" style="padding:8px 4px;border-bottom:2px solid #fde68a;background:#fffbeb;color:#92400e;font-size:11px;position:sticky;top:0;z-index:5;">Essay<br>Mudah</th>
                            <th colspan="2" style="padding:8px 4px;border-bottom:2px solid #fde68a;background:#fffbeb;color:#92400e;font-size:11px;position:sticky;top:0;z-index:5;">Essay<br>Sedang</th>
                            <th colspan="2" style="padding:8px 4px;border-bottom:2px solid #fde68a;background:#fffbeb;color:#92400e;font-size:11px;position:sticky;top:0;z-index:5;">Essay<br>Sulit</th>
                            
                            <th rowspan="2" style="padding:10px 8px;border-bottom:2px solid #e2e8f0;width:44px;font-size:11px;color:#64748b;position:sticky;top:0;z-index:5;background:#f8fafc;">Hapus</th>
                        </tr>
                        <tr style="background:#fafafa;">
                            <th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Keluar</th><th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Bank</th>
                            <th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Keluar</th><th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Bank</th>
                            <th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Keluar</th><th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Bank</th>
                            
                            <th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Keluar</th><th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Bank</th>
                            <th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Keluar</th><th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Bank</th>
                            <th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Keluar</th><th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Bank</th>
                            
                            <th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Keluar</th><th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Bank</th>
                            <th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Keluar</th><th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Bank</th>
                            <th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Keluar</th><th style="padding:5px 2px;border-bottom:2px solid #e2e8f0;font-size:10px;color:#64748b;font-weight:500;">Bank</th>
                        </tr>
                    </thead>
                    <tbody id="matrix-tbody">
                        ${renderMatrixRows(chapters)}
                    </tbody>
                    <tfoot>
                        ${renderMatrixFooter(totals, patokan)}
                    </tfoot>
                </table>
            </div>
        </div>
        
        <!-- ==================== LEGEND ==================== -->
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:16px;font-size:11px;color:#94a3b8;padding:10px 4px;">
            <span><span style="display:inline-block;width:10px;height:10px;background:#eff6ff;border-radius:3px;border:1px solid #bfdbfe;vertical-align:middle;margin-right:4px;"></span> Pilgan</span>
            <span><span style="display:inline-block;width:10px;height:10px;background:#f0fdf4;border-radius:3px;border:1px solid #bbf7d0;vertical-align:middle;margin-right:4px;"></span> Ceklist</span>
            <span><span style="display:inline-block;width:10px;height:10px;background:#fffbeb;border-radius:3px;border:1px solid #fde68a;vertical-align:middle;margin-right:4px;"></span> Essay</span>
            <span style="color:#cbd5e1;">|</span>
            <span><strong>Keluar</strong> = Soal yang diujikan</span>
            <span><strong>Bank</strong> = Soal di bank soal</span>
        </div>
    `;
    
    attachMatrixListeners();
}

function renderMatrixRows(chapters) {
    const fields = getMatrixFields();
    let html = '';
    
    chapters.forEach((ch, i) => {
        html += `<tr class="matrix-row" style="transition:background 0.15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">`;
        html += `<td style="padding:6px;border:1px solid #e2e8f0;text-align:center;font-weight:600;">${i + 1}</td>`;
        html += `<td style="padding:4px;border:1px solid #e2e8f0;"><input type="text" value="${escHTML(ch.name)}" data-id="${ch.id}" data-field="name" style="width:100%;padding:6px 8px;border:1px solid #e2e8f0;border-radius:6px;font-size:12px;" placeholder="Nama Chapter..."></td>`;
        
        fields.forEach(f => {
            const val = ch.data[f.key] ?? 0;
            html += `<td style="padding:3px;border:1px solid #e2e8f0;"><input type="number" value="${val}" data-id="${ch.id}" data-field="${f.key}" style="width:100%;padding:5px 3px;border:1px solid #e2e8f0;border-radius:6px;font-size:11px;text-align:center;" min="0"></td>`;
        });
        
        html += `<td style="padding:4px;border:1px solid #e2e8f0;text-align:center;">
            <button onclick="deleteMatrixChapter('${ch.id}')" style="background:none;border:none;color:#94a3b8;cursor:pointer;padding:4px 8px;border-radius:6px;" title="Hapus Chapter"><i class="fas fa-trash"></i></button>
        </td>`;
        html += `</tr>`;
    });
    
    return html;
}

function renderMatrixFooter(totals, patokan) {
    const fields = getMatrixFields();
    const targetMap = getMatrixTargetMap(patokan);
    
    // Row TOTAL
    let html = '<tr class="matrix-total-row" style="font-weight:700;background:#f1f5f9;">';
    html += '<td colspan="2" style="padding:8px;border:1px solid #e2e8f0;text-align:right;color:#1e40af;position:sticky;left:0;background:#f1f5f9;z-index:5;">TOTAL</td>';
    fields.forEach(f => {
        const total = totals[f.key] || 0;
        const target = targetMap[f.key];
        const ok = total === target;
        html += `<td id="total-${f.key}" style="padding:6px;border:1px solid #e2e8f0;text-align:center;font-size:11px;${ok?'background:#dcfce7;color:#16a34a':'background:#fef2f2;color:#dc2626'}">${total}</td>`;
    });
    html += '<td style="padding:8px;border:1px solid #e2e8f0;background:#f1f5f9;"></td></tr>';
    
    // Row VALIDASI
    html += '<tr class="matrix-valid-row" style="font-weight:700;background:#fffbeb;">';
    html += '<td colspan="2" style="padding:8px;border:1px solid #e2e8f0;text-align:right;color:#92400e;position:sticky;left:0;background:#fffbeb;z-index:5;">Validasi</td>';
    fields.forEach(f => {
        const total = totals[f.key] || 0;
        const target = targetMap[f.key];
        const ok = total === target;
        html += `<td id="valid-${f.key}" style="padding:6px;border:1px solid #e2e8f0;text-align:center;font-size:14px;">${ok?'✅':'❌'}</td>`;
    });
    html += '<td style="padding:8px;border:1px solid #e2e8f0;background:#fffbeb;"></td></tr>';
    
    return html;
}

function getMatrixFields() {
    const types = ['pilgan','ceklist','essay'];
    const levels = ['mudah','sedang','sulit'];
    const metrics = ['keluar','bank'];
    const result = [];
    types.forEach(t => levels.forEach(l => metrics.forEach(m => result.push({key: `${t}_${l}_${m}`, type:t, level:l, metric:m}))));
    return result;
}

function getMatrixTargetMap(patokan) {
    return {
        pilgan_mudah_keluar: patokan.multiple_choice.mudah_keluar,
        pilgan_mudah_bank: patokan.multiple_choice.mudah_bank,
        pilgan_sedang_keluar: patokan.multiple_choice.sedang_keluar,
        pilgan_sedang_bank: patokan.multiple_choice.sedang_bank,
        pilgan_sulit_keluar: patokan.multiple_choice.sulit_keluar,
        pilgan_sulit_bank: patokan.multiple_choice.sulit_bank,
        ceklist_mudah_keluar: patokan.checklist.mudah_keluar,
        ceklist_mudah_bank: patokan.checklist.mudah_bank,
        ceklist_sedang_keluar: patokan.checklist.sedang_keluar,
        ceklist_sedang_bank: patokan.checklist.sedang_bank,
        ceklist_sulit_keluar: patokan.checklist.sulit_keluar,
        ceklist_sulit_bank: patokan.checklist.sulit_bank,
        essay_mudah_keluar: patokan.uraian.mudah_keluar,
        essay_mudah_bank: patokan.uraian.mudah_bank,
        essay_sedang_keluar: patokan.uraian.sedang_keluar,
        essay_sedang_bank: patokan.uraian.sedang_bank,
        essay_sulit_keluar: patokan.uraian.sulit_keluar,
        essay_sulit_bank: patokan.uraian.sulit_bank
    };
}

function calculateMatrixTotals() {
    const fields = getMatrixFields();
    const totals = {};
    fields.forEach(f => {
        totals[f.key] = MATRIX_STATE.chapters.reduce((sum, ch) => sum + (ch.data[f.key] || 0), 0);
    });
    return totals;
}

function attachMatrixListeners() {
    const tbody = document.getElementById('matrix-tbody');
    if (!tbody) return;
    
    tbody.querySelectorAll('input').forEach(inp => {
        const newInp = inp.cloneNode(true);
        inp.parentNode.replaceChild(newInp, inp);
        
        newInp.addEventListener('input', function() {
            const id = this.dataset.id;
            const field = this.dataset.field;
            const ch = MATRIX_STATE.chapters.find(c => c.id == id);
            if (!ch) return;
            
            if (field === 'name') {
                ch.name = this.value;
            } else {
                ch.data[field] = parseInt(this.value) || 0;
            }
            
            // Hanya update footer + patokan + tombol (TANPA re-render)
            updateMatrixFooter();
            updateMatrixPatokan();
        });
    });
}

// ==================== PARTIAL UPDATE FUNCTIONS ====================

function updateMatrixFooter() {
    const totals = calculateMatrixTotals();
    const patokan = MATRIX_STATE.patokan;
    if (!patokan) return;
    
    const targetMap = getMatrixTargetMap(patokan);
    const fields = getMatrixFields();
    
    fields.forEach(f => {
        const totalEl = document.getElementById(`total-${f.key}`);
        const validEl = document.getElementById(`valid-${f.key}`);
        
        const total = totals[f.key] || 0;
        const target = targetMap[f.key];
        const ok = total === target;
        
        if (totalEl) {
            totalEl.textContent = total;
            totalEl.style.background = ok ? '#dcfce7' : '#fef2f2';
            totalEl.style.color = ok ? '#16a34a' : '#dc2626';
        }
        
        if (validEl) {
            validEl.textContent = ok ? '✅' : '❌';
        }
    });
}

function updateMatrixPatokan() {
    const totals = calculateMatrixTotals();
    const patokan = MATRIX_STATE.patokan;
    if (!patokan) return;
    
    const mc = patokan.multiple_choice;
    const cl = patokan.checklist;
    const ur = patokan.uraian;
    
    // Update Pilgan card
    updateSingleCard('pilgan', [
        { level: 'mudah', k: totals.pilgan_mudah_keluar || 0, b: totals.pilgan_mudah_bank || 0, tk: mc.mudah_keluar, tb: mc.mudah_bank },
        { level: 'sedang', k: totals.pilgan_sedang_keluar || 0, b: totals.pilgan_sedang_bank || 0, tk: mc.sedang_keluar, tb: mc.sedang_bank },
        { level: 'sulit', k: totals.pilgan_sulit_keluar || 0, b: totals.pilgan_sulit_bank || 0, tk: mc.sulit_keluar, tb: mc.sulit_bank }
    ], mc.mudah_keluar + mc.sedang_keluar + mc.sulit_keluar, mc.mudah_bank + mc.sedang_bank + mc.sulit_bank);
    
    // Update Ceklist card
    updateSingleCard('ceklist', [
        { level: 'mudah', k: totals.ceklist_mudah_keluar || 0, b: totals.ceklist_mudah_bank || 0, tk: cl.mudah_keluar, tb: cl.mudah_bank },
        { level: 'sedang', k: totals.ceklist_sedang_keluar || 0, b: totals.ceklist_sedang_bank || 0, tk: cl.sedang_keluar, tb: cl.sedang_bank },
        { level: 'sulit', k: totals.ceklist_sulit_keluar || 0, b: totals.ceklist_sulit_bank || 0, tk: cl.sulit_keluar, tb: cl.sulit_bank }
    ], cl.mudah_keluar + cl.sedang_keluar + cl.sulit_keluar, cl.mudah_bank + cl.sedang_bank + cl.sulit_bank);
    
    // Update Essay card
    updateSingleCard('essay', [
        { level: 'mudah', k: totals.essay_mudah_keluar || 0, b: totals.essay_mudah_bank || 0, tk: ur.mudah_keluar, tb: ur.mudah_bank },
        { level: 'sedang', k: totals.essay_sedang_keluar || 0, b: totals.essay_sedang_bank || 0, tk: ur.sedang_keluar, tb: ur.sedang_bank },
        { level: 'sulit', k: totals.essay_sulit_keluar || 0, b: totals.essay_sulit_bank || 0, tk: ur.sulit_keluar, tb: ur.sulit_bank }
    ], ur.mudah_keluar + ur.sedang_keluar + ur.sulit_keluar, ur.mudah_bank + ur.sedang_bank + ur.sulit_bank);
    
    // Update grand total
    updateGrandTotal();
}

function updateSingleCard(prefix, levels, totalKTarget, totalBTarget) {
    levels.forEach(l => {
        const kOK = l.k === l.tk;
        const bOK = l.b === l.tb;
        
        const rowEl = document.getElementById(`patokan-${prefix}-${l.level}`);
        if (rowEl) {
            const kEl = rowEl.querySelector('.patokan-k');
            const bEl = rowEl.querySelector('.patokan-b');
            
            if (kEl) {
                kEl.innerHTML = `<span style="font-size:10px;color:#64748b;">Keluar</span> ${l.k}<span style="color:#cbd5e1;">/</span>${l.tk} ${kOK?'✅':'❌'}`;
                kEl.style.color = kOK ? '#059669' : '#dc2626';
            }
            if (bEl) {
                bEl.innerHTML = `<span style="font-size:10px;color:#64748b;">Bank</span> ${l.b}<span style="color:#cbd5e1;">/</span>${l.tb} ${bOK?'✅':'❌'}`;
                bEl.style.color = bOK ? '#059669' : '#dc2626';
            }
            
            rowEl.style.background = (kOK && bOK) ? '#f8fafc' : '#fef2f2';
        }
    });
    
    const totalK = levels.reduce((s, l) => s + l.k, 0);
    const totalB = levels.reduce((s, l) => s + l.b, 0);
    const kOK = totalK === totalKTarget;
    const bOK = totalB === totalBTarget;
    const allOK = kOK && bOK && levels.every(l => l.k === l.tk && l.b === l.tb);
    
    const totalRowEl = document.getElementById(`patokan-${prefix}-total`);
    if (totalRowEl) {
        const kEl = totalRowEl.querySelector('.patokan-total-k');
        const bEl = totalRowEl.querySelector('.patokan-total-b');
        if (kEl) {
            kEl.innerHTML = `Keluar ${totalK}/${totalKTarget} ${kOK?'✅':'❌'}`;
            kEl.style.color = kOK ? '#059669' : '#dc2626';
        }
        if (bEl) {
            bEl.innerHTML = `Bank ${totalB}/${totalBTarget} ${bOK?'✅':'❌'}`;
            bEl.style.color = bOK ? '#059669' : '#dc2626';
        }
    }
    
    const badgeEl = document.getElementById(`patokan-${prefix}-badge`);
    if (badgeEl) {
        badgeEl.style.display = allOK ? 'inline' : 'none';
    }
    
    const cardEl = document.getElementById(`patokan-${prefix}-card`);
    if (cardEl) {
        cardEl.style.borderColor = allOK ? '#bbf7d0' : '#e2e8f0';
    }
}

function updateGrandTotal() {
    const totals = calculateMatrixTotals();
    const patokan = MATRIX_STATE.patokan;
    if (!patokan) return;
    
    const mc = patokan.multiple_choice;
    const cl = patokan.checklist;
    const ur = patokan.uraian;
    
    const pilganK = (totals.pilgan_mudah_keluar||0) + (totals.pilgan_sedang_keluar||0) + (totals.pilgan_sulit_keluar||0);
    const pilganB = (totals.pilgan_mudah_bank||0) + (totals.pilgan_sedang_bank||0) + (totals.pilgan_sulit_bank||0);
    const ceklistK = (totals.ceklist_mudah_keluar||0) + (totals.ceklist_sedang_keluar||0) + (totals.ceklist_sulit_keluar||0);
    const ceklistB = (totals.ceklist_mudah_bank||0) + (totals.ceklist_sedang_bank||0) + (totals.ceklist_sulit_bank||0);
    const essayK = (totals.essay_mudah_keluar||0) + (totals.essay_sedang_keluar||0) + (totals.essay_sulit_keluar||0);
    const essayB = (totals.essay_mudah_bank||0) + (totals.essay_sedang_bank||0) + (totals.essay_sulit_bank||0);
    
    const tPilganK = mc.mudah_keluar + mc.sedang_keluar + mc.sulit_keluar;
    const tPilganB = mc.mudah_bank + mc.sedang_bank + mc.sulit_bank;
    const tCeklistK = cl.mudah_keluar + cl.sedang_keluar + cl.sulit_keluar;
    const tCeklistB = cl.mudah_bank + cl.sedang_bank + cl.sulit_bank;
    const tEssayK = ur.mudah_keluar + ur.sedang_keluar + ur.sulit_keluar;
    const tEssayB = ur.mudah_bank + ur.sedang_bank + ur.sulit_bank;
    
    const totalK = pilganK + ceklistK + essayK;
    const totalB = pilganB + ceklistB + essayB;
    const tTotalK = tPilganK + tCeklistK + tEssayK;
    const tTotalB = tPilganB + tCeklistB + tEssayB;
    
    const allOK = (pilganK===tPilganK && pilganB===tPilganB) && 
                  (ceklistK===tCeklistK && ceklistB===tCeklistB) && 
                  (essayK===tEssayK && essayB===tEssayB);
    
    const el = document.getElementById('matrix-grand-total');
    if (el) {
        el.innerHTML = allOK 
            ? `🎉 Semua Sesuai Patokan! · Total Keluar: ${totalK}/${tTotalK} · Total Bank: ${totalB}/${tTotalB} · Siap Submit!`
            : `⚠️ Belum Sesuai · Total Keluar: ${totalK}/${tTotalK} ❌ · Total Bank: ${totalB}/${tTotalB} ❌ · Lengkapi hingga semua ✅`;
        el.style.background = allOK ? 'linear-gradient(135deg,#dcfce7,#d1fae5)' : 'linear-gradient(135deg,#fef2f2,#fee2e2)';
        el.style.color = allOK ? '#065f46' : '#991b1b';
        el.style.border = allOK ? '2px solid #6ee7b7' : '2px solid #fca5a5';
    }
    
    // Update submit button
    updateSubmitButton();
}

function updateSubmitButton() {
    const totals = calculateMatrixTotals();
    const patokan = MATRIX_STATE.patokan;
    if (!patokan) return;
    
    const targetMap = getMatrixTargetMap(patokan);
    const fields = getMatrixFields();
    
    let allOK = true;
    for (let f of fields) {
        if ((totals[f.key] || 0) !== targetMap[f.key]) {
            allOK = false;
            break;
        }
    }
    
    const btn = document.getElementById('btn-submit-matrix');
    if (btn) {
        btn.disabled = !allOK;
        btn.style.opacity = allOK ? '1' : '0.5';
    }
}

function addMatrixChapter() {
    const nextNum = MATRIX_STATE.chapters.length + 1;
    MATRIX_STATE.chapters.push(createMatrixChapter(`Chapter ${nextNum}`));
    const container = document.getElementById('matrix-container');
    if (container) renderMatrixPage(container);
}

function deleteMatrixChapter(id) {
    if (MATRIX_STATE.chapters.length <= 1) {
        return Swal.fire('Oops', 'Minimal harus ada 1 chapter.', 'warning');
    }
    MATRIX_STATE.chapters = MATRIX_STATE.chapters.filter(c => c.id != id);
    const container = document.getElementById('matrix-container');
    if (container) renderMatrixPage(container);
}

async function submitMatrix() {
    const totals = calculateMatrixTotals();
    const patokan = MATRIX_STATE.patokan;
    const targetMap = getMatrixTargetMap(patokan);
    
    let allValid = true;
    const fields = getMatrixFields();
    for (let f of fields) {
        if ((totals[f.key] || 0) !== targetMap[f.key]) {
            allValid = false;
            break;
        }
    }
    
    if (!allValid) {
        return Swal.fire('Belum Sesuai', 'Jumlah soal belum sesuai patokan. Periksa kembali input Anda.', 'warning');
    }
    
    const confirm = await Swal.fire({
        title: 'Konfirmasi Submit',
        text: 'Matrix yang sudah disubmit tidak bisa diedit kembali. Lanjutkan?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Submit',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#16a34a'
    });
    
    if (!confirm.isConfirmed) return;
    
    Swal.fire({ title: 'Menyimpan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    const res = await saveMatrixToServer(MATRIX_STATE.chapters);
    
    if (res.success) {
        MATRIX_STATE.isSubmitted = true;
        await refreshTeacherData();
        
        Swal.fire({ title: 'Berhasil!', text: 'Matrix berhasil disubmit.', icon: 'success', confirmButtonColor: '#16a34a' });
        closeMatrixInput();
        renderUploadCards();
    } else {
        Swal.fire('Error', res.message || 'Gagal menyimpan matrix', 'error');
    }
}

function escHTML(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

// Expose ke global scope
window.openMatrixInput = openMatrixInput;
window.closeMatrixInput = closeMatrixInput;
window.addMatrixChapter = addMatrixChapter;
window.deleteMatrixChapter = deleteMatrixChapter;
window.submitMatrix = submitMatrix;