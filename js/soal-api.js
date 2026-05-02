// ==================== API SOAL ====================

// Ambil daftar soal yang sudah diinput
async function fetchSoals() {
    if (!ACTIVE_USER) return [];
    const payload = {
        whatsapp: ACTIVE_USER.whatsapp,
        level: ACTIVE_USER.level,
        mapel: ACTIVE_USER.mapel
    };
    const res = await sendRequest("getSoals", payload);
    return res.success ? res.data : [];
}

// Simpan 1 soal (create/update)
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

// Submit semua soal ke validator
async function submitAllSoals() {
    const payload = {
        whatsapp: ACTIVE_USER.whatsapp,
        level: ACTIVE_USER.level,
        mapel: ACTIVE_USER.mapel,
        guru: ACTIVE_USER.nama
    };
    return await sendRequest("submitSoals", payload);
}

// Ambil soal untuk validator
async function fetchSoalsForValidation(guru, mapel, level) {
    const payload = { guru, mapel, level };
    const res = await sendRequest("getSoalsForValidation", payload);
    return res.success ? res.data : [];
}

// Update status validasi soal
async function updateSoalValidation(soalId, status, comment) {
    const payload = { soalId, status, comment };
    return await sendRequest("updateSoalValidation", payload);
}
