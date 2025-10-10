import axios from 'axios';
import type { ApiResponse, PDFDocument, SearchResponse } from '@/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    throw error;
  }
);

export const pdfApi = {
  listPDFs: () => api.get<ApiResponse<PDFDocument[]>>('/pdfs'),
  getPDF: (id: string) => api.get<ApiResponse<PDFDocument>>(`/pdfs/${id}`),
  getPDFFileUrl: (id: string) => `/api/pdfs/${id}/file`,
  indexPDF: (id: string) => api.post<ApiResponse<void>>(`/pdfs/${id}/index`),
};

export const searchApi = {
  search: (pdfId: string, keyword: string, useSynonyms = false) =>
    api.post<ApiResponse<SearchResponse>>('/search', {
      pdfId,
      keyword,
      useSynonyms,
    }),
};

export const llmApi = {
  getSynonyms: (keyword: string, language = 'both', domain = 'automotive') =>
    api.post<ApiResponse<any>>('/llm/synonyms', { keyword, language, domain }),
  askQuestion: (pdfId: string, question: string) =>
    api.post<ApiResponse<any>>('/llm/qa', { pdfId, question }),
};

export default api;
