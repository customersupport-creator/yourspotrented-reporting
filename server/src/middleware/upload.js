import multer from 'multer';

/**
 * Upload Module (server side).
 *
 * Multer with in-memory storage (stateless v1 — we never write the file to
 * disk). Restricts to CSV by extension + mimetype and enforces a size limit
 * from MAX_UPLOAD_MB.
 */

const MAX_MB = Number(process.env.MAX_UPLOAD_MB || 5);

const CSV_MIME = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel', // some browsers label .csv this way
  'text/plain',
  'application/octet-stream',
]);

function fileFilter(req, file, cb) {
  const isCsvExt = /\.csv$/i.test(file.originalname || '');
  const isCsvMime = CSV_MIME.has(file.mimetype);
  if (isCsvExt || isCsvMime) {
    cb(null, true);
  } else {
    const err = new Error('Only .csv files are accepted.');
    err.code = 'INVALID_FILE_TYPE';
    err.status = 400;
    cb(err);
  }
}

const MAX_FILES = Number(process.env.MAX_FILES || 10);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024, files: MAX_FILES },
  fileFilter,
});

// Accept one or many CSVs under any field name ("file" or "files"), so both the
// single-file and multi-file flows work. Handlers read req.files (an array).
export const anyCsv = upload.any();

// Backward-compatible single-file middleware (still used by some callers/tests).
export const singleCsv = upload.single('file');
