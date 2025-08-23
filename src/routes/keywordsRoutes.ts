import { Router } from 'express';
import { keywordsController } from '../controllers/keywordsController';

const router = Router();

// Keywords Research Routes
router.post('/data', keywordsController.getKeywordData);
router.post('/suggestions', keywordsController.getSuggestions);
router.post('/batch', keywordsController.batchAnalysis);

export default router;