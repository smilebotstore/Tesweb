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
    const [key, ...rest] = line.trim().split('=');
    if (key && rest.length) env[key.trim()] = rest.join('=').trim();
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
