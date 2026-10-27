import {
  saveOtpChallenge,
  getOtpChallenge,
  updateOtpChallenge,
  deleteOtpChallenge,
  OtpChallenge as MongooseOtpChallenge
} from '../store.js';

export const OtpChallengeModel = MongooseOtpChallenge;

export {
  saveOtpChallenge,
  getOtpChallenge,
  updateOtpChallenge,
  deleteOtpChallenge
};

export default {
  model: MongooseOtpChallenge,
  saveOtpChallenge,
  getOtpChallenge,
  updateOtpChallenge,
  deleteOtpChallenge
};
