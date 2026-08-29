import { redirect, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { useState } from "react";
import { auth } from "~/shared/infrastructure/auth/auth.server";
import { authClient } from "~/shared/infrastructure/auth/auth.client";
import { BookmarkIcon, GithubIcon, GoogleIcon, AlertCircleIcon } from "~/shared/ui/icons";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (session) {
    return redirect("/");
  }

  const url = new URL(request.url);
  const errorParam = url.searchParams.get("error");
  let errorMessage: string | null = null;

  if (errorParam) {
    if (errorParam === "access_denied") {
      errorMessage = "Sign-in was cancelled or access was denied.";
    } else {
      errorMessage = `Authentication failed: ${errorParam}`;
    }
  }

  return { error: errorMessage };
}

export default function LoginRoute() {
  const { error: initialError } = useLoaderData<typeof loader>();
  const [loadingProvider, setLoadingProvider] = useState<"github" | "google" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError);

  const handleOAuthSignIn = async (provider: "github" | "google") => {
    setLoadingProvider(provider);
    setErrorMessage(null);

    try {
      await authClient.signIn.social({
        provider,
        callbackURL: "/",
      });
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to initiate sign-in. Please try again.");
      setLoadingProvider(null);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-modal">
        <div className="auth-icon-header">
          <div className="brand-icon-wrapper" style={{ width: 44, height: 44, borderRadius: 10 }}>
            <BookmarkIcon size={24} />
          </div>
        </div>

        <h1 className="auth-heading">Offload Workspace</h1>
        <p className="auth-desc">Sign in to access your categorized bookmark stream.</p>

        {errorMessage && (
          <div className="error-toast" role="alert" style={{ marginBottom: "1.25rem", marginTop: 0 }}>
            <AlertCircleIcon size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="oauth-buttons-list">
          <button
            type="button"
            className="btn-oauth btn-oauth-github"
            disabled={loadingProvider !== null}
            onClick={() => handleOAuthSignIn("github")}
          >
            {loadingProvider === "github" ? (
              <span className="loading-spinner" aria-hidden="true" />
            ) : (
              <GithubIcon size={18} />
            )}
            <span>{loadingProvider === "github" ? "Signing in..." : "Continue with GitHub"}</span>
          </button>

          <button
            type="button"
            className="btn-oauth btn-oauth-google"
            disabled={loadingProvider !== null}
            onClick={() => handleOAuthSignIn("google")}
          >
            {loadingProvider === "google" ? (
              <span
                className="loading-spinner"
                style={{ borderColor: "rgba(0,0,0,0.15)", borderTopColor: "#000000" }}
                aria-hidden="true"
              />
            ) : (
              <GoogleIcon size={18} />
            )}
            <span>{loadingProvider === "google" ? "Signing in..." : "Continue with Google"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

