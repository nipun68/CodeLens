/**
 * CodeLens Email Service
 * Encapsulates transactional emails, OTP dispatch, password recovery,
 * and delivery auditing for authentication and user onboarding flows.
 */
import {
  sendEmail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendTestEmail,
  verifySmtpConnection,
  getTransporter,
  resetTransporter,
  getSentEmailLog,
  clearSentEmailLog
} from '../email.js';

export const emailService = {
  sendEmail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendTestEmail,
  verifySmtpConnection,
  getTransporter,
  resetTransporter,
  getSentEmailLog,
  clearSentEmailLog
};

export {
  sendEmail,
  sendOtpEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendTestEmail,
  verifySmtpConnection,
  getTransporter,
  resetTransporter,
  getSentEmailLog,
  clearSentEmailLog
};

export default emailService;
