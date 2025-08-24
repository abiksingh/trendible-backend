import { Router } from 'express';
import { keywordsController } from '../controllers/keywordsController';
import { InputValidator, seoValidationSchemas } from '../middleware/inputValidator';

const router = Router();

// Keywords Research Routes with Phase 3 middleware
router.post('/data', 
  InputValidator.validate(seoValidationSchemas.keywordData),
  keywordsController.getKeywordData
);

router.post('/suggestions', 
  InputValidator.validate(seoValidationSchemas.keywordSuggestions),
  keywordsController.getSuggestions
);

router.post('/batch', 
  InputValidator.validate(seoValidationSchemas.keywordBatch),
  keywordsController.batchAnalysis
);

export default router;