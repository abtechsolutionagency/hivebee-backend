import multer from 'multer';
import { AppError } from '../errors/AppError.js';
import { ERROR_CODES } from '../errors/error-codes.js';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Allowed: JPEG, PNG, GIF, WebP', 400, ERROR_CODES.VALIDATION_ERROR));
  }
};

const multerUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES }
}).single('picture');

export const uploadProfilePicture = (req, res, next) => {
  multerUpload(req, res, (err) => {
    if (err) {
      if (err instanceof AppError) return next(err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('File too large. Maximum size is 5 MB', 400, ERROR_CODES.VALIDATION_ERROR));
      }
      return next(new AppError(err.message || 'File upload failed', 400, ERROR_CODES.VALIDATION_ERROR));
    }
    next();
  });
};
