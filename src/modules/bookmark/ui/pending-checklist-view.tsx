import React from "react";
import { useFetcher } from "react-router";
import type { CategoryGroupDTO } from "~/modules/categorization/application/get-folder-tree-query";
import {
  FolderIcon,
  SubFolderIcon,
  CheckIcon,
  ExternalLinkIcon,
  GlobeIcon,
  InboxIcon,
  ChevronDownIcon,
} from "~/shared/ui/icons";

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

interface PendingChecklistViewProps {
  pendingFolders: CategoryGroupDTO[];
  processingCount?: number;
  expandedCategories: Record<string, boolean>;
  onToggleCategory: (categoryName: string) => void;
}

export function PendingChecklistView({
  pendingFolders,
  processingCount = 0,
  expandedCategories,
  onToggleCategory,
}: PendingChecklistViewProps) {
  const fetcher = useFetcher();

  if (pendingFolders.length === 0 && processingCount === 0) {
    return (
      <div className="empty-placeholder">
        <div className="empty-icon-wrap">
          <InboxIcon size={28} />
        </div>
        <h2 className="empty-title">All caught up!</h2>
        <p className="empty-subtitle">Paste any link above to automatically organize and save it to your reading list.</p>
      </div>
    );
  }

  return (
    <div>
      {pendingFolders.map((category) => {
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
                    {category.subcategories.reduce((acc, sub) => acc + sub.bookmarks.length, 0)} items
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
                              <fetcher.Form method="post" style={{ display: "inline" }}>
                                <input type="hidden" name="intent" value="mark_visited" />
                                <input type="hidden" name="bookmarkId" value={bookmark.id} />
                                <a
                                  href={bookmark.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="item-title-link"
                                  onClick={(e) => {
                                    const form = e.currentTarget.previousElementSibling as HTMLFormElement;
                                    if (form) form.requestSubmit();
                                  }}
                                >
                                  <span>{bookmark.title}</span>
                                  <ExternalLinkIcon size={13} className="item-external-icon" />
                                </a>
                              </fetcher.Form>

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
