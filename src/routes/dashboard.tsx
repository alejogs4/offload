import { redirect, useLoaderData, useFetcher } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useState } from "react";
import { z } from "zod";
import { isAuthenticatedRequest, DEFAULT_USER_ID } from "~/modules/auth/application/auth-session";
import { getFolderTreeQuery, createBookmarkHandler, markBookmarkVisitedHandler } from "~/shared/infrastructure/container";
import { BookmarkStatus } from "~/modules/bookmark/domain/bookmark-status";
import {
  BookmarkIcon,
  FolderIcon,
  SubFolderIcon,
  PlusIcon,
  ExternalLinkIcon,
  CheckIcon,
  CheckCircleIcon,
  GlobeIcon,
  InboxIcon,
  ListCheckIcon,
  LinkIcon,
  ChevronDownIcon,
} from "~/shared/ui/icons";

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
      await createBookmarkHandler.execute({ userId: DEFAULT_USER_ID, url: parsed.data.url });
      return { success: true };
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
  const fetcher = useFetcher();
  const addFetcher = useFetcher();
  const [urlInput, setUrlInput] = useState("");
  const [activeTab, setActiveTab] = useState<BookmarkStatus>(BookmarkStatus.PENDING);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const isSaving = addFetcher.state === "submitting" || addFetcher.state === "loading";

  const totalPending = folderTree.pendingFolders.reduce(
    (acc, f) => acc + f.subcategories.reduce((sAcc, s) => sAcc + s.bookmarks.length, 0),
    0
  );
  const totalVisited = folderTree.visitedBookmarks.length;

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryName]: !prev[categoryName],
    }));
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
        <div className="url-input-card">
          <addFetcher.Form
            method="post"
            className="url-form"
            onSubmit={() => {
              setUrlInput("");
            }}
          >
            <input type="hidden" name="intent" value="create" />
            <div className="url-input-wrapper">
              <span className="url-input-icon">
                <LinkIcon size={18} />
              </span>
              <input
                type="url"
                name="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="form-input"
                placeholder="Paste any article, doc, or website URL (https://...)"
                required
                aria-label="Bookmark URL"
              />
            </div>
            <button type="submit" className="btn-submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <span className="loading-spinner" aria-hidden="true" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <PlusIcon size={16} />
                  <span>Save URL</span>
                </>
              )}
            </button>
          </addFetcher.Form>

          {addFetcher.data?.error && (
            <div className="error-toast" role="alert">
              <span>⚠️</span>
              <span>{addFetcher.data.error}</span>
            </div>
          )}
        </div>

        {/* View Tabs Header */}
        <div className="tabs-header">
          <div className="segmented-tabs" role="tablist" aria-label="Bookmark views">
            <button
              role="tab"
              aria-selected={activeTab === BookmarkStatus.PENDING}
              className={`tab-pill ${activeTab === BookmarkStatus.PENDING ? "active" : ""}`}
              onClick={() => setActiveTab(BookmarkStatus.PENDING)}
            >
              <ListCheckIcon size={16} />
              <span>Pending Queue</span>
              <span className="tab-counter">{totalPending}</span>
            </button>
            <button
              role="tab"
              aria-selected={activeTab === BookmarkStatus.VISITED}
              className={`tab-pill ${activeTab === BookmarkStatus.VISITED ? "active" : ""}`}
              onClick={() => setActiveTab(BookmarkStatus.VISITED)}
            >
              <CheckCircleIcon size={16} />
              <span>Visited Archive</span>
              <span className="tab-counter">{totalVisited}</span>
            </button>
          </div>
        </div>

        {/* Pending Checklist View */}
        {activeTab === BookmarkStatus.PENDING && (
          <div>
            {folderTree.pendingFolders.length === 0 ? (
              <div className="empty-placeholder">
                <div className="empty-icon-wrap">
                  <InboxIcon size={28} />
                </div>
                <h2 className="empty-title">Queue is clear!</h2>
                <p className="empty-subtitle">Paste any article, repo, or link above to automatically analyze, summarize, and categorize it.</p>
              </div>
            ) : (
              folderTree.pendingFolders.map((category) => {
                const isExpanded = Boolean(expandedCategories[category.name]);
                return (
                  <div key={category.name} className="category-group">
                    <div className="category-card">
                      {/* Collapsible Category Header */}
                      <button
                        type="button"
                        className="category-card-header"
                        onClick={() => toggleCategory(category.name)}
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
                                          src={`https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=64`}
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
                                          <span>{new URL(bookmark.url).hostname}</span>
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
              })
            )}
          </div>
        )}


        {/* Visited History View */}
        {activeTab === BookmarkStatus.VISITED && (
          <div>
            {folderTree.visitedBookmarks.length === 0 ? (
              <div className="empty-placeholder">
                <div className="empty-icon-wrap">
                  <CheckCircleIcon size={28} />
                </div>
                <h2 className="empty-title">Archive is empty</h2>
                <p className="empty-subtitle">Items marked as visited will be preserved here for your reference history.</p>
              </div>
            ) : (
              <div className="category-card">
                <div className="category-card-header">
                  <div className="category-title-wrap">
                    <CheckCircleIcon className="category-icon" size={18} />
                    <span>Completed Readings</span>
                  </div>
                  <span className="category-badge">{folderTree.visitedBookmarks.length} archived</span>
                </div>

                <div className="subcategory-block">
                  <div className="checklist-list">
                    {folderTree.visitedBookmarks.map((bookmark) => (
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
                              src={`https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=64`}
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
                              <span>{new URL(bookmark.url).hostname}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

