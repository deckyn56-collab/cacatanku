// ========== KONFIGURASI SUPABASE ==========
const SUPABASE_URL = 'https://dazhavdgidhwtedepfzg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhemhhdmRnaWRod3RlZGVwZnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4NTE0NjcsImV4cCI6MjEwMDQyNzQ2N30.e_sxSOhcCJok1FcexAmYknqjQRvXEil087mDieZ2-88';

// ========== AMBIL ELEMEN HTML ==========
const judulInput = document.getElementById('judulInput');
const isiInput = document.getElementById('isiInput');
const simpanBtn = document.getElementById('simpanBtn');
const batalBtn = document.getElementById('batalBtn');
const daftarCatatan = document.getElementById('daftarCatatan');
const totalCatatan = document.getElementById('totalCatatan');
const cariInput = document.getElementById('cariInput');

// ========== STATE ==========
let catatanSaatIni = []; // Semua catatan dari database
let modeEdit = false;
let idEdit = null;
let currentFilter = 'all';

// ========== FUNGSI CRUD ==========

// Ambil semua catatan dari Supabase
async function ambilCatatan() {
    daftarCatatan.innerHTML = '<p class="empty-state">⏳ Memuat catatan...</p>';
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/catatan?select=*&order=tanggal.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Gagal mengambil data');
        
        const data = await response.json();
        catatanSaatIni = data;
        terapkanFilter();
        
    } catch (error) {
        daftarCatatan.innerHTML = `<p class="empty-state" style="color:#ef4444;">❌ ${error.message}</p>`;
    }
}

// Tampilkan catatan di layar
function tampilkanCatatan(catatan) {
    if (catatan.length === 0) {
        daftarCatatan.innerHTML = '<p class="empty-state">📭 Belum ada catatan. Buat yang pertama!</p>';
        return;
    }
    
    daftarCatatan.innerHTML = '';
    
    catatan.forEach(c => {
        const div = document.createElement('div');
        div.className = 'catatan-item';
        div.innerHTML = `
            <div class="judul">${escapeHTML(c.judul)}</div>
            <div class="isi">${escapeHTML(c.isi)}</div>
            <div class="tanggal">${formatTanggal(c.tanggal)}</div>
            <div class="aksi">
                <button class="edit-btn" data-id="${c.id}">✏️ Edit</button>
                <button class="hapus-btn" data-id="${c.id}">🗑️ Hapus</button>
            </div>
        `;
        daftarCatatan.appendChild(div);
    });
    
    // Event listener untuk tombol edit & hapus
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            const catatan = catatanSaatIni.find(c => c.id === id);
            if (catatan) mulaiEdit(catatan);
        });
    });
    
    document.querySelectorAll('.hapus-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            hapusCatatan(id);
        });
    });
}

// Tambah catatan baru
async function tambahCatatan(judul, isi) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/catatan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                judul: judul,
                isi: isi
            })
        });
        
        if (!response.ok) throw new Error('Gagal menyimpan');
        
        await ambilCatatan();
        resetForm();
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Update catatan yang sudah ada
async function updateCatatan(id, judul, isi) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/catatan?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                judul: judul,
                isi: isi
            })
        });
        
        if (!response.ok) throw new Error('Gagal mengupdate');
        
        await ambilCatatan();
        resetForm();
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Hapus catatan
async function hapusCatatan(id) {
    if (!confirm('Yakin ingin menghapus catatan ini?')) return;
    
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/catatan?id=eq.${id}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        if (!response.ok) throw new Error('Gagal menghapus');
        
        await ambilCatatan();
        
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// ========== FUNGSI FILTER ==========
function terapkanFilter() {
    let filtered = [...catatanSaatIni];
    const now = new Date();
    
    if (currentFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filtered = catatanSaatIni.filter(c => {
            const t = new Date(c.tanggal);
            return t >= today;
        });
    } else if (currentFilter === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filtered = catatanSaatIni.filter(c => {
            const t = new Date(c.tanggal);
            return t >= weekAgo;
        });
    }
    
    // Filter pencarian
    const keyword = cariInput.value.toLowerCase();
    if (keyword !== '') {
        filtered = filtered.filter(c => 
            c.judul.toLowerCase().includes(keyword) || 
            c.isi.toLowerCase().includes(keyword)
        );
    }
    
    tampilkanCatatan(filtered);
    totalCatatan.textContent = filtered.length;
}

// ========== FUNGSI BANTU ==========

function mulaiEdit(catatan) {
    judulInput.value = catatan.judul;
    isiInput.value = catatan.isi;
    idEdit = catatan.id;
    modeEdit = true;
    
    simpanBtn.innerHTML = '<span class="btn-icon">💾</span> Update';
    batalBtn.style.display = 'inline-flex';
    judulInput.focus();
}

function resetForm() {
    judulInput.value = '';
    isiInput.value = '';
    idEdit = null;
    modeEdit = false;
    simpanBtn.innerHTML = '<span class="btn-icon">💾</span> Simpan';
    batalBtn.style.display = 'none';
}

function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTanggal(tanggal) {
    const d = new Date(tanggal);
    return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ========== EVENT LISTENER ==========

// Simpan atau Update
simpanBtn.addEventListener('click', function() {
    const judul = judulInput.value.trim();
    const isi = isiInput.value.trim();
    
    if (judul === '' || isi === '') {
        alert('Judul dan isi catatan harus diisi!');
        return;
    }
    
    if (modeEdit && idEdit) {
        updateCatatan(idEdit, judul, isi);
    } else {
        tambahCatatan(judul, isi);
    }
});

// Batal edit
batalBtn.addEventListener('click', resetForm);

// Cari catatan
cariInput.addEventListener('input', terapkanFilter);

// Filter tombol
const filterBtns = document.querySelectorAll('.filter-btn');
filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
        filterBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        terapkanFilter();
    });
});

// ========== INISIALISASI ==========
window.onload = function() {
    ambilCatatan();
};