import { Router } from 'express';
import { backlinksController } from '../controllers/backlinksController';

const router = Router();

// Backlinks Analysis Routes
router.post('/overview', backlinksController.getOverview);
router.post('/bulk', backlinksController.getBulkBacklinks);
router.post('/competitor-gap', backlinksController.analyzeCompetitorGap);

export default router;