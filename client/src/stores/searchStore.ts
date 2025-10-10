import { create } from 'zustand';
import type { SearchResponse } from '@/types';

interface SearchState {
  searchResult: SearchResponse | null;
  currentMatchIndex: number;
  isSearching: boolean;
  setSearchResult: (result: SearchResponse | null) => void;
  setCurrentMatchIndex: (index: number) => void;
  setIsSearching: (loading: boolean) => void;
  navigateNext: () => void;
  navigatePrev: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  searchResult: null,
  currentMatchIndex: 0,
  isSearching: false,

  setSearchResult: (result) => set({ searchResult: result, currentMatchIndex: 0 }),
  setCurrentMatchIndex: (index) => set({ currentMatchIndex: index }),
  setIsSearching: (loading) => set({ isSearching: loading }),

  navigateNext: () => {
    const { searchResult, currentMatchIndex } = get();
    if (!searchResult) return;
    const nextIndex = (currentMatchIndex + 1) % searchResult.totalMatches;
    set({ currentMatchIndex: nextIndex });
  },

  navigatePrev: () => {
    const { searchResult, currentMatchIndex } = get();
    if (!searchResult) return;
    const prevIndex =
      currentMatchIndex === 0
        ? searchResult.totalMatches - 1
        : currentMatchIndex - 1;
    set({ currentMatchIndex: prevIndex });
  },
}));
