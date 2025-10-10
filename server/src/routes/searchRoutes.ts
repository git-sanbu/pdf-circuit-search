import { Router } from 'express';
import { searchController } from '../controllers/searchController.js';

const router = Router();

router.post('/search', searchController.search.bind(searchController));

export default router;
