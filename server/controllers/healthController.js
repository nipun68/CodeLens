import { isMongoConnected } from '../models/index.js';

let currentStorageMode = 'memory';

export const setStorageMode = (mode) => {
  currentStorageMode = mode;
};

export const getStorageMode = () => currentStorageMode;

/**
 * Health check controller
 * Checks API status, active storage layer, MongoDB Atlas connectivity, and uptime
 */
export const checkHealth = (req, res) => {
  const mongoConnected = isMongoConnected();
  res.json({
    ok: true,
    service: 'CodeLens API',
    storage: currentStorageMode,
    mongoConnected,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    version: '2.0.0'
  });
};
