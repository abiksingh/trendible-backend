import { Router } from 'express';
import { researchController } from '../controllers/researchController';
import { InputValidator, seoValidationSchemas } from '../middleware/inputValidator';

const router = Router();

// Unified Research API
router.post('/keyword-intelligence', 
  InputValidator.validate(seoValidationSchemas.keywordIntelligence),
  researchController.getKeywordIntelligence
);

export default router;