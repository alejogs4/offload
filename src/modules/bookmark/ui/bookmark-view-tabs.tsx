import React from "react";
import { BookmarkStatus } from "~/modules/bookmark/domain/bookmark-status";
import { ListCheckIcon, CheckCircleIcon } from "~/shared/ui/icons";

interface BookmarkViewTabsProps {
  activeTab: BookmarkStatus;
  onTabChange: (tab: BookmarkStatus) => void;
  pendingCount: number;
  visitedCount: number;
}

export function BookmarkViewTabs({
  activeTab,
  onTabChange,
  pendingCount,
  visitedCount,
}: BookmarkViewTabsProps) {
  return (
    <div className="tabs-header">
      <div className="segmented-tabs" role="tablist" aria-label="Bookmark views">
        <button
          role="tab"
          aria-selected={activeTab === BookmarkStatus.PENDING}
          className={`tab-pill ${activeTab === BookmarkStatus.PENDING ? "active" : ""}`}
          onClick={() => onTabChange(BookmarkStatus.PENDING)}
        >
          <ListCheckIcon size={16} />
          <span>Reading List</span>
          <span className="tab-counter">{pendingCount}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === BookmarkStatus.VISITED}
          className={`tab-pill ${activeTab === BookmarkStatus.VISITED ? "active" : ""}`}
          onClick={() => onTabChange(BookmarkStatus.VISITED)}
        >
          <CheckCircleIcon size={16} />
          <span>Archive</span>
          <span className="tab-counter">{visitedCount}</span>
        </button>
      </div>
    </div>
  );
}
