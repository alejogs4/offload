import { redirect, useLoaderData, useRevalidator, data } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { isAuthenticatedRequest, DEFAULT_USER_ID } from "~/modules/auth/application/auth-session";
import { getFolderTreeQuery, createBookmarkHandler, markBookmarkVisitedHandler } from "~/shared/infrastructure/container";
import { withServerTiming } from "~/shared/infrastructure/telemetry/server-timing";
import { toUserErrorMessage } from "~/shared/domain/errors";
import { BookmarkStatus } from "~/modules/bookmark/domain/bookmark-status";
import { BookmarkIcon, AlertCircleIcon } from "~/shared/ui/icons";
import { BookmarkInputBar } from "~/modules/bookmark/ui/bookmark-input-bar";
import { InProgressBookmarks } from "~/modules/bookmark/ui/in-progress-bookmarks";
import { BookmarkViewTabs } from "~/modules/bookmark/ui/bookmark-view-tabs";
import { PendingChecklistView, useInFlightVisitedIds } from "~/modules/bookmark/ui/pending-checklist-view";
import { VisitedHistoryView } from "~/modules/bookmark/ui/visited-history-view";
import { BookmarkFilterBar } from "~/modules/bookmark/ui/bookmark-filter-bar";
import { useBookmarkFilters } from "~/modules/bookmark/ui/use-bookmark-filters";

const CreateActionSchema = z.object({
  url: z.string().url({ message: "A valid URL is required" }),
});

const MarkVisitedActionSchema = z.object({
  bookmarkId: z.string().uuid({ message: "A valid Bookmark ID is required" }),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const { result, timing } = await withServerTiming(async (t) => {
    const authStart = performance.now();
    const cookieHeader = request.headers.get("Cookie");
    const isAuth = isAuthenticatedRequest(cookieHeader);
    t.record("auth", performance.now() - authStart, "Session verification");

    if (!isAuth) {
      return { redirect: true as const, folderTree: null };
    }

    const folderTree = await getFolderTreeQuery.execute(DEFAULT_USER_ID);
    return { redirect: false as const, folderTree };
  });

  if (result.redirect) {
    return redirect("/login");
  }

  return data(
    { folderTree: result.folderTree! },
    {
      headers: {
        "Server-Timing": timing.toHeader(),
      },
    }
  );
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { result, timing } = await withServerTiming(async (t) => {
      const authStart = performance.now();
      const cookieHeader = request.headers.get("Cookie");
      const isAuth = isAuthenticatedRequest(cookieHeader);
      t.record("auth", performance.now() - authStart, "Session verification");

      if (!isAuth) {
        return { redirect: true as const, response: null };
      }

      const formData = await request.formData();
      const intent = formData.get("intent")?.toString();

      if (intent === "create") {
        const parsed = CreateActionSchema.safeParse({
          url: formData.get("url")?.toString().trim(),
        });

        if (!parsed.success) {
          return {
            redirect: false as const,
            response: { error: parsed.error.issues[0]?.message || "Invalid URL format" },
          };
        }

        try {
          const bookmark = await createBookmarkHandler.execute({ userId: DEFAULT_USER_ID, url: parsed.data.url });
          return { redirect: false as const, response: { success: true, bookmarkId: bookmark.id } };
        } catch (err: unknown) {
          return { redirect: false as const, response: { error: toUserErrorMessage(err, "Internal error") } };
        }
      }

      if (intent === "mark_visited") {
        const parsed = MarkVisitedActionSchema.safeParse({
          bookmarkId: formData.get("bookmarkId")?.toString(),
        });

        if (!parsed.success) {
          return {
            redirect: false as const,
            response: { error: parsed.error.issues[0]?.message || "Invalid Bookmark ID" },
          };
        }

        try {
          await markBookmarkVisitedHandler.execute({
            userId: DEFAULT_USER_ID,
            bookmarkId: parsed.data.bookmarkId,
          });
          return { redirect: false as const, response: { success: true } };
        } catch (err: unknown) {
          return { redirect: false as const, response: { error: toUserErrorMessage(err, "Internal error") } };
        }
      }

      return { redirect: false as const, response: { error: "Unknown action intent" } };
    });

    if (result.redirect) {
      return redirect("/login");
    }

    return data(result.response, {
      headers: {
        "Server-Timing": timing.toHeader(),
      },
    });
  } catch (err: unknown) {
    console.error("[Dashboard Action Top-Level Error]:", err);
    return data(
      { error: "Internal error" },
      { status: 500 }
    );
  }
}

export default function DashboardRoute() {
  const { folderTree } = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const [activeTab, setActiveTab] = useState<BookmarkStatus>(BookmarkStatus.PENDING);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const inFlightVisitedIds = useInFlightVisitedIds();
  const inFlightCount = inFlightVisitedIds.size;

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

  const rawPendingCount = folderTree.pendingFolders.reduce(
    (acc, f) => acc + f.subcategories.reduce((sAcc, s) => sAcc + s.bookmarks.length, 0),
    0
  );
  const rawVisitedCount = folderTree.visitedBookmarks.length;

  const optimisticPendingCount = Math.max(0, rawPendingCount - inFlightCount);
  const optimisticVisitedCount = rawVisitedCount + inFlightCount;

  const {
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
  } = useBookmarkFilters({
    pendingFolders: folderTree.pendingFolders,
    visitedBookmarks: folderTree.visitedBookmarks,
    activeTab,
  });

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
              <span className="status-dot" aria-hidden="true" />
              <span>Workspace active</span>
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
          pendingCount={optimisticPendingCount}
          visitedCount={optimisticVisitedCount}
        />

        {/* Client-Side Filter Bar */}
        <BookmarkFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          availableCategories={availableCategories}
          totalCount={totalCount}
          filteredCount={filteredCount}
          onClearFilters={clearFilters}
        />

        {/* Pending Reading List View */}
        {activeTab === BookmarkStatus.PENDING && (
          <PendingChecklistView
            pendingFolders={filteredPendingFolders}
            processingCount={processingCount}
            expandedCategories={expandedCategories}
            onToggleCategory={toggleCategory}
            isFiltered={isFiltered}
            onClearFilters={clearFilters}
          />
        )}

        {/* Visited Archive View */}
        {activeTab === BookmarkStatus.VISITED && (
          <VisitedHistoryView
            visitedBookmarks={filteredVisitedBookmarks}
            isFiltered={isFiltered}
            onClearFilters={clearFilters}
          />
        )}
      </main>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div className="app-main" style={{ paddingTop: "4rem" }}>
      <div className="empty-placeholder" style={{ borderColor: "var(--status-danger-border)" }}>
        <div className="empty-icon-wrap" style={{ color: "var(--status-danger-text)" }}>
          <AlertCircleIcon size={24} />
        </div>
        <h2 className="empty-title">Internal error</h2>
        <p className="empty-subtitle">An unexpected error occurred while loading your workspace.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-submit"
          style={{ marginTop: "1.25rem" }}
        >
          Reload page
        </button>
      </div>
    </div>
  );
}
