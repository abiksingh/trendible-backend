import { Router } from 'express';
import { researchController } from '../controllers/researchController';
import { InputValidator, seoValidationSchemas } from '../middleware/inputValidator';

const router = Router();

// Unified Research API
router.post('/keyword-intelligence', 
  InputValidator.validate(seoValidationSchemas.keywordIntelligence),
  researchController.getKeywordIntelligence
);

// Platform-Specific Routes
// Search Engines
router.post('/search-engines/google', 
  InputValidator.validate(seoValidationSchemas.serpOrganic),
  researchController.getGoogleAnalysis
);

router.post('/search-engines/bing', 
  InputValidator.validate(seoValidationSchemas.serpOrganic),
  researchController.getBingAnalysis
);

router.post('/search-engines/comparison', 
  InputValidator.validate(seoValidationSchemas.serpOrganic),
  researchController.compareSearchEngines
);

// Social Media & Video
router.post('/social-media/youtube', 
  InputValidator.validate(seoValidationSchemas.serpOrganic),
  researchController.getYouTubeAnalysis
);

export default router;