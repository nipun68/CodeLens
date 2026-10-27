import mongoose from 'mongoose';
import {
  getAccount,
  saveAccount,
  createAccount,
  findAccount,
  findAccountByOAuth,
  mutateAccount,
  Account as MongooseAccount
} from '../store.js';

export const AccountModel = MongooseAccount;

export {
  getAccount,
  saveAccount,
  createAccount,
  findAccount,
  findAccountByOAuth,
  mutateAccount
};

export default {
  model: MongooseAccount,
  getAccount,
  saveAccount,
  createAccount,
  findAccount,
  findAccountByOAuth,
  mutateAccount
};
