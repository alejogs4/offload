import { redirect, useLoaderData, useFetcher } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { isAuthenticatedRequest, DEFAULT_USER_ID } from "~/modules/auth/application/auth-session";
import { getFolderTreeQuery, createBookmarkHandler, markBookmarkVisitedHandler } from "~/shared/infrastructure/container";
import { useState } from "react";

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
    const url = formData.get("url")?.toString().trim();
    if (!url) return { error: "URL is required" };

    try {
      await createBookmarkHandler.execute({ userId: DEFAULT_USER_ID, url });
      return { success: true };
    } catch (err: any) {
      return { error: err.message || "Failed to save URL" };
    }
  }

  if (intent === "mark_visited") {
    const bookmarkId = formData.get("bookmarkId")?.toString();
    if (!bookmarkId) return { error: "Bookmark ID is required" };

    try {
      await markBookmarkVisitedHandler.execute({ userId: DEFAULT_USER_ID, bookmarkId });
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
  const [activeTab, setActiveTab] = useState<"pending" | "visited">("pending");

  const isSaving = addFetcher.state === "submitting" || addFetcher.state === "loading";

  return (
    <div>
      <header className="app-header">
        <div className="header-content">
          <a href="/" className="brand-logo">
            <span>🔖 Offload</span>
            <span className="brand-badge">PWA</span>
          </a>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Single-User Workspace
          </span>
        </div>
      </header>

      <main className="app-main">
        {/* Quick URL Input Bar */}
        <div className="url-input-container">
          <addFetcher.Form
            method="post"
            className="url-form"
            onSubmit={() => {
              setUrlInput("");
            }}
          >
            <input type="hidden" name="intent" value="create" />
            <input
              type="url"
              name="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="form-input url-input"
              placeholder="Paste any website URL to categorize & read later (https://...)"
              required
            />
            <button type="submit" className="btn-primary btn-add" disabled={isSaving}>
              {isSaving ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  <span>Saving URL...</span>
                </>
              ) : (
                "+ Save URL"
              )}
            </button>
          </addFetcher.Form>
          {addFetcher.data?.error && (
            <div className="error-banner" style={{ marginTop: "0.75rem", marginBottom: 0 }}>
              {addFetcher.data.error}
            </div>
          )}
        </div>

        {/* View Tabs */}
        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            📋 Pending Checklist ({folderTree.pendingFolders.reduce((acc, f) => acc + f.subcategories.reduce((sAcc, s) => sAcc + s.bookmarks.length, 0), 0)})
          </button>
          <button
            className={`tab-btn ${activeTab === "visited" ? "active" : ""}`}
            onClick={() => setActiveTab("visited")}
          >
            ✅ Visited History ({folderTree.visitedBookmarks.length})
          </button>
        </div>

        {/* Pending Checklist View */}
        {activeTab === "pending" && (
          <div>
            {folderTree.pendingFolders.length === 0 ? (
              <div className="empty-state">
                <h3>No pending links!</h3>
                <p>Paste a URL above to auto-categorize and add items to your checklist.</p>
              </div>
            ) : (
              folderTree.pendingFolders.map((category) => (
                <div key={category.name} className="category-card">
                  <div className="category-header">
                    <span>📁 {category.name}</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {category.subcategories.reduce((acc, sub) => acc + sub.bookmarks.length, 0)} items
                    </span>
                  </div>

                  {category.subcategories.map((sub) => (
                    <div key={sub.name} className="subcategory-section">
                      <div className="subcategory-title">📂 {sub.name}</div>
                      {sub.bookmarks.map((bookmark) => (
                        <div key={bookmark.id} className="checklist-item">
                          <fetcher.Form method="post" style={{ display: "flex", alignItems: "center" }}>
                            <input type="hidden" name="intent" value="mark_visited" />
                            <input type="hidden" name="bookmarkId" value={bookmark.id} />
                            <input
                              type="checkbox"
                              className="checkbox-btn"
                              aria-label="Mark bookmark as visited"
                              onChange={(e) => {
                                if (e.target.checked) {
                                  e.target.form?.requestSubmit();
                                }
                              }}
                              title="Check to mark as visited"
                            />
                          </fetcher.Form>

                          <div className="item-media">
                            {bookmark.ogImage ? (
                              <img
                                src={bookmark.ogImage}
                                alt=""
                                className="item-thumbnail"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className="item-favicon-wrapper"
                              style={{ display: bookmark.ogImage ? "none" : "flex" }}
                            >
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=64`}
                                alt=""
                                className="item-favicon"
                              />
                            </div>
                          </div>

                          <div className="item-content">
                            <fetcher.Form method="post" style={{ display: "inline" }}>
                              <input type="hidden" name="intent" value="mark_visited" />
                              <input type="hidden" name="bookmarkId" value={bookmark.id} />
                              <a
                                href={bookmark.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="item-title"
                                onClick={(e) => {
                                  const form = e.currentTarget.previousElementSibling as HTMLFormElement;
                                  if (form) form.requestSubmit();
                                }}
                              >
                                {bookmark.title}
                              </a>
                            </fetcher.Form>
                            <p className="item-description">{bookmark.description}</p>
                            <div className="item-domain">🔗 {new URL(bookmark.url).hostname}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        )}

        {/* Visited History View */}
        {activeTab === "visited" && (
          <div>
            {folderTree.visitedBookmarks.length === 0 ? (
              <div className="empty-state">
                <h3>No visited bookmarks yet.</h3>
                <p>Checked or clicked links will appear here.</p>
              </div>
            ) : (
              <div className="category-card" style={{ padding: "1rem" }}>
                {folderTree.visitedBookmarks.map((bookmark) => (
                  <div key={bookmark.id} className="checklist-item visited-item">
                    <input type="checkbox" className="checkbox-btn" checked readOnly aria-label="Visited" />
                    <div className="item-media">
                      {bookmark.ogImage ? (
                        <img
                          src={bookmark.ogImage}
                          alt=""
                          className="item-thumbnail"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = "flex";
                          }}
                        />
                      ) : null}
                      <div
                        className="item-favicon-wrapper"
                        style={{ display: bookmark.ogImage ? "none" : "flex" }}
                      >
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${new URL(bookmark.url).hostname}&sz=64`}
                          alt=""
                          className="item-favicon"
                        />
                      </div>
                    </div>
                    <div className="item-content">
                      <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="item-title"
                      >
                        {bookmark.title}
                      </a>
                      <div className="item-domain">
                        📁 {bookmark.category} &gt; {bookmark.subcategory} • {new URL(bookmark.url).hostname}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
