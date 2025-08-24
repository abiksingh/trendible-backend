import { Router } from 'express';
import { backlinksController } from '../controllers/backlinksController';
import { InputValidator, seoValidationSchemas } from '../middleware/inputValidator';

const router = Router();

// Backlinks Analysis Routes with Phase 3 middleware
router.post('/overview', 
  InputValidator.validate(seoValidationSchemas.backlinksOverview),
  backlinksController.getOverview
);

router.post('/bulk', 
  InputValidator.validate(seoValidationSchemas.backlinksBulk),
  backlinksController.getBulkBacklinks
);

router.post('/competitor-gap', 
  InputValidator.validate(seoValidationSchemas.competitorGap),
  backlinksController.analyzeCompetitorGap
);

export default router;