import React, { useState, useEffect } from "react";
import { useFetcher } from "react-router";
import { LinkIcon, PlusIcon, AlertCircleIcon } from "~/shared/ui/icons";

export function BookmarkInputBar() {
  const fetcher = useFetcher<{ error?: string; success?: boolean }>();
  const [urlInput, setUrlInput] = useState("");
  const isSaving = fetcher.state === "submitting" || fetcher.state === "loading";

  useEffect(() => {
    if (fetcher.data?.success) {
      setUrlInput("");
    }
  }, [fetcher.data]);

  return (
    <div className="url-input-card">
      <fetcher.Form
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
            placeholder="Paste any link to organize and read later (https://...)"
            required
            aria-label="Bookmark URL"
          />
        </div>
        <button type="submit" className="btn-submit" disabled={isSaving}>
          {isSaving ? (
            <>
              <span className="loading-spinner" aria-hidden="true" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <PlusIcon size={16} />
              <span>Save URL</span>
            </>
          )}
        </button>
      </fetcher.Form>

      {fetcher.data?.error && (
        <div className="error-toast" role="alert">
          <AlertCircleIcon size={16} />
          <span>{fetcher.data.error}</span>
        </div>
      )}
    </div>
  );
}
