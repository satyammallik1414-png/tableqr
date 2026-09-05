import crypto from 'crypto';

/**
 * Generates an unguessable URL-safe secure token for QR codes.
 * e.g., 24 random bytes in base64url (~32 chars)
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

/**
 * Generates a human-friendly unique order number (e.g. ORD-260905-A7B8)
 */
export function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${dateStr}-${rand}`;
}
