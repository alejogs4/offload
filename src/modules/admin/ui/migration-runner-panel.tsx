import { useFetcher } from "react-router";
import type { LegacyMigrationStatus } from "../domain/admin-repository-port";
import type { SessionUser } from "../domain/admin-authorization-service";
import {
  DatabaseIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
} from "~/shared/ui/icons";

interface MigrationRunnerPanelProps {
  initialStatus: LegacyMigrationStatus;
  targetUser: SessionUser;
}

interface ActionData {
  success?: boolean;
  migratedCount?: number;
  error?: string;
}

export function MigrationRunnerPanel({
  initialStatus,
  targetUser,
}: MigrationRunnerPanelProps) {
  const fetcher = useFetcher<ActionData>();
  const isSubmitting = fetcher.state !== "idle";

  // Calculate current effective pending count taking action result into account
  const actionSuccess = fetcher.data?.success;
  const migratedCount = fetcher.data?.migratedCount ?? 0;
  const pendingCount = actionSuccess
    ? Math.max(0, initialStatus.pendingCount - migratedCount)
    : initialStatus.pendingCount;

  const hasPendingRecords = pendingCount > 0;
  const targetIdentifier = targetUser.email || targetUser.id;

  return (
    <div className="admin-migrations-container">
      {/* Overview Card */}
      <section className="admin-card" aria-labelledby="migration-heading">
        <div className="admin-card-header">
          <div className="admin-card-title-group">
            <div className="admin-card-icon" aria-hidden="true">
              <DatabaseIcon size={18} />
            </div>
            <div>
              <h2 id="migration-heading" className="admin-card-title">
                Legacy Data Migration
              </h2>
              <p className="admin-card-subtitle">
                Reassign unassigned local records to your administrator account
              </p>
            </div>
          </div>

          {hasPendingRecords ? (
            <span className="admin-badge admin-badge-warning">
              <AlertTriangleIcon size={14} />
              <span>{pendingCount} Pending</span>
            </span>
          ) : (
            <span className="admin-badge admin-badge-success">
              <CheckCircleIcon size={14} />
              <span>All Migrations Completed</span>
            </span>
          )}
        </div>

        {/* Action feedback banners */}
        {fetcher.data?.error && (
          <div className="error-toast" role="alert">
            <AlertCircleIcon size={16} />
            <span>{fetcher.data.error}</span>
          </div>
        )}

        {actionSuccess && (
          <div className="admin-success-banner" role="status">
            <CheckCircleIcon size={18} className="success-icon" />
            <div className="success-text">
              <strong>Migration successfully executed!</strong>
              <span>
                {migratedCount} {migratedCount === 1 ? "record" : "records"}{" "}
                reassigned to <code>{targetIdentifier}</code>.
              </span>
            </div>
          </div>
        )}

        {/* Migration Transition Schema */}
        <div className="admin-migration-flow-card">
          <div className="admin-flow-node">
            <span className="admin-flow-node-label">Source Owner</span>
            <div className="admin-flow-node-id">
              <code className="admin-code-badge">
                {initialStatus.legacyUserId}
              </code>
              <span className="admin-flow-tag">Legacy local</span>
            </div>
            <span className="admin-flow-count">
              {pendingCount} {pendingCount === 1 ? "record" : "records"} remaining
            </span>
          </div>

          <div className="admin-flow-arrow" aria-hidden="true">
            <ArrowRightIcon size={20} />
          </div>

          <div className="admin-flow-node">
            <span className="admin-flow-node-label">Destination Owner</span>
            <div className="admin-flow-node-id">
              <code className="admin-code-badge admin-code-target">
                {targetIdentifier}
              </code>
              <span className="admin-flow-tag admin-flow-tag-admin">Active Admin</span>
            </div>
            <span className="admin-flow-count">Target account</span>
          </div>
        </div>

        {/* Execution Trigger Actions */}
        <div className="admin-migration-actions">
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="migrate_legacy" />
            <input
              type="hidden"
              name="targetUserId"
              value={targetUser.id}
            />

            <button
              type="submit"
              disabled={!hasPendingRecords || isSubmitting}
              className={`btn-submit admin-execute-btn ${
                !hasPendingRecords ? "btn-disabled" : ""
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCwIcon size={16} className="spin" />
                  <span>Migrating records...</span>
                </>
              ) : hasPendingRecords ? (
                <>
                  <RefreshCwIcon size={16} />
                  <span>Execute Migration ({pendingCount})</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon size={16} />
                  <span>No Pending Migrations</span>
                </>
              )}
            </button>
          </fetcher.Form>

          <p className="admin-action-help-text">
            {hasPendingRecords
              ? "Executing this migration will atomically update all bookmark records assigned to local-user-1 in a single database transaction."
              : "All legacy bookmarks have been transferred to authenticated user accounts. No actions required."}
          </p>
        </div>
      </section>
    </div>
  );
}
