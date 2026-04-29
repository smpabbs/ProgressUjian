// ==================== INISIALISASI UTAMA ====================
// File ini dijalankan terakhir setelah config.js, api.js, dan ui.js dimuat.
// Berisi event listener utama dan logika awal saat halaman dibuka.

window.onload = async () => {
    try {
        // Ambil data progress dari server untuk tampilan publik
        const res = await sendRequest("getProgress", {});

        if (res.success) {
            // Proses dan tambahkan metadata prioritas/badge ke setiap baris data
            GLOBAL_DATA = res.data.map(row => {
                const soalStatus = row.docs.Soal;

                if      (soalStatus === 'yellow') { row.overallStatus = "⚠️ Perlu Revisi Soal";    row.badgeClass = "badge-yellow"; row.priority = 1; }
                else if (soalStatus === 'gray')   { row.overallStatus = "📤 Upload Naskah Soal";   row.badgeClass = "badge-gray";   row.priority = 2; }
                else if (soalStatus === 'green')  { row.overallStatus = "🔵 Soal Sedang Direview"; row.badgeClass = "badge-blue";   row.priority = 3; }
                else if (soalStatus === 'blue')   { row.overallStatus = "✅ Soal Siap di LMS";     row.badgeClass = "badge-green";  row.priority = 4; }
                else                              { row.overallStatus = "Status Tidak Dikenal";    row.badgeClass = "badge-gray";   row.priority = 5; }

                return row;
            });

            updateStats();
            applyFilters();
        }
    } catch (e) {
        console.error("Load error:", e);
        document.getElementById('public-table-body').innerHTML =
            '<tr><td colspan="8" class="loading-placeholder" style="color: #ef4444;">Gagal terhubung ke Server API.</td></tr>';
    }
};
