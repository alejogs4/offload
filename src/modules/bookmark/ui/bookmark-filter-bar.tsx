import React from "react";
import { SearchIcon, XIcon, FilterIcon } from "~/shared/ui/icons";

export interface BookmarkFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  availableCategories: string[];
  totalCount: number;
  filteredCount: number;
  onClearFilters: () => void;
}

export function BookmarkFilterBar({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  availableCategories,
  totalCount,
  filteredCount,
  onClearFilters,
}: BookmarkFilterBarProps) {
  const isFiltered = Boolean(searchQuery.trim() || selectedCategory);

  // If there are no items in this list view at all and no active filter, hide the filter bar to keep UI clean
  if (totalCount === 0 && !isFiltered) {
    return null;
  }

  return (
    <div className="filter-bar-container" role="search" aria-label="Bookmark filters">
      <div className="filter-controls-row">
        {/* Search Input Box */}
        <div className="filter-search-wrapper">
          <span className="filter-search-icon" aria-hidden="true">
            <SearchIcon size={16} />
          </span>
          <input
            type="text"
            className="filter-search-input"
            placeholder="Search by title, description or domain..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search bookmarks"
          />
          {searchQuery && (
            <button
              type="button"
              className="filter-clear-query-btn"
              onClick={() => onSearchChange("")}
              title="Clear search query"
              aria-label="Clear search query"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>

        {/* Category Select Dropdown */}
        <div className="filter-category-wrapper">
          <span className="filter-category-icon" aria-hidden="true">
            <FilterIcon size={15} />
          </span>
          <select
            className="filter-category-select"
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All Categories ({totalCount})</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filter Summary Bar (if filtered) */}
      {isFiltered && (
        <div className="filter-status-row">
          <span className="filter-status-text">
            Showing <strong>{filteredCount}</strong> of {totalCount} {totalCount === 1 ? "bookmark" : "bookmarks"}
            {selectedCategory && (
              <span className="filter-tag-pill">
                Category: <strong>{selectedCategory}</strong>
              </span>
            )}
            {searchQuery.trim() && (
              <span className="filter-tag-pill">
                Query: <strong>"{searchQuery}"</strong>
              </span>
            )}
          </span>

          <button
            type="button"
            className="filter-reset-all-btn"
            onClick={onClearFilters}
            aria-label="Reset all filters"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
