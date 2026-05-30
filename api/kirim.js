import { IncomingForm } from 'formidable';
import { createReadStream } from 'fs';
import { FormData, File } from 'formdata-node';
import { fileFromPath } from 'formdata-node/file-from-path';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const WEBHOOK_URL  = process.env.WEBHOOK_URL;
  const ACCESS_CODE  = process.env.ACCESS_CODE;

  if (!WEBHOOK_URL || !ACCESS_CODE) {
    return res.status(500).json({ ok: false, message: 'Konfigurasi server tidak lengkap' });
  }

  try {
    // Parse multipart form
    const form = new IncomingForm({ maxFileSize: 8 * 1024 * 1024, maxFiles: 3 });
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const code    = Array.isArray(fields.code)    ? fields.code[0]    : fields.code;
    const payload = Array.isArray(fields.payload) ? fields.payload[0] : fields.payload;

    // Validasi kode akses
    if (!code || code !== ACCESS_CODE) {
      return res.status(403).json({ ok: false, message: 'Kode akses tidak valid' });
    }

    // Parse payload
    let data;
    try { data = JSON.parse(payload); }
    catch { return res.status(400).json({ ok: false, message: 'Payload tidak valid' }); }

    // Kirim teks ke Discord
    const discordRes = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: data.content }),
    });

    if (!discordRes.ok) {
      const err = await discordRes.json().catch(() => ({}));
      throw new Error(err.message || `Discord HTTP ${discordRes.status}`);
    }

    // Kirim foto satu per satu
    const photoFiles = files.photos
      ? (Array.isArray(files.photos) ? files.photos : [files.photos])
      : [];

    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      const fd   = new FormData();
      const blob = await fileFromPath(file.filepath, file.originalFilename || 'foto.jpg', {
        type: file.mimetype || 'image/jpeg',
      });
      fd.set('file', blob);
      fd.set('payload_json', JSON.stringify({
        content: `📸 Foto Bukti ${i + 1}/${photoFiles.length}`,
      }));
      await fetch(WEBHOOK_URL, { method: 'POST', body: fd });
    }

    return res.status(200).json({ ok: true, message: 'Laporan berhasil dikirim!' });
  } catch (err) {
    console.error('Error:', err.message);
    return res.status(500).json({ ok: false, message: `Gagal kirim: ${err.message}` });
  }
}

