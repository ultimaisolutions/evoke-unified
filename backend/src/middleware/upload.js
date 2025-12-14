const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

/**
 * Create multer storage configuration
 */
function createStorage(destinationDir) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destinationDir);
    },
    filename: (req, file, cb) => {
      const uniqueId = uuidv4();
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uniqueId}${ext}`);
    },
  });
}

/**
 * File filter for ads (images and videos)
 */
function adFileFilter(req, file, cb) {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_TYPES.join(', ')}`), false);
  }
}

/**
 * File filter for reaction videos only
 */
function reactionFileFilter(req, file, cb) {
  if (ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only videos allowed: ${ALLOWED_VIDEO_TYPES.join(', ')}`), false);
  }
}

/**
 * Get file type category
 */
function getFileType(mimetype) {
  if (ALLOWED_IMAGE_TYPES.includes(mimetype)) return 'image';
  if (ALLOWED_VIDEO_TYPES.includes(mimetype)) return 'video';
  return 'unknown';
}

// Ad upload middleware
const uploadAd = multer({
  storage: createStorage(config.adsDir),
  fileFilter: adFileFilter,
  limits: {
    fileSize: config.maxFileSizeMB * 1024 * 1024, // Convert MB to bytes
  },
}).single('file');

// Reaction video upload middleware
const uploadReaction = multer({
  storage: createStorage(config.reactionsDir),
  fileFilter: reactionFileFilter,
  limits: {
    fileSize: config.maxFileSizeMB * 1024 * 1024,
  },
}).single('file');

/**
 * Wrapper to handle multer errors gracefully
 */
function handleUpload(uploadMiddleware) {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            error: 'File too large',
            message: `Maximum file size is ${config.maxFileSizeMB}MB`,
          });
        }
        return res.status(400).json({
          success: false,
          error: 'Upload error',
          message: err.message,
        });
      } else if (err) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file',
          message: err.message,
        });
      }
      next();
    });
  };
}

module.exports = {
  uploadAd: handleUpload(uploadAd),
  uploadReaction: handleUpload(uploadReaction),
  getFileType,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
};
