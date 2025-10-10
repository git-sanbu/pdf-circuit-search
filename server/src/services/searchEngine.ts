import { dbService } from './database.js';
import { TextSegment } from '../models/PDFDocument.js';

export interface SearchRequest {
  pdfId: string;
  keyword: string;
  useSynonyms?: boolean;
}

export interface SearchResult {
  segment: TextSegment;
  relevance: number;
  highlightText: string;
}

export interface SearchResponse {
  keyword: string;
  expandedKeywords?: string[];
  results: SearchResult[];
  totalMatches: number;
}

export class SearchEngine {
  /**
   * 执行搜索
   */
  search(request: SearchRequest): SearchResponse {
    const { pdfId, keyword } = request;

    // 预处理关键词
    const processedKeyword = this.preprocessKeyword(keyword);

    // 搜索文本片段
    const segments = dbService.searchSegments(pdfId, processedKeyword);

    // 计算相关度并排序
    const results = segments
      .map(segment => ({
        segment,
        relevance: this.calculateRelevance(segment, processedKeyword),
        highlightText: this.highlightKeyword(segment.text, processedKeyword)
      }))
      .sort((a, b) => {
        // 先按相关度降序
        if (b.relevance !== a.relevance) {
          return b.relevance - a.relevance;
        }
        // 相关度相同则按页码升序
        return a.segment.pageNumber - b.segment.pageNumber;
      });

    return {
      keyword,
      results,
      totalMatches: results.length
    };
  }

  /**
   * 使用多个关键词搜索（用于同义词）
   */
  searchWithKeywords(pdfId: string, keywords: string[]): SearchResult[] {
    const allResults: SearchResult[] = [];
    const seenIds = new Set<string>();

    for (const keyword of keywords) {
      const result = this.search({ pdfId, keyword });
      for (const res of result.results) {
        if (!seenIds.has(res.segment.id)) {
          seenIds.add(res.segment.id);
          allResults.push(res);
        }
      }
    }

    // 重新排序
    return allResults.sort((a, b) => {
      if (b.relevance !== a.relevance) {
        return b.relevance - a.relevance;
      }
      return a.segment.pageNumber - b.segment.pageNumber;
    });
  }

  /**
   * 预处理关键词
   */
  private preprocessKeyword(keyword: string): string {
    return keyword.trim();
  }

  /**
   * 计算相关度分数
   */
  private calculateRelevance(segment: TextSegment, keyword: string): number {
    // 基础权重
    const typeWeights = {
      title: 3.0,
      table: 2.0,
      text: 1.0
    };

    let score = typeWeights[segment.type];
    const segmentTextLower = segment.text.toLowerCase();
    const keywordLower = keyword.toLowerCase();

    // 完全匹配加成
    if (segmentTextLower === keywordLower) {
      score *= 2;
    }

    // 关键词出现频率
    const occurrences = this.countOccurrences(segmentTextLower, keywordLower);
    score *= (1 + occurrences * 0.2);

    // 关键词位置(越靠前越重要)
    const position = segmentTextLower.indexOf(keywordLower);
    if (position >= 0) {
      const positionFactor = 1 - (position / segment.text.length) * 0.3;
      score *= positionFactor;
    }

    // 字号加成(仅对标题)
    if (segment.type === 'title' && segment.fontSize) {
      const fontFactor = Math.min(segment.fontSize / 16, 1.5);
      score *= fontFactor;
    }

    return Math.round(score * 100) / 100;
  }

  /**
   * 计算关键词出现次数
   */
  private countOccurrences(text: string, keyword: string): number {
    const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * 高亮关键词
   */
  private highlightKeyword(text: string, keyword: string): string {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedKeyword})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
}

export const searchEngine = new SearchEngine();
