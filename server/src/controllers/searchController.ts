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

      // 验证参数
      if (!pdfId || !keyword) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: pdfId, keyword'
        });
      }

      // 检查PDF是否存在
      const pdf = dbService.getPDFById(pdfId);
      if (!pdf) {
        return res.status(404).json({ success: false, error: 'PDF not found' });
      }

      // 检查是否已索引
      if (!pdf.indexed) {
        return res.status(400).json({
          success: false,
          error: 'PDF not indexed. Please index it first.'
        });
      }

      let result;

      // 使用同义词搜索
      if (useSynonyms && process.env.ENABLE_SYNONYM_SEARCH === 'true') {
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
        // 普通搜索
        result = searchEngine.search({ pdfId, keyword });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ success: false, error: 'Search failed' });
    }
  }
}

export const searchController = new SearchController();
