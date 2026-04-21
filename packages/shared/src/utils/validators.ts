import { PASSWORD_REGEX } from '../constants';

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}

export function isValidAccountNumber(accountNumber: string): boolean {
  return /^\d{10}$/.test(accountNumber);
}

export function isValidPhone(phone: string): boolean {
  return /^\+?[\d\s\-().]{7,15}$/.test(phone);
}

export function isPositiveAmount(amount: number): boolean {
  return typeof amount === 'number' && isFinite(amount) && amount > 0;
}

export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
