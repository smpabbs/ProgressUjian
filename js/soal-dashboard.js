// ==================== SOAL DASHBOARD ====================
// Halaman utama input soal - menampilkan list chapter & progress

function renderSoalDashboard(container) {
    if (!container) return;
    
    const chapters = SOAL_STATE.chapters;
    const progress = calculateSoalProgress();
    
    const types = ['pilgan', 'ceklist', 'essay'];
    const levels = ['mudah', 'sedang', 'sulit'];
    
    let chapterCards = '';
    
    chapters.forEach((ch, chIndex) => {
        const chProgress = progress.chapters[ch.name] || { target: 0, completed: 0, percent: 0 };
        
        let rows = '';
        types.forEach(type => {
            levels.forEach(level => {
                const target = ch.data[`${type}_${level}_keluar`] || 0;
                if (target > 0) {
                    const completed = getCompletedCount(ch.name, type, level);
                    const isFull = completed >= target;
                    const isEmpty = completed === 0;
                    
                    let statusIcon = '⬜';
                    let statusColor = '#94a3b8';
                    let buttonText = 'Mulai';
                    let buttonClass = 'btn-outline';
                    
                    if (isFull) {
                        statusIcon = '✅';
                        statusColor = '#059669';
                        buttonText = 'Lihat';
                        buttonClass = 'btn-info';
                    } else if (!isEmpty) {
                        statusIcon = '⚠️';
                        statusColor = '#f59e0b';
                        buttonText = 'Lanjut';
                        buttonClass = 'btn-warning';
                    }
                    
                    rows += `
                    <tr>
                        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">
                            <span style="font-size:16px;">${getTipeIcon(type)}</span>
                            <span style="font-weight:500;margin-left:4px;">${formatTipeLabel(type)}</span>
                        </td>
                        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;">
                            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${getDifficultyColor(level)};margin-right:6px;"></span>
                            ${formatDifficultyLabel(level)}
                        </td>
                        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;color:#475569;">
                            ${target}
                        </td>
                        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">
                            <span style="color:${statusColor};font-weight:600;">${completed}/${target} ${statusIcon}</span>
                        </td>
                        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;text-align:center;">
                            <button class="btn ${buttonClass}" style="padding:6px 14px;font-size:11px;"
                                    onclick="openSoalEditor('${escHTML(ch.name)}', '${type}', '${level}')">
                                <i class="fas fa-${isFull ? 'eye' : 'edit'}"></i> ${buttonText}
                            </button>
                        </td>
                    </tr>`;
                }
            });
        });
        
        chapterCards += `
        <div style="background:white;border-radius:14px;padding:18px 20px;margin-bottom:14px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                <h3 style="margin:0;font-size:15px;font-weight:700;color:#0f172a;">
                    <span style="display:inline-block;width:24px;height:24px;background:#eff6ff;border-radius:6px;text-align:center;line-height:24px;font-size:12px;margin-right:8px;color:#2563eb;">${chIndex + 1}</span>
                    ${escHTML(ch.name)}
                </h3>
                <span style="font-size:13px;font-weight:600;color:${chProgress.percent === 100 ? '#059669' : '#64748b'};">
                    ${chProgress.completed}/${chProgress.target} (${chProgress.percent}%)
                    ${chProgress.percent === 100 ? ' ✅' : ''}
                </span>
            </div>
            
            <!-- Mini progress bar -->
            <div style="height:5px;background:#e2e8f0;border-radius:5px;margin-bottom:14px;overflow:hidden;">
                <div style="height:100%;width:${chProgress.percent}%;background:${chProgress.percent === 100 ? '#10b981' : '#3b82f6'};border-radius:5px;transition:width 0.3s;"></div>
            </div>
            
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
                <thead>
                    <tr style="background:#f8fafc;">
                        <th style="padding:8px 12px;text-align:left;font-size:10px;color:#64748b;">Tipe</th>
                        <th style="padding:8px 12px;text-align:left;font-size:10px;color:#64748b;">Level</th>
                        <th style="padding:8px 12px;text-align:center;font-size:10px;color:#64748b;">Target</th>
                        <th style="padding:8px 12px;text-align:center;font-size:10px;color:#64748b;">Selesai</th>
                        <th style="padding:8px 12px;text-align:center;font-size:10px;color:#64748b;">Aksi</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    });
    
    container.innerHTML = `
        <!-- HEADER -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;background:white;border-radius:14px;padding:16px 20px;margin-bottom:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
            <div>
                <h2 style="margin:0;font-size:18px;font-weight:700;color:#0f172a;">
                    <i class="fas fa-edit" style="color:#2563eb;"></i> Input Soal Manual
                </h2>
                <p style="margin:2px 0 0;font-size:12px;color:#64748b;">
                    ${ACTIVE_USER.mapel} · Kelas ${ACTIVE_USER.level} · ${ACTIVE_USER.nama}
                </p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-outline" onclick="closeSoalInput()" style="padding:10px 16px;font-size:13px;">
                    <i class="fas fa-arrow-left"></i> Kembali
                </button>
                ${progress.isComplete ? `
                <button class="btn btn-success" onclick="submitAllSoalsToValidator()" style="padding:10px 20px;font-size:13px;font-weight:600;">
                    <i class="fas fa-paper-plane"></i> Submit Semua Soal
                </button>` : ''}
            </div>
        </div>
        
        <!-- PROGRESS BAR KESELURUHAN -->
        <div style="background:white;border-radius:14px;padding:16px 20px;margin-bottom:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.03);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-weight:700;font-size:14px;color:#0f172a;">📊 Progress Keseluruhan</span>
                <span style="font-weight:700;font-size:14px;color:${progress.totalPercent === 100 ? '#059669' : '#2563eb'};">
                    ${progress.totalCompleted}/${progress.totalTarget} soal (${progress.totalPercent}%)
                </span>
            </div>
            <div style="height:8px;background:#e2e8f0;border-radius:8px;overflow:hidden;">
                <div style="height:100%;width:${progress.totalPercent}%;background:${progress.totalPercent === 100 ? 'linear-gradient(90deg,#10b981,#059669)' : 'linear-gradient(90deg,#3b82f6,#2563eb)'};border-radius:8px;transition:width 0.3s;"></div>
            </div>
            ${!progress.isComplete ? `
            <p style="margin-top:8px;font-size:11px;color:#94a3b8;text-align:center;">
                Lengkapi semua soal untuk dapat mengirim ke validator
            </p>` : `
            <p style="margin-top:8px;font-size:11px;color:#059669;text-align:center;font-weight:600;">
                🎉 Semua soal sudah lengkap! Klik "Submit Semua Soal" untuk mengirim ke validator.
            </p>`}
        </div>
        
        <!-- CHAPTER CARDS -->
        ${chapterCards}
    `;
}

/**
 * Buka editor untuk input soal
 */
function openSoalEditor(chapterName, type, difficulty) {
    SOAL_STATE.currentChapter = chapterName;
    SOAL_STATE.currentType = type;
    SOAL_STATE.currentDifficulty = difficulty;
    SOAL_STATE.currentSoalIndex = 0;
    SOAL_STATE.viewMode = 'editor';
    
    const container = document.getElementById('soal-container');
    if (container && typeof renderSoalEditor === 'function') {
        renderSoalEditor(container);
    }
}

/**
 * Submit semua soal ke validator
 */
async function submitAllSoalsToValidator() {
    const confirm = await Swal.fire({
        title: 'Submit Semua Soal?',
        text: 'Soal yang sudah dikirim tidak bisa diedit kembali. Lanjutkan?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Submit',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#16a34a'
    });
    
    if (!confirm.isConfirmed) return;
    
    Swal.fire({ title: 'Mengirim...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    const res = await submitAllSoals();
    
    if (res.success) {
        await refreshTeacherData();
        Swal.fire({ title: 'Berhasil!', text: 'Soal telah dikirim ke validator.', icon: 'success', confirmButtonColor: '#16a34a' });
        closeSoalInput();
        renderUploadCards();
    } else {
        Swal.fire('Error', res.message || 'Gagal submit soal', 'error');
    }
}

/**
 * Set filter dashboard
 */
function setSoalFilter(filter) {
    SOAL_STATE.revisionFilter = filter;
    const container = document.getElementById('soal-container');
    if (container) renderSoalDashboard(container);
}

/**
 * Kirim revisi soal ke validator
 */
async function submitRevisiToValidator() {
    if (!hasPendingRevisi()) {
        return Swal.fire('Info', 'Tidak ada revisi yang perlu dikirim.', 'info');
    }
    
    const confirm = await Swal.fire({
        title: 'Kirim Revisi?',
        text: 'Soal yang sudah direvisi akan dikirim ke validator. Lanjutkan?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Kirim',
        cancelButtonText: 'Batal',
        confirmButtonColor: '#16a34a'
    });
    
    if (!confirm.isConfirmed) return;
    
    Swal.fire({ title: 'Mengirim...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    
    const res = await submitRevisi();
    
    if (res.success) {
        await refreshTeacherData();
        Swal.fire({ title: 'Berhasil!', text: 'Revisi telah dikirim ke validator.', icon: 'success', confirmButtonColor: '#16a34a' });
        closeSoalInput();
        renderUploadCards();
    } else {
        Swal.fire('Error', res.message || 'Gagal mengirim revisi', 'error');
    }
}

// Expose
window.setSoalFilter = setSoalFilter;
window.submitRevisiToValidator = submitRevisiToValidator;
// Expose
window.openSoalEditor = openSoalEditor;
window.submitAllSoalsToValidator = submitAllSoalsToValidator;