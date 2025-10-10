import { Router } from 'express';
import { llmController } from '../controllers/llmController.js';

const router = Router();

router.post('/llm/synonyms', llmController.getSynonyms.bind(llmController));
router.post('/llm/qa', llmController.answerQuestion.bind(llmController));

export default router;
