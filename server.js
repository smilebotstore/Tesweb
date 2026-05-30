require('dotenv').config();

const express  = require('express');
const multer   = require('multer');
const fetch    = require('node-fetch');
const FormData = require('form-data');
const path     = require('path');
const fs       = require('fs');

const app = express();
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 8 * 1024 * 1024, files: 3 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Hanya file gambar yang diizinkan'));
    }
    cb(null, true);
  }
});

// ── Validasi config saat startup ──────────────────────────
const missingVars = [];
if (!process.env.WEBHOOK_URL || process.env.WEBHOOK_URL.includes('MASUKKAN_WEBHOOK'))
  missingVars.push('WEBHOOK_URL');
if (!process.env.ACCESS_CODE || process.env.ACCESS_CODE.includes('KODE_RAHASIA'))
  missingVars.push('ACCESS_CODE');

if (missingVars.length > 0) {
  console.error('\n❌  KONFIGURASI TIDAK LENGKAP!');
  console.error('   Buka file .env dan isi nilai berikut:');
  missingVars.forEach(v => console.error(`   → ${v}`));
  console.error('   Lihat .env.example untuk panduan.\n');
  process.exit(1);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Config endpoint (dikirim ke frontend, tanpa secret) ──
app.get('/api/config', (req, res) => {
  res.json({ ready: true });
});

// ── Endpoint validasi kode akses ─────────────────────────
app.post('/api/validate-access', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ ok: false, message: 'Kode akses wajib diisi' });
  if (code !== process.env.ACCESS_CODE)
    return res.status(403).json({ ok: false, message: 'Kode akses salah' });
  res.json({ ok: true });
});

// ── Endpoint kirim laporan ────────────────────────────────
app.post('/api/kirim', upload.array('photos', 3), async (req, res) => {
  try {
    const { code, payload } = req.body;

    // Validasi akses
    if (!code || code !== process.env.ACCESS_CODE) {
      cleanupFiles(req.files);
      return res.status(403).json({ ok: false, message: 'Kode akses tidak valid' });
    }

    let data;
    try { data = JSON.parse(payload); }
    catch { return res.status(400).json({ ok: false, message: 'Payload tidak valid' }); }

    // Kirim embed ke Discord
    const discordRes = await fetch(process.env.WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: data.content }),
    });

    if (!discordRes.ok) {
      const err = await discordRes.json().catch(() => ({}));
      throw new Error(err.message || `Discord HTTP ${discordRes.status}`);
    }

    // Kirim foto satu per satu
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const fd = new FormData();
        fd.append('file', fs.createReadStream(file.path), {
          filename: file.originalname,
          contentType: file.mimetype,
        });
        fd.append('payload_json', JSON.stringify({
          content: `📸 Foto Bukti ${i + 1}/${req.files.length}`
        }));
        await fetch(process.env.WEBHOOK_URL, { method: 'POST', body: fd });
      }
    }

    cleanupFiles(req.files);
    res.json({ ok: true, message: 'Laporan berhasil dikirim!' });
  } catch (err) {
    cleanupFiles(req.files);
    console.error('Error kirim laporan:', err.message);
    res.status(500).json({ ok: false, message: `Gagal kirim: ${err.message}` });
  }
});

function cleanupFiles(files) {
  if (!files) return;
  files.forEach(f => fs.unlink(f.path, () => {}));
}

// ── Start ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅  Server berjalan di http://localhost:${PORT}`);
  console.log(`   Webhook  : ${process.env.WEBHOOK_URL.slice(0, 50)}...`);
  console.log(`   Kode akses dikonfigurasi dari .env\n`);
});

