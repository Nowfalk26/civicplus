"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = void 0;
exports.uploadToCloudinary = uploadToCloudinary;
const multer_1 = __importDefault(require("multer"));
const cloudinary_1 = require("cloudinary");
// Configure Cloudinary with environment variables
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'civics-plus-tn',
    api_key: process.env.CLOUDINARY_API_KEY || '123456789012345',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'abcdefghijklmnopqrstuvwxyz12345',
    secure: true,
});
// Configure Multer memory storage
const storage = multer_1.default.memoryStorage();
exports.uploadMiddleware = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB per file
        files: 5, // max 5 photos per complaint
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files (JPEG, PNG, WEBP) are allowed.'));
        }
    },
});
/**
 * Uploads a buffer to Cloudinary or falls back to data URI / high-res placeholder
 */
async function uploadToCloudinary(buffer, folder = 'civicsplus_complaints') {
    const isCloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_CLOUD_NAME !== 'civics-plus-tn' &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_KEY !== '123456789012345';
    if (isCloudinaryConfigured) {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                folder,
                resource_type: 'image',
                transformation: [{ width: 1200, crop: 'limit', quality: 'auto' }],
            }, (error, result) => {
                if (error || !result) {
                    reject(error || new Error('Cloudinary upload failed'));
                }
                else {
                    resolve(result.secure_url);
                }
            });
            uploadStream.end(buffer);
        });
    }
    // Fallback: Convert buffer to data URL so photos display immediately during development
    const base64 = buffer.toString('base64');
    return `data:image/jpeg;base64,${base64}`;
}
