/**
 * Data Controller
 * Handles /api/data endpoints for task manager data
 * Maps between JSON format (frontend) and database
 */

const { getAllData, saveAllData } = require('../db/data.cjs');
const logger = require('../utils/logger.cjs');

/**
 * GET /api/data - Get all task manager data
 */
function getData(req, res) {
  try {
    const { db } = req;

    if (!db) {
      logger.error('Database not available in request');
      return res.status(500).json({ error: 'Database not available' });
    }

    logger.info('Fetching data from database');
    const data = getAllData(db);
    logger.info('Data fetched successfully, sending response');
    res.json(data);

  } catch (err) {
    logger.error('Error in getData:', err);
    logger.error('Stack trace:', err.stack);
    res.status(500).json({ error: 'Failed to read data', details: err.message });
  }
}

/**
 * POST /api/data - Save all task manager data
 */
function saveData(req, res) {
  try {
    const { db } = req;
    const { user } = req;

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const data = req.body;

    // Validate data structure
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    // Save to database
    saveAllData(db, data, user.id);

    res.json({ ok: true });

  } catch (err) {
    logger.error('Error in saveData:', err);
    res.status(500).json({ error: 'Failed to save data' });
  }
}

module.exports = {
  getData,
  saveData
};
