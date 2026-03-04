import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

let s3Client = null;

const getClient = () => {
  if (!env.awsS3Bucket || !env.awsAccessKeyId || !env.awsSecretAccessKey) {
    return null;
  }
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.awsRegion,
      credentials: {
        accessKeyId: env.awsAccessKeyId,
        secretAccessKey: env.awsSecretAccessKey
      }
    });
  }
  return s3Client;
};

const getExtensionFromMime = (mime) => {
  const map = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp'
  };
  return map[mime] || 'jpg';
};

export const s3Service = {
  isConfigured() {
    return Boolean(env.awsS3Bucket && env.awsAccessKeyId && env.awsSecretAccessKey);
  },

  validateFile(buffer, mimeType) {
    if (!ALLOWED_MIMES.includes(mimeType)) {
      return { valid: false, error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' };
    }
    if (buffer.length > MAX_SIZE_BYTES) {
      return { valid: false, error: 'File too large. Maximum size is 5 MB' };
    }
    return { valid: true };
  },

  /**
   * Upload an image to S3. Returns the public URL.
   * @param {string} userId - Owner user id (for key path).
   * @param {Buffer} buffer - File buffer.
   * @param {string} mimeType - e.g. image/jpeg.
   * @param {string} [folder='uploads'] - S3 key prefix (e.g. 'uploads', 'profiles').
   * @returns {Promise<string>} Public URL of the uploaded file.
   */
  async uploadPicture(userId, buffer, mimeType, folder = 'uploads') {
    const client = getClient();
    if (!client) {
      throw new Error('S3 is not configured. Set AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.');
    }

    const ext = getExtensionFromMime(mimeType);
    const key = `${folder}/${userId}/${Date.now()}.${ext}`;

    await client.send(
      new PutObjectCommand({
        Bucket: env.awsS3Bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000'
      })
    );

    const region = env.awsRegion;
    const bucket = env.awsS3Bucket;
    const encodedKey = encodeURIComponent(key).replace(/%2F/g, '/');
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
  },

  /** Upload to profiles/ prefix and return URL (for primary profile / smile picture). */
  async uploadProfilePicture(userId, buffer, mimeType) {
    return this.uploadPicture(userId, buffer, mimeType, 'profiles');
  }
};
