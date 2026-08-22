import { useState, useMemo, useCallback } from "react";
import type { CategoryGroupDTO, BookmarkItemDTO } from "~/modules/categorization/application/get-folder-tree-query";
import { BookmarkStatus } from "~/modules/bookmark/domain/bookmark-schema";
import {
  filterPendingFolders,
  filterVisitedBookmarks,
  countPendingBookmarks,
  extractTopLevelCategories,
} from "./bookmark-filters";

interface UseBookmarkFiltersProps {
  pendingFolders: CategoryGroupDTO[];
  visitedBookmarks: BookmarkItemDTO[];
  activeTab: BookmarkStatus;
}

export function useBookmarkFilters({
  pendingFolders,
  visitedBookmarks,
  activeTab,
}: UseBookmarkFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const clearFilters = useCallback(() => {
    setSearchQuery("");
    setSelectedCategory("");
  }, []);

  // Compute available top-level categories for the active tab view
  const availableCategories = useMemo(() => {
    return extractTopLevelCategories(pendingFolders, visitedBookmarks, activeTab);
  }, [pendingFolders, visitedBookmarks, activeTab]);

  // Compute filtered pending folder tree
  const filteredPendingFolders = useMemo(() => {
    return filterPendingFolders(pendingFolders, {
      category: selectedCategory,
      query: searchQuery,
    });
  }, [pendingFolders, selectedCategory, searchQuery]);

  // Compute filtered visited bookmarks list
  const filteredVisitedBookmarks = useMemo(() => {
    return filterVisitedBookmarks(visitedBookmarks, {
      category: selectedCategory,
      query: searchQuery,
    });
  }, [visitedBookmarks, selectedCategory, searchQuery]);

  const rawPendingTotal = useMemo(() => countPendingBookmarks(pendingFolders), [pendingFolders]);
  const rawVisitedTotal = visitedBookmarks.length;

  const filteredPendingTotal = useMemo(
    () => countPendingBookmarks(filteredPendingFolders),
    [filteredPendingFolders]
  );
  const filteredVisitedTotal = filteredVisitedBookmarks.length;

  const totalCount = activeTab === BookmarkStatus.PENDING ? rawPendingTotal : rawVisitedTotal;
  const filteredCount =
    activeTab === BookmarkStatus.PENDING ? filteredPendingTotal : filteredVisitedTotal;

  const isFiltered = Boolean(searchQuery.trim() || selectedCategory);

  return {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    clearFilters,
    filteredPendingFolders,
    filteredVisitedBookmarks,
    availableCategories,
    totalCount,
    filteredCount,
    isFiltered,
  };
}
