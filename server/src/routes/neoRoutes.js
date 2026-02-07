import express from 'express';
import {
  getFeed,
  getLookup,
  getSummary,
  getAlerts,
  markAlertRead,
  markAllAlertsRead,
  deleteAlert,
} from '../controllers/neoController.js';
import verifySupabase from '../middleware/verifySupabase.js';

const router = express.Router();

router.get('/feed', getFeed);
router.get('/summary', getSummary);
router.get('/alerts', getAlerts);
router.patch('/alerts/read-all', verifySupabase, markAllAlertsRead);
router.patch('/alerts/:id/read', verifySupabase, markAlertRead);
router.delete('/alerts/:id', verifySupabase, deleteAlert);
router.get('/lookup/:id', getLookup);

export default router;
