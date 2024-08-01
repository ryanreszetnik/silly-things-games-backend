import crypto from 'crypto';

const ENCRYPTION_PREFIX = 'enc_';

export const encrypt = (text: string): string => {
  if (text.startsWith(ENCRYPTION_PREFIX)) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
    iv,
  );
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return ENCRYPTION_PREFIX + iv.toString('hex') + encrypted.toString('hex');
};

export const decrypt = (text: string): string => {
  if (!text.startsWith(ENCRYPTION_PREFIX)) {
    return text;
  }
  const textWithoutEnc = text.slice(ENCRYPTION_PREFIX.length);
  const iv = Buffer.from(textWithoutEnc.slice(0, 32), 'hex');
  const encryptedText = Buffer.from(textWithoutEnc.slice(32), 'hex');
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
    iv,
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};
