import { AccountModel, getAccount, saveAccount, createAccount, findAccount, findAccountByOAuth, mutateAccount } from './Account.js';
import { OtpChallengeModel, saveOtpChallenge, getOtpChallenge, updateOtpChallenge, deleteOtpChallenge } from './OtpChallenge.js';
import { PasswordResetModel, savePasswordReset, getPasswordResetByToken, getPasswordResetByCode, updatePasswordReset, invalidatePasswordReset } from './PasswordReset.js';
import { connectStore, isMongoConnected } from '../store.js';

export {
  AccountModel,
  OtpChallengeModel,
  PasswordResetModel,
  connectStore,
  isMongoConnected,
  getAccount,
  saveAccount,
  createAccount,
  findAccount,
  findAccountByOAuth,
  mutateAccount,
  saveOtpChallenge,
  getOtpChallenge,
  updateOtpChallenge,
  deleteOtpChallenge,
  savePasswordReset,
  getPasswordResetByToken,
  getPasswordResetByCode,
  updatePasswordReset,
  invalidatePasswordReset
};

export default {
  Account: AccountModel,
  OtpChallenge: OtpChallengeModel,
  PasswordReset: PasswordResetModel,
  connectStore,
  isMongoConnected
};
