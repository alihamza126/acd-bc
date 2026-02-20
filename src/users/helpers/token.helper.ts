import { randomBytes } from 'crypto';

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

export function generateTokenHash(token: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}
