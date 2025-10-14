import { Request, Response } from 'express';
import { searchEngine, SearchRequest } from '../services/searchEngine.js';
import { dbService } from '../services/database.js';
import { llmService } from '../services/llmService.js';

export class SearchController {
  /**
   * POST /api/search - 执行搜索
   */
  async search(req: Request, res: Response) {
    try {
      const { pdfId, keyword, useSynonyms } = req.body as SearchRequest & { useSynonyms?: boolean };

      console.log('Search request:', { pdfId, keyword, useSynonyms });

      // 验证参数
      if (!pdfId || !keyword) {
        console.log('Missing required fields');
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: pdfId, keyword'
        });
      }

      // 检查PDF是否存在
      const pdf = dbService.getPDFById(pdfId);
      if (!pdf) {
        console.log('PDF not found:', pdfId);
        return res.status(404).json({ success: false, error: 'PDF not found' });
      }

      console.log('PDF found:', pdf.filename, 'indexed:', pdf.indexed);

      // 检查是否已索引
      if (!pdf.indexed) {
        console.log('PDF not indexed');
        return res.status(400).json({
          success: false,
          error: 'PDF not indexed. Please index it first.'
        });
      }

      let result;
      let ocrResults = [];

      // 同时搜索 OCR 结果
      if (pdf.ocrProcessed && dbService.hasOCRResults(pdfId)) {
        ocrResults = dbService.searchOCRResults(pdfId, keyword);
        console.log('OCR search found', ocrResults.length, 'pages');
      }

      // 使用同义词搜索
      if (useSynonyms && process.env.ENABLE_SYNONYM_SEARCH === 'true') {
        console.log('Using synonym search');
        try {
          const synonymResult = await llmService.getSynonyms({ keyword });
          const allResults = searchEngine.searchWithKeywords(pdfId, synonymResult.synonyms);

          result = {
            keyword,
            expandedKeywords: synonymResult.synonyms,
            results: allResults,
            totalMatches: allResults.length
          };
        } catch (error) {
          console.error('Synonym search failed, falling back to normal search:', error);
          result = searchEngine.search({ pdfId, keyword });
        }
      } else {
        // 普通搜索（PDF原生文本）
        console.log('Using normal search (PDF text)');
        result = searchEngine.search({ pdfId, keyword });
      }

      // 合并OCR搜索结果
      const combinedResult = {
        ...result,
        ocrResults: ocrResults,
        ocrMatches: ocrResults.reduce((sum, r) => sum + r.matches.length, 0),
        totalMatchesIncludingOCR: result.totalMatches + ocrResults.reduce((sum, r) => sum + r.matches.length, 0)
      };

      console.log('Search results: PDF text:', result.totalMatches, 'OCR:', ocrResults.length, 'pages');
      res.json({ success: true, data: combinedResult });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ success: false, error: 'Search failed' });
    }
  }

  /**
   * POST /api/search/ocr - 基于 OCR 结果搜索（返回文本块位置）
   */
  async searchOCR(req: Request, res: Response) {
    try {
      const { pdfId, keyword } = req.body;

      console.log('[OCR Search] Request:', { pdfId, keyword });

      // 验证参数
      if (!pdfId || !keyword) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: pdfId, keyword'
        });
      }

      // 检查 PDF 是否存在
      const pdf = dbService.getPDFById(pdfId);
      if (!pdf) {
        return res.status(404).json({ success: false, error: 'PDF not found' });
      }

      // 检查是否有 OCR 结果
      if (!pdf.ocrProcessed || !dbService.hasOCRResults(pdfId)) {
        return res.status(400).json({
          success: false,
          error: 'PDF has not been OCR processed. Please process it first.'
        });
      }

      // 搜索 OCR 结果
      const searchResults = dbService.searchOCRResults(pdfId, keyword);

      console.log(`[OCR Search] Found ${searchResults.length} pages with matches`);

      res.json({
        success: true,
        data: {
          pdfId,
          keyword,
          totalPages: searchResults.length,
          totalMatches: searchResults.reduce((sum, r) => sum + r.matches.length, 0),
          results: searchResults,
        }
      });
    } catch (error) {
      console.error('[OCR Search] Error:', error);
      res.status(500).json({ success: false, error: 'OCR search failed' });
    }
  }
}

export const searchController = new SearchController();
