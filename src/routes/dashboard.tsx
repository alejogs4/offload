import { redirect, useLoaderData, useRevalidator } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { isAuthenticatedRequest, DEFAULT_USER_ID } from "~/modules/auth/application/auth-session";
import { getFolderTreeQuery, createBookmarkHandler, markBookmarkVisitedHandler } from "~/shared/infrastructure/container";
import { BookmarkStatus } from "~/modules/bookmark/domain/bookmark-status";
import { BookmarkIcon } from "~/shared/ui/icons";
import { BookmarkInputBar } from "~/modules/bookmark/ui/bookmark-input-bar";
import { InProgressBookmarks } from "~/modules/bookmark/ui/in-progress-bookmarks";
import { BookmarkViewTabs } from "~/modules/bookmark/ui/bookmark-view-tabs";
import { PendingChecklistView } from "~/modules/bookmark/ui/pending-checklist-view";
import { VisitedHistoryView } from "~/modules/bookmark/ui/visited-history-view";

const CreateActionSchema = z.object({
  url: z.string().url({ message: "A valid URL is required" }),
});

const MarkVisitedActionSchema = z.object({
  bookmarkId: z.string().uuid({ message: "A valid Bookmark ID is required" }),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie");
  if (!isAuthenticatedRequest(cookieHeader)) {
    return redirect("/login");
  }

  const data = await getFolderTreeQuery.execute(DEFAULT_USER_ID);
  return { folderTree: data };
}

export async function action({ request }: ActionFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie");
  if (!isAuthenticatedRequest(cookieHeader)) {
    return redirect("/login");
  }

  const formData = await request.formData();
  const intent = formData.get("intent")?.toString();

  if (intent === "create") {
    const parsed = CreateActionSchema.safeParse({
      url: formData.get("url")?.toString().trim(),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid URL format" };
    }

    try {
      const bookmark = await createBookmarkHandler.execute({ userId: DEFAULT_USER_ID, url: parsed.data.url });
      return { success: true, bookmarkId: bookmark.id };
    } catch (err: any) {
      return { error: err.message || "Failed to save URL" };
    }
  }

  if (intent === "mark_visited") {
    const parsed = MarkVisitedActionSchema.safeParse({
      bookmarkId: formData.get("bookmarkId")?.toString(),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message || "Invalid Bookmark ID" };
    }

    try {
      await markBookmarkVisitedHandler.execute({
        userId: DEFAULT_USER_ID,
        bookmarkId: parsed.data.bookmarkId,
      });
      return { success: true };
    } catch (err: any) {
      return { error: err.message || "Failed to mark as visited" };
    }
  }

  return { error: "Unknown action intent" };
}

export default function DashboardRoute() {
  const { folderTree } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const [activeTab, setActiveTab] = useState<BookmarkStatus>(BookmarkStatus.PENDING);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const processingBookmarks = folderTree.processingBookmarks ?? [];
  const processingCount = processingBookmarks.length;

  const revalidatorRef = useRef(revalidator);
  revalidatorRef.current = revalidator;

  // Poll-on-Demand: Automatically revalidate every 2000ms ONLY while items are saving/processing
  useEffect(() => {
    if (processingCount === 0) return;

    const interval = setInterval(() => {
      if (revalidatorRef.current.state === "idle") {
        revalidatorRef.current.revalidate();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [processingCount]);

  const totalPending = folderTree.pendingFolders.reduce(
    (acc, f) => acc + f.subcategories.reduce((sAcc, s) => sAcc + s.bookmarks.length, 0),
    0
  );
  const totalVisited = folderTree.visitedBookmarks.length;

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const current = prev[categoryName] ?? true;
      return {
        ...prev,
        [categoryName]: !current,
      };
    });
  };

  return (
    <div>
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="brand-container">
            <a href="/" className="brand-title">
              <div className="brand-icon-wrapper">
                <BookmarkIcon size={18} />
              </div>
              <span>Offload</span>
              <span className="brand-tag">PWA</span>
            </a>
          </div>

          <div className="header-meta">
            <span className="header-meta-badge">
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--success-color)", display: "inline-block" }} />
              Workspace Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {/* Quick URL Input Bar */}
        <BookmarkInputBar />

        {/* Live Saving / In-Progress Links Section */}
        <InProgressBookmarks bookmarks={processingBookmarks} />

        {/* View Tabs Header */}
        <BookmarkViewTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pendingCount={totalPending}
          visitedCount={totalVisited}
        />

        {/* Pending Reading List View */}
        {activeTab === BookmarkStatus.PENDING && (
          <PendingChecklistView
            pendingFolders={folderTree.pendingFolders}
            processingCount={processingCount}
            expandedCategories={expandedCategories}
            onToggleCategory={toggleCategory}
          />
        )}

        {/* Visited Archive View */}
        {activeTab === BookmarkStatus.VISITED && (
          <VisitedHistoryView visitedBookmarks={folderTree.visitedBookmarks} />
        )}
      </main>
    </div>
  );
}
