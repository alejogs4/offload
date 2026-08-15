import { redirect, useActionData, Form } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { isPasscodeValid, createAuthCookieHeader, isAuthenticatedRequest } from "~/modules/auth/application/auth-session";
import { LockIcon } from "~/shared/ui/icons";

export async function loader({ request }: LoaderFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie");
  if (isAuthenticatedRequest(cookieHeader)) {
    return redirect("/");
  }
  return {};
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const passcode = formData.get("passcode")?.toString() || "";

  if (!isPasscodeValid(passcode)) {
    return { error: "Invalid passcode. Access denied." };
  }

  return redirect("/", {
    headers: {
      "Set-Cookie": createAuthCookieHeader(true),
    },
  });
}

export default function LoginRoute() {
  const actionData = useActionData<typeof action>();

  return (
    <div className="auth-wrapper">
      <div className="auth-modal">
        <div className="auth-icon-header">
          <div className="auth-lock-circle">
            <LockIcon size={22} />
          </div>
        </div>

        <h1 className="auth-heading">Offload Workspace</h1>
        <p className="auth-desc">Enter your passcode to access your categorized bookmark stream.</p>

        {actionData?.error && (
          <div className="error-toast" role="alert" style={{ marginBottom: "1.25rem", marginTop: 0 }}>
            <span>⚠️</span>
            <span>{actionData.error}</span>
          </div>
        )}

        <Form method="post">
          <div className="field-group">
            <label className="field-label" htmlFor="passcode">
              Access Passcode
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="passcode"
                type="password"
                name="passcode"
                className="form-input"
                style={{ paddingLeft: "1rem" }}
                placeholder="••••••••••••"
                autoFocus
                required
              />
            </div>
          </div>
          <button type="submit" className="btn-submit" style={{ width: "100%", marginTop: "0.5rem" }}>
            Unlock Workspace
          </button>
        </Form>
      </div>
    </div>
  );
}

