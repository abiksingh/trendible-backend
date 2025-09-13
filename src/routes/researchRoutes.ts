import { Router } from 'express';
import { researchController } from '../controllers/researchController';
import { InputValidator, seoValidationSchemas } from '../middleware/inputValidator';

const router = Router();

// Unified Research API
router.post('/keyword-intelligence', 
  InputValidator.validate(seoValidationSchemas.keywordIntelligence),
  researchController.getKeywordIntelligence
);

// Enhanced Analytics API
router.post('/keyword-enhanced-analytics',
  InputValidator.validate(seoValidationSchemas.keywordEnhancedAnalytics),
  researchController.getKeywordEnhancedAnalytics
);

export default router;