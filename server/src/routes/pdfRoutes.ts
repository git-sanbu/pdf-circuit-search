import { Router } from 'express';
import { pdfController } from '../controllers/pdfController.js';

const router = Router();

router.get('/pdfs', pdfController.listPDFs.bind(pdfController));
router.get('/pdfs/:id', pdfController.getPDF.bind(pdfController));
router.get('/pdfs/:id/file', pdfController.getPDFFile.bind(pdfController));
router.post('/pdfs/:id/index', pdfController.indexPDF.bind(pdfController));

export default router;
