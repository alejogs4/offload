import { redirect, useActionData, Form } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { isPasscodeValid, createAuthCookieHeader, isAuthenticatedRequest } from "~/modules/auth/application/auth-session";

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
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Offload MVP</h1>
        <p className="auth-subtitle">Enter your admin passcode to access your bookmark workspace.</p>

        {actionData?.error && (
          <div className="error-banner">{actionData.error}</div>
        )}

        <Form method="post">
          <div className="form-group">
            <label className="form-label" htmlFor="passcode">
              Passcode
            </label>
            <input
              id="passcode"
              type="password"
              name="passcode"
              className="form-input"
              placeholder="Enter passcode..."
              autoFocus
              required
            />
          </div>
          <button type="submit" className="btn-primary">
            Unlock Workspace
          </button>
        </Form>
      </div>
    </div>
  );
}
