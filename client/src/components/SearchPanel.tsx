import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Search, ChevronRight, Loader2, AlertCircle, FileText, Sparkles } from 'lucide-react';
import { searchApi } from '@/services/api';
import { useSearchStore } from '@/stores/searchStore';
import type { SearchResponse, SearchResult } from '@/types';

interface SearchPanelProps {
  pdfId: string;
}

export default function SearchPanel({ pdfId }: SearchPanelProps) {
  const [keyword, setKeyword] = useState('');
  const [useSynonyms, setUseSynonyms] = useState(false);

  const {
    searchResult,
    currentMatchIndex,
    isSearching,
    setSearchResult,
    setIsSearching,
    setCurrentMatchIndex,
    navigateNext,
  } = useSearchStore();

  const searchMutation = useMutation({
    mutationFn: async ({ keyword, useSynonyms }: { keyword: string; useSynonyms: boolean }) => {
      const response = await searchApi.search(pdfId, keyword, useSynonyms);
      return response.data;
    },
    onMutate: () => {
      setIsSearching(true);
    },
    onSuccess: (data: SearchResponse) => {
      setSearchResult(data);
      setIsSearching(false);
    },
    onError: (error) => {
      console.error('Search error:', error);
      setIsSearching(false);
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    searchMutation.mutate({ keyword: keyword.trim(), useSynonyms });
  };

  const handleResultClick = (index: number) => {
    setCurrentMatchIndex(index);
  };

  const handleNextClick = () => {
    navigateNext();
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Search Form */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Search className="w-5 h-5" />
          Search in Document
        </h2>

        <form onSubmit={handleSearch} className="space-y-3">
          <div>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Enter keyword to search..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              disabled={isSearching}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="useSynonyms"
              checked={useSynonyms}
              onChange={(e) => setUseSynonyms(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              disabled={isSearching}
            />
            <label htmlFor="useSynonyms" className="text-sm text-gray-700 flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Use AI synonym expansion
            </label>
          </div>

          <button
            type="submit"
            disabled={isSearching || !keyword.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search
              </>
            )}
          </button>
        </form>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto">
        {searchMutation.isError && (
          <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Search failed</p>
              <p className="text-xs text-red-600 mt-1">
                {(searchMutation.error as Error).message}
              </p>
            </div>
          </div>
        )}

        {searchResult && (
          <div className="p-4">
            {/* Results Summary */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">
                  Found {searchResult.totalMatches} result{searchResult.totalMatches !== 1 ? 's' : ''}
                </p>
                {searchResult.totalMatches > 0 && (
                  <button
                    onClick={handleNextClick}
                    className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-full flex items-center gap-1 transition-colors"
                  >
                    Next
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {searchResult.expandedKeywords && searchResult.expandedKeywords.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    Expanded keywords:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {searchResult.expandedKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Results List */}
            {searchResult.totalMatches === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mb-3" />
                <p className="text-sm">No matches found</p>
                <p className="text-xs text-gray-400 mt-1">Try different keywords</p>
              </div>
            ) : (
              <div className="space-y-2">
                {searchResult.results.map((result, index) => (
                  <div
                    key={result.segment.id}
                    onClick={() => handleResultClick(index)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      index === currentMatchIndex
                        ? 'bg-blue-50 border-blue-500 shadow-sm'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            index === currentMatchIndex
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          Page {result.segment.pageNumber}
                        </span>
                        <span className="text-xs text-gray-500">
                          {result.segment.type}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {Math.round(result.relevance * 100)}% match
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 line-clamp-3">
                      {result.highlightText || result.segment.text}
                    </p>

                    {index === currentMatchIndex && (
                      <div className="mt-2 pt-2 border-t border-blue-200">
                        <p className="text-xs text-blue-600 flex items-center gap-1">
                          <ChevronRight className="w-3 h-3" />
                          Currently viewing
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!searchResult && !searchMutation.isError && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
            <Search className="w-16 h-16 mb-4" />
            <p className="text-sm text-center">
              Enter a keyword above to search through the document
            </p>
            <p className="text-xs text-center mt-2">
              Enable synonym expansion for better results
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
