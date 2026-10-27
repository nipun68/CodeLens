/**
 * Password strength and policy evaluation utility
 * Enforces explicit 12-128 character policy with client-side strength assessment.
 */

export const COMMON_PASSWORDS = new Set([
  'password1234',
  '123456789012',
  'qwertyuiop12',
  'admin1234567',
  'welcome12345',
  'codelens1234',
  'iloveyou1234',
  'monkey123456',
  'letmein12345',
  'password123456'
]);

export function evaluatePasswordStrength(password = '') {
  const pwd = String(password || '');
  const length = pwd.length;

  const isMinLength = length >= 12;
  const isMaxLength = length <= 128;
  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSymbolOrSpace = /[^a-zA-Z0-9]/.test(pwd);
  const isCommon = COMMON_PASSWORDS.has(pwd.toLowerCase().trim());

  const requirements = [
    { id: 'length', label: 'At least 12 characters (required)', met: isMinLength, required: true },
    { id: 'common', label: 'Not a commonly guessed password', met: !isCommon && length > 0, required: true },
    { id: 'upper', label: 'Contains uppercase letter (A–Z)', met: hasUpper, required: false },
    { id: 'lower', label: 'Contains lowercase letter (a–z)', met: hasLower, required: false },
    { id: 'number', label: 'Contains a number (0–9)', met: hasNumber, required: false },
    { id: 'special', label: 'Contains a symbol or space', met: hasSymbolOrSpace, required: false }
  ];

  if (!pwd) {
    return {
      score: 0,
      label: 'Empty',
      color: '#64748b',
      percent: 0,
      isValid: false,
      requirements
    };
  }

  if (isCommon || length < 12) {
    return {
      score: 25,
      label: 'Weak',
      color: '#ef4444', // red
      percent: 25,
      isValid: false,
      requirements
    };
  }

  // Calculate advisory score for passwords that meet the minimum 12 chars
  let points = 50; // base score for meeting 12+ chars
  if (length >= 16) points += 15;
  if (length >= 20) points += 10;
  if (hasLower && hasUpper) points += 10;
  if (hasNumber) points += 10;
  if (hasSymbolOrSpace) points += 10;

  if (points >= 90) {
    return {
      score: points,
      label: 'Very strong',
      color: '#10b981', // emerald
      percent: 100,
      isValid: isMinLength && isMaxLength && !isCommon,
      requirements
    };
  } else if (points >= 70) {
    return {
      score: points,
      label: 'Strong',
      color: '#34d399', // green
      percent: 75,
      isValid: isMinLength && isMaxLength && !isCommon,
      requirements
    };
  } else {
    return {
      score: points,
      label: 'Fair',
      color: '#f59e0b', // amber
      percent: 50,
      isValid: isMinLength && isMaxLength && !isCommon,
      requirements
    };
  }
}
