import * as crypto from 'crypto';

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 5 * 60; // 5 minutes

export function generateOtp(): string {
  const digits = '0123456789';
  let otp = '';
  const randomBytes = crypto.randomBytes(OTP_LENGTH);
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[randomBytes[i] % 10];
  }
  return otp;
}

export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

export function getOtpExpirySeconds(): number {
  return OTP_EXPIRY_SECONDS;
}
