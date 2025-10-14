import OpenAI from 'openai';
import dotenv from 'dotenv';

// Ensure dotenv is loaded before initializing OpenAI client
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3',
  timeout: 90000, // 90 seconds timeout for API calls
  maxRetries: 2, // Retry up to 2 times on failure
});

export interface SynonymRequest {
  keyword: string;
  language?: 'zh' | 'en' | 'both';
  domain?: 'automotive' | 'general';
}

export interface SynonymResponse {
  original: string;
  synonyms: string[];
  translations: {
    zh: string[];
    en: string[];
  };
}

export interface QARequest {
  pdfId: string;
  question: string;
  context: string;
}

export interface QAResponse {
  question: string;
  answer: string;
  confidence: number;
  sources: Array<{
    pageNumber: number;
    text: string;
  }>;
}

export class LLMService {
  /**
   * 获取关键词同义词
   */
  async getSynonyms(request: SynonymRequest): Promise<SynonymResponse> {
    const { keyword, language = 'both', domain = 'automotive' } = request;

    const prompt = `你是汽车电路图领域的专家。请为以下元器件名称提供所有可能的同义词、别名和翻译。

关键词: ${keyword}
领域: ${domain === 'automotive' ? '汽车电路' : '通用'}
语言: ${language}

请提供:
1. 中文同义词和别名
2. 英文名称及常用缩写
3. 行业术语

以JSON格式输出（不要包含markdown代码块标记）:
{
  "synonyms_zh": ["同义词1", "同义词2"],
  "synonyms_en": ["English Name", "Abbreviation"],
  "abbreviations": ["ABB1", "ABB2"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content || '{}';
      const parsed = JSON.parse(content);

      const allSynonyms = [
        keyword,
        ...(parsed.synonyms_zh || []),
        ...(parsed.synonyms_en || []),
        ...(parsed.abbreviations || []),
      ];

      return {
        original: keyword,
        synonyms: [...new Set(allSynonyms)], // 去重
        translations: {
          zh: [keyword, ...(parsed.synonyms_zh || [])],
          en: parsed.synonyms_en || [],
        },
      };
    } catch (error) {
      console.error('LLM Synonym Error:', error);
      // 返回原始关键词作为fallback
      return {
        original: keyword,
        synonyms: [keyword],
        translations: { zh: [keyword], en: [] },
      };
    }
  }

  /**
   * 文档问答
   */
  async answerQuestion(request: QARequest): Promise<QAResponse> {
    const { question, context } = request;

    const prompt = `你是汽车电路图分析专家。根据以下电路图文档内容，准确回答用户问题。

文档内容:
${context}

用户问题: ${question}

要求:
1. 仅基于文档内容回答
2. 如果文档中没有相关信息，明确说明
3. 引用具体的页码
4. 对于连接性问题，给出具体的针脚号和连接路径

请用自然语言回答:`;

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      });

      const answer = response.choices[0].message.content || '无法回答该问题';

      return {
        question,
        answer,
        confidence: 0.85, // 简化版本
        sources: [], // 由调用方提供
      };
    } catch (error) {
      console.error('LLM QA Error:', error);
      throw new Error('Failed to answer question');
    }
  }
}

export const llmService = new LLMService();
