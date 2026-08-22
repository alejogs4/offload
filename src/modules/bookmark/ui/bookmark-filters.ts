import type { CategoryGroupDTO, BookmarkItemDTO } from "~/modules/categorization/application/get-folder-tree-query";
import { BookmarkStatus } from "~/modules/bookmark/domain/bookmark-schema";

export interface FilterCriteria {
  category?: string;
  query?: string;
}

/**
 * Normalizes text by trimming, lowercasing, and stripping diacritics / accents.
 */
export function normalizeText(str: string | undefined | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Evaluates whether a bookmark matches the free-text query across title, description, or url.
 */
export function matchesBookmarkText(
  bookmark: Pick<BookmarkItemDTO, "title" | "description" | "url">,
  rawQuery: string
): boolean {
  const query = normalizeText(rawQuery);
  if (!query) return true;

  const normalizedTitle = normalizeText(bookmark.title);
  const normalizedDescription = normalizeText(bookmark.description);
  const normalizedUrl = normalizeText(bookmark.url);

  return (
    normalizedTitle.includes(query) ||
    normalizedDescription.includes(query) ||
    normalizedUrl.includes(query)
  );
}

/**
 * Filters the nested pending folder tree by top-level category and search query.
 * Prunes empty subcategories and categories.
 */
export function filterPendingFolders(
  folders: CategoryGroupDTO[],
  filters: FilterCriteria
): CategoryGroupDTO[] {
  const targetCategory = normalizeText(filters.category);
  const isCategoryWildcard = !targetCategory || targetCategory === "all";

  return folders
    .filter((categoryGroup) => {
      if (isCategoryWildcard) return true;
      return normalizeText(categoryGroup.name) === targetCategory;
    })
    .map((categoryGroup) => {
      const filteredSubcategories = categoryGroup.subcategories
        .map((sub) => ({
          ...sub,
          bookmarks: sub.bookmarks.filter((b) => matchesBookmarkText(b, filters.query || "")),
        }))
        .filter((sub) => sub.bookmarks.length > 0);

      return {
        ...categoryGroup,
        subcategories: filteredSubcategories,
      };
    })
    .filter((categoryGroup) => categoryGroup.subcategories.length > 0);
}

/**
 * Filters the flat list of visited bookmarks by top-level category and search query.
 */
export function filterVisitedBookmarks(
  bookmarks: BookmarkItemDTO[],
  filters: FilterCriteria
): BookmarkItemDTO[] {
  const targetCategory = normalizeText(filters.category);
  const isCategoryWildcard = !targetCategory || targetCategory === "all";

  return bookmarks.filter((bookmark) => {
    if (!isCategoryWildcard && normalizeText(bookmark.category) !== targetCategory) {
      return false;
    }
    return matchesBookmarkText(bookmark, filters.query || "");
  });
}

/**
 * Counts total bookmarks inside a hierarchical pending folder structure.
 */
export function countPendingBookmarks(folders: CategoryGroupDTO[]): number {
  return folders.reduce(
    (acc, folder) =>
      acc + folder.subcategories.reduce((subAcc, sub) => subAcc + sub.bookmarks.length, 0),
    0
  );
}

/**
 * Extracts unique top-level categories based on the currently active tab or collection.
 */
export function extractTopLevelCategories(
  pendingFolders: CategoryGroupDTO[],
  visitedBookmarks: BookmarkItemDTO[],
  activeTab: BookmarkStatus
): string[] {
  const categorySet = new Set<string>();

  if (activeTab === BookmarkStatus.PENDING) {
    for (const folder of pendingFolders) {
      if (folder.name && folder.name.trim()) {
        categorySet.add(folder.name.trim());
      }
    }
  } else {
    for (const b of visitedBookmarks) {
      if (b.category && b.category.trim()) {
        categorySet.add(b.category.trim());
      }
    }
  }

  return Array.from(categorySet).sort((a, b) => a.localeCompare(b));
}
