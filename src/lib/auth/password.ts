import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 12;

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates password strength according to production security policy:
 * - Minimum 8 characters
 * - Maximum 128 characters (mitigates CPU exhaustion / DoS via huge inputs)
 * - Must contain at least one letter and one number
 */
export function validatePasswordPolicy(password: string): PasswordValidationResult {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password cannot exceed 128 characters' };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return { valid: false, error: 'Password must contain at least one letter and one number' };
  }

  return { valid: true };
}

/**
 * Computes a secure bcrypt hash with 12 salt rounds.
 */
export async function hashPassword(password: string): Promise<string> {
  const policy = validatePasswordPolicy(password);
  if (!policy.valid) {
    throw new Error(policy.error || 'Password policy violation');
  }

  return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Constant-time comparison between plaintext password and stored bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}
