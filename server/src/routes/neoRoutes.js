import express from 'express';
import { getFeed, getLookup, getSummary, getAlerts } from '../controllers/neoController.js';

const router = express.Router();

router.get('/feed', getFeed);
router.get('/summary', getSummary);
router.get('/alerts', getAlerts);
router.get('/lookup/:id', getLookup);

export default router;
