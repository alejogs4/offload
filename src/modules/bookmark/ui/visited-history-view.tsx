import React from "react";
import type { BookmarkItemDTO } from "~/modules/categorization/application/get-folder-tree-query";
import {
  FolderIcon,
  CheckIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  GlobeIcon,
} from "~/shared/ui/icons";

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

interface VisitedHistoryViewProps {
  visitedBookmarks: BookmarkItemDTO[];
}

export function VisitedHistoryView({ visitedBookmarks }: VisitedHistoryViewProps) {
  if (visitedBookmarks.length === 0) {
    return (
      <div className="empty-placeholder">
        <div className="empty-icon-wrap">
          <CheckCircleIcon size={28} />
        </div>
        <h2 className="empty-title">Archive is empty</h2>
        <p className="empty-subtitle">Links you've read will be preserved here for your reference.</p>
      </div>
    );
  }

  return (
    <div className="category-card">
      <div className="category-card-header">
        <div className="category-title-wrap">
          <CheckCircleIcon className="category-icon" size={18} />
          <span>Read History</span>
        </div>
        <span className="category-badge">{visitedBookmarks.length} read</span>
      </div>

      <div className="subcategory-block">
        <div className="checklist-list">
          {visitedBookmarks.map((bookmark) => (
            <div key={bookmark.id} className="checklist-item visited-item">
              <div className="checkbox-action-wrapper">
                <div className="custom-checkbox-btn checked" aria-hidden="true">
                  <CheckIcon size={14} />
                </div>
              </div>

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
                  />
                </div>
              </div>

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

                <div className="item-meta-bar">
                  <span className="category-path-pill">
                    <FolderIcon size={12} />
                    <span>{bookmark.category}</span>
                    <span>/</span>
                    <span>{bookmark.subcategory}</span>
                  </span>
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
    </div>
  );
}
