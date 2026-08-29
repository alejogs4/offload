import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, useRouteError } from "react-router";
import href from "./app.css?url";
import { AlertCircleIcon } from "./shared/ui/icons";

export function links() {
  return [
    { rel: "stylesheet", href },
    { rel: "manifest", href: "/manifest.webmanifest" },
    { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Offload" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('[PWA] ServiceWorker registered with scope:', registration.scope);
                    },
                    function(err) {
                      console.log('[PWA] ServiceWorker registration failed:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="auth-wrapper">
      <div className="auth-modal" style={{ textAlign: "center" }}>
        <div className="auth-icon-header">
          <div className="auth-lock-circle" style={{ color: "var(--status-danger-text)" }}>
            <AlertCircleIcon size={22} />
          </div>
        </div>
        <h1 className="auth-heading">{isNotFound ? "Page Not Found" : "Internal error"}</h1>
        <p className="auth-desc">
          {isNotFound
            ? "The page you are looking for does not exist."
            : "An unexpected error occurred. Please try refreshing the page."}
        </p>
        <button
          type="button"
          onClick={() => (window.location.href = "/")}
          className="btn-submit"
          style={{ width: "100%", marginTop: "0.5rem" }}
        >
          {isNotFound ? "Back to Dashboard" : "Reload"}
        </button>
      </div>
    </div>
  );
}
