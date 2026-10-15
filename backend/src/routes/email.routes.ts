import { Router } from 'express';
import {
  EmailController,
  scheduleSingleSchema,
  scheduleBatchSchema,
} from '../controllers/email.controller';
import { validate } from '../middleware/validate';

const router = Router();

// Schedule single email
router.post('/schedule', validate(scheduleSingleSchema), EmailController.scheduleSingle);

// Schedule batch campaign
router.post('/batch', validate(scheduleBatchSchema), EmailController.scheduleBatch);

// List scheduled emails
router.get('/scheduled', EmailController.getScheduled);

// List sent emails
router.get('/sent', EmailController.getSent);

// Cancel a scheduled email
router.delete('/:id', EmailController.cancel);

// High-level dashboard metrics
router.get('/stats', EmailController.getStats);

// Ethereal info & web preview portal
router.get('/ethereal-account', EmailController.getEtherealInfo);

export default router;
