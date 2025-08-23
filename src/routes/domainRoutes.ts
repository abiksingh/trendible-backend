import { Router } from 'express';
import { domainController } from '../controllers/domainController';

const router = Router();

// Domain Analytics Routes
router.post('/overview', domainController.getOverview);
router.post('/technologies', domainController.getTechnologies);
router.post('/compare', domainController.compareCompetitors);

export default router;