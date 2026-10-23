// Photo uploads for feed posts. Photos are resized to web size with sharp and saved as JPEGs.
// On Render, set UPLOAD_DIR=/var/data/uploads so they live on the persistent disk.
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DIR = path.join(process.env.UPLOAD_DIR || path.join(__dirname, '..', 'db', 'uploads'), 'posts');
fs.mkdirSync(DIR, { recursive: true });

const OK = /\.(jpe?g|png|webp|heic|heif)$/i;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 10, fields: 20 },
  fileFilter: (req, file, cb) => {
    if (OK.test(file.originalname || '') || /^image\//.test(file.mimetype)) return cb(null, true);
    const e = new Error('Photos only (JPG, PNG or WebP).');
    e.status = 400;
    cb(e);
  },
});

function handle(mw) {
  return (req, res, next) =>
    mw(req, res, (err) => {
      if (!err) return next();
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'One of those photos is too big (25 MB max).' : err.code === 'LIMIT_FILE_COUNT' ? 'Up to 10 photos per post.' : err.message || 'Upload failed.';
      res.status(err.status || 400).json({ ok: false, error: msg });
    });
}

// Returns [{src, alt}] for saved photos; throws a friendly error if a photo can't be read.
async function savePhotos(files, alt) {
  const out = [];
  for (const f of files || []) {
    const name = crypto.randomBytes(12).toString('hex') + '.jpg';
    try {
      await sharp(f.buffer).rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(DIR, name));
    } catch (e) {
      const err = new Error(`Couldn't read "${f.originalname}". If it's an iPhone HEIC photo, share it as a JPG and try again.`);
      err.status = 400;
      throw err;
    }
    out.push({ src: '/media/posts/' + name, alt: alt || '' });
  }
  return out;
}

function removePhotos(photos) {
  (photos || []).forEach((p) => {
    const m = /^\/media\/posts\/([a-f0-9]{24}\.jpg)$/.exec(p.src || '');
    if (m) fs.unlink(path.join(DIR, m[1]), () => {});
  });
}

module.exports = { upload, handle, savePhotos, removePhotos, DIR };
