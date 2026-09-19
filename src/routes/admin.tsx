import { Outlet, redirect, useLoaderData, data } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { auth } from "~/shared/infrastructure/auth/auth.server";
import { isAuthenticatedRequest } from "~/modules/auth/application/auth-session";
import { adminAuthService } from "~/shared/infrastructure/container";
import { AdminLayout } from "~/modules/admin/ui/admin-layout";
import { ForbiddenView } from "~/modules/admin/ui/forbidden-view";
import { withServerTiming } from "~/shared/infrastructure/telemetry/server-timing";
import { AlertCircleIcon } from "~/shared/ui/icons";

export async function loader({ request }: LoaderFunctionArgs) {
  const { result, timing } = await withServerTiming(async (t) => {
    const authStart = performance.now();
    let session = await auth.api.getSession({ headers: request.headers }).catch(() => null);
    let currentUser: { id: string; email: string; name?: string; role: string } | null = null;

    if (session?.user) {
      currentUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: (session.user as { role?: string }).role || "admin",
      };
    } else {
      const cookieHeader = request.headers.get("Cookie");
      if (isAuthenticatedRequest(cookieHeader)) {
        currentUser = {
          id: "admin-user",
          email: process.env.ADMIN_EMAIL || "admin@offload.local",
          name: "Admin",
          role: "admin",
        };
      }
    }

    t.record("auth", performance.now() - authStart, "Session verification");

    if (!currentUser) {
      return { redirect: true as const, authorized: false, user: null };
    }

    const isAuthorized = adminAuthService.isAdmin(currentUser);
    return {
      redirect: false as const,
      authorized: isAuthorized,
      user: isAuthorized ? currentUser : null,
    };
  });

  if (result.redirect) {
    return redirect("/login");
  }

  if (!result.authorized) {
    return data(
      { authorized: false, user: null },
      {
        status: 403,
        headers: {
          "Server-Timing": timing.toHeader(),
        },
      }
    );
  }

  return data(
    { authorized: true, user: result.user },
    {
      headers: {
        "Server-Timing": timing.toHeader(),
      },
    }
  );
}

export default function AdminRoute() {
  const loaderData = useLoaderData<typeof loader>();

  if (!loaderData.authorized || !loaderData.user) {
    return <ForbiddenView />;
  }

  return (
    <AdminLayout currentUser={loaderData.user}>
      <Outlet context={{ user: loaderData.user }} />
    </AdminLayout>
  );
}

export function ErrorBoundary() {
  return (
    <div className="admin-container" style={{ paddingTop: "4rem" }}>
      <div className="empty-placeholder" style={{ borderColor: "var(--status-danger-border)" }}>
        <div className="empty-icon-wrap" style={{ color: "var(--status-danger-text)" }}>
          <AlertCircleIcon size={24} />
        </div>
        <h2 className="empty-title">Admin error</h2>
        <p className="empty-subtitle">An unexpected error occurred in the administrative backoffice.</p>
        <a href="/admin" className="btn-submit" style={{ marginTop: "1.25rem", display: "inline-block" }}>
          Reload Admin
        </a>
      </div>
    </div>
  );
}
