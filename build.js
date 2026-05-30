const fs   = require('fs');
const path = require('path');

// Baca .env
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ File .env tidak ditemukan!');
  process.exit(1);
}

const env = {};
fs.readFileSync(envPath, 'utf8')
  .split('\n')
  .forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const key = trimmed.substring(0, idx).trim();
    let val   = trimmed.substring(idx + 1).trim();
    // Hapus tanda kutip kalau ada
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  });

// Validasi
const required = ['WEBHOOK_URL', 'ACCESS_CODE'];
for (const key of required) {
  if (!env[key]) {
    console.error(`❌ ${key} belum diisi di .env`);
    process.exit(1);
  }
}

// Inject ke HTML
const htmlPath = path.join(__dirname, 'satlantas-report.html');
let html = fs.readFileSync(htmlPath, 'utf8');

html = html
  .replace('%%WEBHOOK_URL%%', env.WEBHOOK_URL)
  .replace('%%ACCESS_CODE%%', env.ACCESS_CODE);

// Simpan output
const outPath = path.join(__dirname, 'satlantas-report.out.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(`✅ Build selesai → ${outPath}`);
