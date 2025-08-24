import { Router } from 'express';
import { serpController } from '../controllers/serpController';
import { InputValidator, seoValidationSchemas } from '../middleware/inputValidator';
import { autoBatchSplitter } from '../middleware/batchProcessor';

const router = Router();

// SERP Analysis Routes with Phase 3 middleware
router.post('/organic', 
  InputValidator.validate(seoValidationSchemas.serpOrganic),
  serpController.searchOrganic
);

router.post('/batch', 
  InputValidator.validate(seoValidationSchemas.serpBatch),
  autoBatchSplitter(10), // Max 10 keywords per batch
  serpController.batchSearch
);

export default router;