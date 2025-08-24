import { Router } from 'express';
import { domainController } from '../controllers/domainController';
import { InputValidator, seoValidationSchemas } from '../middleware/inputValidator';

const router = Router();

// Domain Analytics Routes with Phase 3 middleware
router.post('/overview', 
  InputValidator.validate(seoValidationSchemas.domainOverview),
  domainController.getOverview
);

router.post('/technologies', 
  InputValidator.validate(seoValidationSchemas.domainTechnologies),
  domainController.getTechnologies
);

router.post('/compare', 
  InputValidator.validate(seoValidationSchemas.domainCompare),
  domainController.compareCompetitors
);

export default router;