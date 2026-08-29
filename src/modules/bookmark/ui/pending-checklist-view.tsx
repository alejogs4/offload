import React from "react";
import { useFetcher, useFetchers } from "react-router";
import type { CategoryGroupDTO, BookmarkItemDTO } from "~/modules/categorization/application/get-folder-tree-query";
import {
  FolderIcon,
  SubFolderIcon,
  CheckIcon,
  ExternalLinkIcon,
  GlobeIcon,
  InboxIcon,
  ChevronDownIcon,
  SearchIcon,
} from "~/shared/ui/icons";

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Extracts the set of bookmark IDs currently in transit with `intent === "mark_visited"`
 * across all active React Router fetchers.
 */
export function useInFlightVisitedIds(): Set<string> {
  const fetchers = useFetchers();
  const inFlightIds = new Set<string>();

  for (const fetcher of fetchers) {
    if (fetcher.formData?.get("intent") === "mark_visited") {
      const bookmarkId = fetcher.formData.get("bookmarkId")?.toString();
      if (bookmarkId) {
        inFlightIds.add(bookmarkId);
      }
    }
  }

  return inFlightIds;
}

interface PendingChecklistViewProps {
  pendingFolders: CategoryGroupDTO[];
  processingCount?: number;
  expandedCategories: Record<string, boolean>;
  onToggleCategory: (categoryName: string) => void;
  isFiltered?: boolean;
  onClearFilters?: () => void;
}

function PendingBookmarkItem({ bookmark }: { bookmark: BookmarkItemDTO }) {
  const fetcher = useFetcher({ key: `mark-visited-${bookmark.id}` });

  return (
    <div key={bookmark.id} className="checklist-item">
      {/* Complete Action Button */}
      <fetcher.Form method="post" className="checkbox-action-wrapper">
        <input type="hidden" name="intent" value="mark_visited" />
        <input type="hidden" name="bookmarkId" value={bookmark.id} />
        <button
          type="submit"
          className="custom-checkbox-btn"
          title="Mark as visited & move to archive"
          aria-label={`Mark ${bookmark.title} as visited`}
        >
          <CheckIcon size={14} />
        </button>
      </fetcher.Form>

      {/* Thumbnail / Favicon */}
      <div className="item-media-container">
        {bookmark.ogImage ? (
          <img
            src={bookmark.ogImage}
            alt=""
            className="item-thumbnail"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "flex";
            }}
          />
        ) : null}
        <div
          className="item-favicon-box"
          style={{ display: bookmark.ogImage ? "none" : "flex" }}
        >
          <img
            src={`https://www.google.com/s2/favicons?domain=${getDomainFromUrl(bookmark.url)}&sz=64`}
            alt=""
            className="item-favicon-img"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.opacity = "0.3";
            }}
          />
        </div>
      </div>

      {/* Item Details */}
      <div className="item-body">
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="item-title-link"
        >
          <span>{bookmark.title}</span>
          <ExternalLinkIcon size={13} className="item-external-icon" />
        </a>

        {bookmark.description && (
          <p className="item-description-text">{bookmark.description}</p>
        )}

        <div className="item-meta-bar">
          <span className="domain-pill">
            <GlobeIcon size={12} />
            <span>{getDomainFromUrl(bookmark.url)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function PendingChecklistView({
  pendingFolders,
  processingCount = 0,
  expandedCategories,
  onToggleCategory,
  isFiltered = false,
  onClearFilters,
}: PendingChecklistViewProps) {
  const inFlightVisitedIds = useInFlightVisitedIds();

  // Optimistically filter bookmarks and prune empty categories/subcategories
  const visibleFolders = pendingFolders
    .map((category) => {
      const visibleSubcategories = category.subcategories
        .map((sub) => ({
          ...sub,
          bookmarks: sub.bookmarks.filter((b) => !inFlightVisitedIds.has(b.id)),
        }))
        .filter((sub) => sub.bookmarks.length > 0);

      return {
        ...category,
        subcategories: visibleSubcategories,
        totalItems: visibleSubcategories.reduce((acc, sub) => acc + sub.bookmarks.length, 0),
      };
    })
    .filter((category) => category.totalItems > 0);

  if (visibleFolders.length === 0 && processingCount === 0) {
    if (isFiltered) {
      return (
        <div className="empty-placeholder">
          <div className="empty-icon-wrap">
            <SearchIcon size={28} />
          </div>
          <h2 className="empty-title">No matching bookmarks found</h2>
          <p className="empty-subtitle">
            No pending items match your current filters. Try changing your search query or category.
          </p>
          {onClearFilters && (
            <button
              type="button"
              className="filter-empty-reset-btn"
              onClick={onClearFilters}
            >
              Clear filters
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="empty-placeholder">
        <div className="empty-icon-wrap">
          <InboxIcon size={28} />
        </div>
        <h2 className="empty-title">All caught up!</h2>
        <p className="empty-subtitle">
          Paste any link above to automatically organize and save it to your reading list.
        </p>
      </div>
    );
  }

  return (
    <div>
      {visibleFolders.map((category) => {
        const isExpanded = expandedCategories[category.name] ?? true;
        return (
          <div key={category.name} className="category-group">
            <div className="category-card">
              {/* Collapsible Category Header */}
              <button
                type="button"
                className="category-card-header"
                onClick={() => onToggleCategory(category.name)}
                aria-expanded={isExpanded}
              >
                <div className="category-title-wrap">
                  <FolderIcon className="category-icon" size={18} />
                  <span>{category.name}</span>
                </div>
                <div className="category-header-right">
                  <span className="category-badge">
                    {category.totalItems} items
                  </span>
                  <ChevronDownIcon
                    size={16}
                    className={`chevron-toggle-icon ${isExpanded ? "" : "collapsed"}`}
                  />
                </div>
              </button>

              {/* Subcategories body */}
              {isExpanded && (
                <div className="category-card-body">
                  {category.subcategories.map((sub) => (
                    <div key={sub.name} className="subcategory-block">
                      <div className="subcategory-label">
                        <SubFolderIcon size={14} />
                        <span>{sub.name}</span>
                      </div>

                      <div className="checklist-list">
                        {sub.bookmarks.map((bookmark) => (
                          <PendingBookmarkItem key={bookmark.id} bookmark={bookmark} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
