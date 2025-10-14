import { Router } from 'express';
import { searchController } from '../controllers/searchController.js';

const router = Router();

router.post('/search', searchController.search.bind(searchController));
router.post('/search/ocr', searchController.searchOCR.bind(searchController));

export default router;
