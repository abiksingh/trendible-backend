import { Router } from 'express';
import { serpController } from '../controllers/serpController';

const router = Router();

// SERP Analysis Routes
router.post('/organic', serpController.searchOrganic);
router.post('/batch', serpController.batchSearch);

export default router;