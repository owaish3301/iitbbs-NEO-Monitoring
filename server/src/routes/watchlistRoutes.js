import express from 'express';
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  toggleAlert,
} from '../controllers/watchlistController.js';
import verifySupabase from '../middleware/verifySupabase.js';

const router = express.Router();

// All watchlist routes require authentication
router.use(verifySupabase);

router.get('/', getWatchlist);
router.post('/', addToWatchlist);
router.patch('/:neoId/alert', toggleAlert);
router.delete('/:neoId', removeFromWatchlist);

export default router;
