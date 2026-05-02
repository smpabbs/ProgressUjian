// ==================== SOAL GENERATE ====================
// Generate kartu soal format Word

/**
 * Generate kartu soal dan download sebagai file .doc
 */
async function generateKartuSoal() {
    Swal.fire({
        title: 'Membuat dokumen...',
        text: 'Mohon tunggu sebentar',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });
    
    try {
        const res = await generateWordSoal();
        Swal.close();
        
        if (res.success && res.html) {
            // Download sebagai file .doc
            downloadAsWord(res.html, `KartuSoal_${ACTIVE_USER.mapel}_Kelas${ACTIVE_USER.level}_${ACTIVE_USER.nama}.doc`);
            
            Swal.fire({
                title: 'Berhasil!',
                text: 'Kartu soal berhasil didownload.',
                icon: 'success',
                timer: 2500,
                showConfirmButton: false
            });
        } else {
            // Generate dari data lokal jika server tidak support
            const soals = flattenAllSoals();
            const html = buildKartuSoalHTML(soals);
            downloadAsWord(html, `KartuSoal_${ACTIVE_USER.mapel}_Kelas${ACTIVE_USER.level}_${ACTIVE_USER.nama}.doc`);
            
            Swal.fire({
                title: 'Berhasil!',
                text: 'Kartu soal dibuat dari data lokal.',
                icon: 'success',
                timer: 2500,
                showConfirmButton: false
            });
        }
    } catch (e) {
        console.error('Generate error:', e);
        Swal.fire('Error', 'Gagal membuat dokumen.', 'error');
    }
}

/**
 * Gabungkan semua soal jadi 1 array berurutan
 */
function flattenAllSoals() {
    const result = [];
    const chapters = SOAL_STATE.chapters;
    const types = ['pilgan', 'ceklist', 'essay'];
    const levels = ['mudah', 'sedang', 'sulit'];
    
    chapters.forEach(ch => {
        types.forEach(type => {
            levels.forEach(level => {
                const key = `${ch.name}_${type}_${level}`;
                const soals = SOAL_STATE.allSoals[key] || [];
                soals.forEach((s, i) => {
                    result.push({
                        ...s,
                        nomor: result.length + 1,
                        chapterName: ch.name,
                        typeLabel: formatTipeLabel(type),
                        difficultyLabel: formatDifficultyLabel(level)
                    });
                });
            });
        });
    });
    
    return result;
}

/**
 * Build HTML untuk kartu soal
 */
function buildKartuSoalHTML(soals) {
    const mapel = ACTIVE_USER?.mapel || 'Mapel';
    const level = ACTIVE_USER?.level || 'X';
    const guru = ACTIVE_USER?.nama || 'Guru';
    const tanggal = new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
    
    let cardsHTML = '';
    
    soals.forEach((s, i) => {
        let jawabanHTML = '';
        
        if (s.type === 'pilgan') {
            jawabanHTML = `
            <div style="margin-top:8px;">
                <div style="font-weight:600;font-size:11px;margin-bottom:4px;">Opsi Jawaban:</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;">
                    <div>A. ${escHTML(s.opsiA || '')} ${s.kunci === 'A' ? '✅' : ''}</div>
                    <div>B. ${escHTML(s.opsiB || '')} ${s.kunci === 'B' ? '✅' : ''}</div>
                    <div>C. ${escHTML(s.opsiC || '')} ${s.kunci === 'C' ? '✅' : ''}</div>
                    <div>D. ${escHTML(s.opsiD || '')} ${s.kunci === 'D' ? '✅' : ''}</div>
                </div>
                <div style="font-size:10px;color:#059669;margin-top:4px;">Kunci: ${s.kunci}</div>
            </div>`;
        } else if (s.type === 'ceklist') {
            const pernyataan = typeof s.pernyataan === 'string' ? JSON.parse(s.pernyataan || '[]') : (s.pernyataan || []);
            let itemsHTML = '';
            pernyataan.forEach((p, j) => {
                const label = String.fromCharCode(65 + j);
                itemsHTML += `<div style="font-size:11px;">${label}. ${escHTML(p.text)} → ${p.isTrue ? '✅ Benar' : '❌ Salah'}</div>`;
            });
            jawabanHTML = `
            <div style="margin-top:8px;">
                <div style="font-weight:600;font-size:11px;margin-bottom:4px;">Pernyataan:</div>
                ${itemsHTML}
            </div>`;
        } else if (s.type === 'essay') {
            jawabanHTML = `
            <div style="margin-top:8px;">
                <div style="font-weight:600;font-size:11px;margin-bottom:4px;">Kunci Jawaban:</div>
                <div style="font-size:11px;">${escHTML(s.jawabanEssay || '(Tidak ada)')}</div>
            </div>`;
        }
        
        cardsHTML += `
        <div style="border:2px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:16px;page-break-inside:avoid;background:white;">
            <!-- Header Kartu -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #e2e8f0;flex-wrap:wrap;gap:6px;">
                <div>
                    <span style="background:#2563eb;color:white;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">#${s.nomor}</span>
                    <span style="margin-left:6px;font-size:11px;color:#64748b;">${s.chapterName}</span>
                </div>
                <div style="display:flex;gap:6px;">
                    <span style="background:#f1f5f9;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:600;">${s.typeLabel}</span>
                    <span style="background:#f1f5f9;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:600;">${s.difficultyLabel}</span>
                    <span style="background:#f1f5f9;padding:2px 8px;border-radius:8px;font-size:10px;">Bobot: ${s.bobot || 1}</span>
                </div>
            </div>
            
            <!-- Pertanyaan -->
            <div style="font-size:13px;line-height:1.6;margin-bottom:8px;">
                <strong>Soal:</strong> ${s.pertanyaanHTML || s.pertanyaan || ''}
            </div>
            
            ${s.gambarSoal ? `<img src="${s.gambarSoal}" style="max-width:300px;margin-bottom:8px;border-radius:6px;">` : ''}
            
            ${jawabanHTML}
            
            <!-- Pembahasan -->
            ${s.pembahasan || s.pembahasanHTML ? `
            <div style="margin-top:8px;padding:8px;background:#fffbeb;border-radius:6px;font-size:11px;">
                <strong>Pembahasan:</strong> ${s.pembahasanHTML || s.pembahasan}
            </div>` : ''}
        </div>`;
    });
    
    return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
        <meta charset="UTF-8">
        <title>Kartu Soal - ${mapel} Kelas ${level}</title>
        <style>
            @page {
                size: A4;
                margin: 1.5cm;
            }
            body {
                font-family: Arial, sans-serif;
                font-size: 12px;
                color: #1e293b;
                line-height: 1.5;
            }
            .cover {
                text-align: center;
                padding: 40px 20px;
                page-break-after: always;
            }
            .cover h1 {
                font-size: 22px;
                color: #0f172a;
                margin-bottom: 8px;
            }
            .cover .info {
                font-size: 14px;
                color: #475569;
                margin-bottom: 4px;
            }
            .cover .badge {
                display: inline-block;
                background: #dcfce7;
                color: #059669;
                padding: 4px 16px;
                border-radius: 16px;
                font-size: 13px;
                font-weight: 600;
                margin-top: 12px;
            }
        </style>
    </head>
    <body>
        <!-- Cover -->
        <div class="cover">
            <h1>📋 KARTU SOAL</h1>
            <p class="info"><strong>${mapel}</strong></p>
            <p class="info">Kelas ${level}</p>
            <p class="info">Guru: ${guru}</p>
            <p class="info">Tanggal: ${tanggal}</p>
            <p class="info">Jumlah Soal: ${soals.length}</p>
            <span class="badge">✅ PSAT SMP Al Abidin</span>
        </div>
        
        <!-- Kartu Soal -->
        ${cardsHTML}
        
        <!-- Footer -->
        <div style="text-align:center;margin-top:20px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;">
            Dokumen dibuat otomatis oleh Sistem PSAT SMP Al Abidin
        </div>
    </body>
    </html>`;
}

/**
 * Download sebagai file .doc
 */
function downloadAsWord(html, filename) {
    const blob = new Blob(['\ufeff' + html], {
        type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Expose
window.generateKartuSoal = generateKartuSoal;
window.downloadAsWord = downloadAsWord;