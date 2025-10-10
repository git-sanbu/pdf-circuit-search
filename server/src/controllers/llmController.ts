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

      if (!pdfId || !question) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: pdfId, question',
        });
      }

      // 从问题中提取关键词
      const keywords = this.extractKeywords(question);

      // 搜索相关段落
      let relevantSegments = [];
      for (const keyword of keywords) {
        const segments = dbService.searchSegments(pdfId, keyword);
        relevantSegments.push(...segments);
      }

      // 去重并限制数量
      relevantSegments = this.deduplicateAndLimit(relevantSegments, 10);

      if (relevantSegments.length === 0) {
        return res.json({
          success: true,
          data: {
            question,
            answer: '抱歉，在文档中未找到相关信息来回答该问题。',
            confidence: 0,
            sources: []
          }
        });
      }

      // 构建上下文
      const context = relevantSegments
        .map((seg) => `[页码${seg.pageNumber}] ${seg.text}`)
        .join('\n\n');

      // 调用LLM
      const result = await llmService.answerQuestion({
        pdfId,
        question,
        context,
      });

      // 添加来源
      result.sources = relevantSegments.map((seg) => ({
        pageNumber: seg.pageNumber,
        text: seg.text.substring(0, 200),
      }));

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('QA error:', error);
      res.status(500).json({ success: false, error: 'Failed to answer question' });
    }
  }

  /**
   * 从问题中提取关键词（简化版）
   */
  private extractKeywords(question: string): string[] {
    // 移除常见疑问词
    const stopWords = ['什么', '哪些', '如何', '怎么', '是', '的', '吗', '呢', '？', '?', '连接', '到'];
    let words = question.split(/[\s,，、]+/);
    words = words.filter((w) => w.length > 1 && !stopWords.includes(w));
    return words.slice(0, 3); // 最多3个关键词
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
