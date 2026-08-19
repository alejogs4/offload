import React from "react";
import type { BookmarkItemDTO } from "~/modules/categorization/application/get-folder-tree-query";
import { SparklesIcon, GlobeIcon } from "~/shared/ui/icons";

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

interface InProgressBookmarksProps {
  bookmarks: BookmarkItemDTO[];
}

export function InProgressBookmarks({ bookmarks }: InProgressBookmarksProps) {
  if (!bookmarks || bookmarks.length === 0) {
    return null;
  }

  return (
    <section className="processing-queue-section" aria-label="Saving Links">
      <div className="processing-queue-header">
        <div className="processing-queue-title-wrap">
          <span className="pulse-indicator" aria-hidden="true" />
          <h2 className="processing-queue-title">
            Saving Links ({bookmarks.length})
          </h2>
        </div>
        <span className="processing-badge">
          <SparklesIcon size={13} />
          <span>Organizing with AI</span>
        </span>
      </div>

      <div className="processing-cards-list">
        {bookmarks.map((bookmark) => (
          <div key={bookmark.id} className="processing-card" role="status" aria-live="polite">
            <div className="processing-card-shimmer" aria-hidden="true" />
            <div className="processing-card-content">
              <div className="processing-spinner-box" aria-hidden="true">
                <span className="processing-spinner" />
              </div>
              <div className="processing-card-body">
                <div className="processing-card-title">{bookmark.title || bookmark.url}</div>
                <div className="processing-card-meta">
                  <span className="domain-pill">
                    <GlobeIcon size={12} />
                    <span>{getDomainFromUrl(bookmark.url)}</span>
                  </span>
                  <span className="processing-step-pill">
                    <SparklesIcon size={11} />
                    <span>Reading content & finding topics...</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
