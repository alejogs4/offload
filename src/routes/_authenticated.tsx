import { redirect, Outlet, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { auth } from "~/shared/infrastructure/auth/auth.server";
import { authClient } from "~/shared/infrastructure/auth/auth.client";
import { BookmarkIcon, LogOutIcon } from "~/shared/ui/icons";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return redirect("/login");
  }

  return { user: session.user, session: session.session };
}

export default function AuthenticatedLayout() {
  const { user } = useLoaderData<typeof loader>();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/login";
        },
      },
    });
  };

  return (
    <div>
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
              <span>{user.name || user.email}</span>
            </span>

            <button
              type="button"
              onClick={handleSignOut}
              className="btn-ghost"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOutIcon size={16} />
              <span className="sign-out-text">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <Outlet context={{ user }} />
    </div>
  );
}
