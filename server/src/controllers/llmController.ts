import { Request, Response } from 'express';
import { llmService } from '../services/llmService.js';
import { dbService } from '../services/database.js';

export class LLMController {
  /**
   * POST /api/llm/synonyms - 获取同义词
   */
  async getSynonyms(req: Request, res: Response) {
    try {
      const { keyword, language, domain } = req.body;

      if (!keyword) {
        return res.status(400).json({ success: false, error: 'Missing keyword' });
      }

      const result = await llmService.getSynonyms({ keyword, language, domain });
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('Synonym error:', error);
      res.status(500).json({ success: false, error: 'Failed to get synonyms' });
    }
  }

  /**
   * POST /api/llm/qa - 文档问答
   */
  async answerQuestion(req: Request, res: Response) {
    try {
      const { pdfId, question } = req.body;

      console.log('[QA] Question:', question, 'for PDF:', pdfId);

      if (!pdfId || !question) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: pdfId, question',
        });
      }

      // 检查PDF是否存在且已索引
      const pdf = dbService.getPDFById(pdfId);
      if (!pdf) {
        return res.status(404).json({ success: false, error: 'PDF not found' });
      }

      if (!pdf.indexed) {
        return res.status(400).json({
          success: false,
          error: 'PDF not indexed. Please index it first.'
        });
      }

      // 从问题中提取关键词
      const keywords = this.extractKeywords(question);
      console.log('[QA] Extracted keywords:', keywords);

      // 搜索相关段落（包括PDF文本和OCR结果）
      let relevantSegments = [];
      let ocrContext = '';

      if (keywords.length > 0) {
        // 搜索PDF文本
        for (const keyword of keywords) {
          const segments = dbService.searchSegments(pdfId, keyword);
          relevantSegments.push(...segments);
        }

        // 搜索OCR结果
        if (pdf.ocrProcessed && dbService.hasOCRResults(pdfId)) {
          for (const keyword of keywords) {
            const ocrResults = dbService.searchOCRResults(pdfId, keyword);
            if (ocrResults.length > 0) {
              console.log('[QA] Found', ocrResults.length, 'OCR pages with keyword:', keyword);
              // 将OCR结果转换为上下文文本
              ocrContext += ocrResults
                .map(result => `[页码${result.pageNumber}-OCR] ${result.matches.map(m => m.text).join(' ')}`)
                .join('\n\n');
            }
          }
        }
      }

      // 如果关键词搜索无结果，获取所有段落（限制数量）
      if (relevantSegments.length === 0 && !ocrContext) {
        console.log('[QA] No keyword matches, fetching all segments');
        relevantSegments = dbService.getAllSegments(pdfId, 50);

        // 也尝试获取OCR文本
        if (pdf.ocrProcessed && dbService.hasOCRResults(pdfId)) {
          const allOCRResults = dbService.getOCRResultsByPDF(pdfId);
          if (allOCRResults.length > 0) {
            ocrContext = allOCRResults.slice(0, 10)
              .map(result => `[页码${result.pageNumber}-OCR] ${result.ocrText}`)
              .join('\n\n');
          }
        }
      }

      // 去重并限制数量
      relevantSegments = this.deduplicateAndLimit(relevantSegments, 20);

      console.log('[QA] Found', relevantSegments.length, 'PDF text segments and', ocrContext ? 'OCR context' : 'no OCR context');

      if (relevantSegments.length === 0 && !ocrContext) {
        return res.json({
          success: true,
          data: {
            question,
            answer: '抱歉，该PDF文档尚未索引或内容为空。请先点击"立即索引"按钮进行索引。',
            confidence: 0,
            sources: []
          }
        });
      }

      // 构建上下文（合并PDF文本和OCR结果）
      const pdfContext = relevantSegments
        .map((seg) => `[页码${seg.pageNumber}] ${seg.text}`)
        .join('\n\n');

      const context = [pdfContext, ocrContext].filter(c => c).join('\n\n');

      console.log('[QA] Total context length:', context.length, 'chars');

      // 调用LLM
      const result = await llmService.answerQuestion({
        pdfId,
        question,
        context,
      });

      // 添加来源
      result.sources = relevantSegments.slice(0, 5).map((seg) => ({
        pageNumber: seg.pageNumber,
        text: seg.text.substring(0, 200),
      }));

      console.log('[QA] Answer generated, length:', result.answer.length);

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[QA] Error:', error);
      res.status(500).json({ success: false, error: 'Failed to answer question' });
    }
  }

  /**
   * 从问题中提取关键词（改进版）
   */
  private extractKeywords(question: string): string[] {
    // 移除常见疑问词和连接词
    const stopWords = [
      '什么', '哪些', '如何', '怎么', '是', '的', '吗', '呢', '？', '?',
      '连接', '到', '有', '在', '和', '与', '或', '了', '着', '过',
      '这', '那', '哪', '为', '从', '给', '对', '把', '被', '让',
      '能', '会', '可以', '应该', '需要', '想', '要', '去', '来',
      'what', 'which', 'how', 'where', 'when', 'why', 'who', 'is', 'are',
      'the', 'a', 'an', 'to', 'of', 'and', 'or', 'in', 'on', 'at'
    ];

    // 分词：按空格、标点分割
    let words = question.split(/[\s,，、。！？!?；;：:]+/);

    // 过滤：移除停用词、长度<2的词、纯数字
    words = words.filter((w) => {
      const trimmed = w.trim();
      return trimmed.length >= 2 &&
             !stopWords.includes(trimmed.toLowerCase()) &&
             !/^\d+$/.test(trimmed); // 排除纯数字
    });

    // 提取英文缩写（通常是大写字母组合，如 ECU, APS）
    const abbreviations = words.filter(w => /^[A-Z]{2,}$/.test(w));

    // 提取中文关键词（通常是名词）
    const chineseKeywords = words.filter(w => /[\u4e00-\u9fa5]{2,}/.test(w));

    // 提取英文单词
    const englishKeywords = words.filter(w => /^[a-zA-Z]{3,}$/i.test(w));

    // 优先级：缩写 > 中文关键词 > 英文单词
    const allKeywords = [...abbreviations, ...chineseKeywords, ...englishKeywords];

    // 去重并限制数量
    const uniqueKeywords = [...new Set(allKeywords)];

    return uniqueKeywords.slice(0, 5); // 最多5个关键词
  }

  /**
   * 去重并限制数量
   */
  private deduplicateAndLimit(segments: any[], limit: number): any[] {
    const seen = new Set();
    const result = [];

    for (const seg of segments) {
      if (!seen.has(seg.id) && result.length < limit) {
        seen.add(seg.id);
        result.push(seg);
      }
    }

    return result;
  }
}

export const llmController = new LLMController();
