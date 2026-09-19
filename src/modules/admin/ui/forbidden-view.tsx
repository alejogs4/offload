import { ShieldCheckIcon } from "~/shared/ui/icons";

export function ForbiddenView() {
  return (
    <div className="admin-forbidden-container">
      <div className="admin-forbidden-card">
        <div className="admin-forbidden-icon-wrap" aria-hidden="true">
          <ShieldCheckIcon size={28} />
        </div>
        <h1 className="admin-forbidden-title">403 — Access Forbidden</h1>
        <p className="admin-forbidden-desc">
          Your account does not have administrative privileges to access the
          management backoffice or data migration tools.
        </p>
        <div className="admin-forbidden-actions">
          <a href="/" className="btn-submit admin-return-link">
            Return to workspace
          </a>
        </div>
      </div>
    </div>
  );
}
