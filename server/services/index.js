import emailService from './emailService.js';
import executionService from './executionService.js';
import analyzeService from './analyzeService.js';

export {
  emailService,
  executionService,
  analyzeService
};

export default {
  email: emailService,
  execution: executionService,
  analyze: analyzeService
};
