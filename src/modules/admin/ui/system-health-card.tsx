import type { SystemStats } from "../domain/admin-repository-port";
import {
  DatabaseIcon,
  ActivityIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  BookmarkIcon,
  RefreshCwIcon,
} from "~/shared/ui/icons";

interface SystemHealthCardProps {
  stats: SystemStats;
}

export function SystemHealthCard({ stats }: SystemHealthCardProps) {
  const isLatencyHealthy = stats.dbLatencyMs < 200;

  return (
    <div className="admin-overview-grid">
      {/* Platform & Telemetry Status Card */}
      <section className="admin-card" aria-labelledby="telemetry-heading">
        <div className="admin-card-header">
          <div className="admin-card-title-group">
            <div className="admin-card-icon" aria-hidden="true">
              <ActivityIcon size={18} />
            </div>
            <div>
              <h2 id="telemetry-heading" className="admin-card-title">
                System Telemetry
              </h2>
              <p className="admin-card-subtitle">Live infrastructure health</p>
            </div>
          </div>
          <span className="admin-badge admin-badge-success">
            <span className="status-dot" aria-hidden="true" />
            <span>Connected</span>
          </span>
        </div>

        <div className="admin-metric-row">
          <div className="admin-metric-item">
            <span className="admin-metric-label">Database Engine</span>
            <span className="admin-metric-value-text">SQLite / LibSQL</span>
          </div>
          <div className="admin-metric-item">
            <span className="admin-metric-label">Round-Trip Latency</span>
            <div className="admin-latency-badge-group">
              <span
                className={`admin-latency-badge ${
                  isLatencyHealthy ? "latency-healthy" : "latency-warning"
                }`}
              >
                {stats.dbLatencyMs} ms
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Aggregate Volume Card */}
      <section className="admin-card" aria-labelledby="inventory-heading">
        <div className="admin-card-header">
          <div className="admin-card-title-group">
            <div className="admin-card-icon" aria-hidden="true">
              <DatabaseIcon size={18} />
            </div>
            <div>
              <h2 id="inventory-heading" className="admin-card-title">
                Bookmark Inventory
              </h2>
              <p className="admin-card-subtitle">Aggregate platform storage</p>
            </div>
          </div>
          <span className="admin-metric-total-badge">
            {stats.totalBookmarks} total
          </span>
        </div>

        <div className="admin-status-counters-grid">
          <div className="admin-counter-tile">
            <div className="admin-counter-header">
              <BookmarkIcon size={16} className="counter-icon-pending" />
              <span className="admin-counter-label">Pending</span>
            </div>
            <span className="admin-counter-number">{stats.pendingCount}</span>
          </div>

          <div className="admin-counter-tile">
            <div className="admin-counter-header">
              <CheckCircleIcon size={16} className="counter-icon-visited" />
              <span className="admin-counter-label">Visited</span>
            </div>
            <span className="admin-counter-number">{stats.visitedCount}</span>
          </div>

          <div className="admin-counter-tile">
            <div className="admin-counter-header">
              <RefreshCwIcon size={16} className="counter-icon-processing" />
              <span className="admin-counter-label">Processing</span>
            </div>
            <span className="admin-counter-number">{stats.processingCount}</span>
          </div>

          <div className="admin-counter-tile">
            <div className="admin-counter-header">
              <AlertCircleIcon size={16} className="counter-icon-failed" />
              <span className="admin-counter-label">Failed</span>
            </div>
            <span className="admin-counter-number">{stats.failedCount}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
