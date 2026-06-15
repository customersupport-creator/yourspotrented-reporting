import multer from 'multer';

/**
 * Centralized error handler. Normalizes every failure into a consistent shape:
 *   { error: { code, message, details? } }
 * so the client can render errors uniformly.
 */
export function errorHandler(err, req, res, _next) {
  // Multer-specific errors (size limit, unexpected field, etc.)
  if (err instanceof multer.MulterError) {
    const code = err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : err.code;
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? `File is too large. Maximum allowed size is ${process.env.MAX_UPLOAD_MB || 5} MB.`
        : err.message;
    return res.status(400).json({ error: { code, message } });
  }

  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message =
    status === 500 ? 'An unexpected error occurred while generating the report.' : err.message;

  if (status === 500) {
    // Surface the real error in server logs but not to the client.
    console.error('[errorHandler]', err);
  }

  const body = { error: { code, message } };
  if (err.details) body.error.details = err.details;
  return res.status(status).json(body);
}

/** 404 for unknown routes. */
export function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
}
