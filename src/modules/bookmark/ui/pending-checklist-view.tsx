import React from "react";
import { useFetcher, useFetchers } from "react-router";
import {
  STARRED_CATEGORY_NAME,
  type CategoryGroupDTO,
  type BookmarkItemDTO,
} from "~/modules/categorization/application/get-folder-tree-query";
import { DefaultTaxonomy } from "~/modules/bookmark/domain/bookmark-schema";
import {
  FolderIcon,
  SubFolderIcon,
  CheckIcon,
  StarIcon,
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

/**
 * Extracts a map of bookmarkId -> optimistic `isStarred` boolean from active
 * React Router fetchers with `intent === "toggle_starred"`.
 */
export function useInFlightStarredOverrides(): Map<string, boolean> {
  const fetchers = useFetchers();
  const overrides = new Map<string, boolean>();

  for (const fetcher of fetchers) {
    if (fetcher.formData?.get("intent") === "toggle_starred") {
      const bookmarkId = fetcher.formData.get("bookmarkId")?.toString();
      const isStarredRaw = fetcher.formData.get("isStarred")?.toString();
      if (bookmarkId && (isStarredRaw === "true" || isStarredRaw === "false")) {
        overrides.set(bookmarkId, isStarredRaw === "true");
      }
    }
  }

  return overrides;
}

/**
 * Applies optimistic visited removals and optimistic star/unstar transitions
 * so newly starred items immediately appear in the pinned "Starred" category at index 0
 * and unstarred items return to their original category/subcategory.
 */
export function buildOptimisticVisibleFolders(
  pendingFolders: CategoryGroupDTO[],
  inFlightVisitedIds: Set<string>,
  inFlightStarredOverrides: Map<string, boolean>
): Array<CategoryGroupDTO & { totalItems: number }> {
  if (inFlightStarredOverrides.size === 0) {
    return pendingFolders
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
  }

  const starredBookmarks: BookmarkItemDTO[] = [];
  const categoryMap = new Map<string, Map<string, BookmarkItemDTO[]>>();

  // Preserve existing category order for non-Starred categories
  for (const folder of pendingFolders) {
    if (folder.name !== STARRED_CATEGORY_NAME) {
      categoryMap.set(folder.name, new Map());
    }
  }

  for (const folder of pendingFolders) {
    for (const sub of folder.subcategories) {
      for (const rawBookmark of sub.bookmarks) {
        if (inFlightVisitedIds.has(rawBookmark.id)) continue;

        const effectiveStarred = inFlightStarredOverrides.has(rawBookmark.id)
          ? inFlightStarredOverrides.get(rawBookmark.id)!
          : rawBookmark.isStarred;

        const bookmark: BookmarkItemDTO =
          effectiveStarred === rawBookmark.isStarred
            ? rawBookmark
            : { ...rawBookmark, isStarred: effectiveStarred };

        if (bookmark.isStarred) {
          starredBookmarks.push(bookmark);
        } else {
          const catName = bookmark.category || DefaultTaxonomy.CATEGORY;
          const subName = bookmark.subcategory || DefaultTaxonomy.SUBCATEGORY;
          if (!categoryMap.has(catName)) {
            categoryMap.set(catName, new Map());
          }
          const subMap = categoryMap.get(catName)!;
          if (!subMap.has(subName)) {
            subMap.set(subName, []);
          }
          subMap.get(subName)!.push(bookmark);
        }
      }
    }
  }

  const result: Array<CategoryGroupDTO & { totalItems: number }> = [];

  if (starredBookmarks.length > 0) {
    result.push({
      name: STARRED_CATEGORY_NAME,
      isFlat: true,
      subcategories: [{ name: "", bookmarks: starredBookmarks }],
      totalItems: starredBookmarks.length,
    });
  }

  for (const [catName, subMap] of categoryMap.entries()) {
    const subcategories = Array.from(subMap.entries())
      .map(([subName, bookmarks]) => ({ name: subName, bookmarks }))
      .filter((sub) => sub.bookmarks.length > 0);

    const totalItems = subcategories.reduce((acc, sub) => acc + sub.bookmarks.length, 0);
    if (totalItems > 0) {
      result.push({
        name: catName,
        subcategories,
        totalItems,
      });
    }
  }

  return result;
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
  const visitFetcher = useFetcher({ key: `mark-visited-${bookmark.id}` });
  const starFetcher = useFetcher({ key: `toggle-starred-${bookmark.id}` });

  return (
    <div key={bookmark.id} className="checklist-item">
      {/* Complete & Star Action Buttons */}
      <div className="item-actions-group">
        <visitFetcher.Form method="post" className="checkbox-action-wrapper">
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
        </visitFetcher.Form>

        <starFetcher.Form method="post" className="star-action-wrapper">
          <input type="hidden" name="intent" value="toggle_starred" />
          <input type="hidden" name="bookmarkId" value={bookmark.id} />
          <input type="hidden" name="isStarred" value={String(!bookmark.isStarred)} />
          <button
            type="submit"
            className={`star-action-btn ${bookmark.isStarred ? "starred" : ""}`}
            title={bookmark.isStarred ? "Remove from Starred" : "Star to pin at top"}
            aria-label={bookmark.isStarred ? `Unstar ${bookmark.title}` : `Star ${bookmark.title}`}
            aria-pressed={bookmark.isStarred}
          >
            <StarIcon size={15} filled={bookmark.isStarred} />
          </button>
        </starFetcher.Form>
      </div>

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
  const inFlightStarredOverrides = useInFlightStarredOverrides();

  // Optimistically filter bookmarks, apply star/unstar overrides, and prune empty groups
  const visibleFolders = buildOptimisticVisibleFolders(
    pendingFolders,
    inFlightVisitedIds,
    inFlightStarredOverrides
  );

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
        const isStarredCategory =
          category.name === STARRED_CATEGORY_NAME || Boolean(category.isFlat);

        return (
          <div key={category.name} className="category-group">
            <div className={`category-card ${isStarredCategory ? "starred-category-card" : ""}`}>
              {/* Collapsible Category Header */}
              <button
                type="button"
                className="category-card-header"
                onClick={() => onToggleCategory(category.name)}
                aria-expanded={isExpanded}
              >
                <div className="category-title-wrap">
                  {isStarredCategory ? (
                    <StarIcon className="category-icon starred-category-icon" size={18} filled />
                  ) : (
                    <FolderIcon className="category-icon" size={18} />
                  )}
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

              {/* Category body: flat checklist for Starred, nested subcategories for regular categories */}
              {isExpanded && (
                <div className="category-card-body">
                  {isStarredCategory ? (
                    <div className="subcategory-block starred-flat-block">
                      <div className="checklist-list">
                        {category.subcategories
                          .flatMap((sub) => sub.bookmarks)
                          .map((bookmark) => (
                            <PendingBookmarkItem key={bookmark.id} bookmark={bookmark} />
                          ))}
                      </div>
                    </div>
                  ) : (
                    category.subcategories.map((sub) => (
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
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
