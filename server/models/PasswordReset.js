import {
  savePasswordReset,
  getPasswordResetByToken,
  getPasswordResetByCode,
  updatePasswordReset,
  invalidatePasswordReset,
  PasswordReset as MongoosePasswordReset
} from '../store.js';

export const PasswordResetModel = MongoosePasswordReset;

export {
  savePasswordReset,
  getPasswordResetByToken,
  getPasswordResetByCode,
  updatePasswordReset,
  invalidatePasswordReset
};

export default {
  model: MongoosePasswordReset,
  savePasswordReset,
  getPasswordResetByToken,
  getPasswordResetByCode,
  updatePasswordReset,
  invalidatePasswordReset
};
