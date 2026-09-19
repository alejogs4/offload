import React from "react";
import { NavLink, Link } from "react-router";
import type { SessionUser } from "../domain/admin-authorization-service";
import {
  ShieldCheckIcon,
  ActivityIcon,
  DatabaseIcon,
  ArrowRightIcon,
} from "~/shared/ui/icons";

interface AdminLayoutProps {
  currentUser: SessionUser;
  children: React.ReactNode;
}

export function AdminLayout({ currentUser, children }: AdminLayoutProps) {
  const displayIdentifier = currentUser.email || currentUser.id;

  return (
    <div className="admin-shell">
      {/* Admin Top Header */}
      <header className="admin-header">
        <div className="admin-header-content">
          <div className="admin-brand-section">
            <Link to="/admin" className="admin-brand-title">
              <div className="admin-brand-icon-wrap" aria-hidden="true">
                <ShieldCheckIcon size={18} />
              </div>
              <span className="admin-brand-name">Offload</span>
              <span className="admin-brand-badge">Admin</span>
            </Link>
          </div>

          <div className="admin-user-section">
            {/* MANDATORY: Text only, NO avatars or images */}
            <div className="admin-user-info">
              <span className="admin-user-label">Authenticated as</span>
              <span className="admin-user-email">{displayIdentifier}</span>
            </div>

            <div className="admin-header-divider" aria-hidden="true" />

            <Link
              to="/"
              className="admin-workspace-link"
              title="Return to user workspace"
            >
              <span>Workspace</span>
              <ArrowRightIcon size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Secondary Admin Navigation Bar */}
      <div className="admin-nav-bar">
        <div className="admin-nav-content">
          <nav className="admin-tabs" aria-label="Admin Navigation">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `admin-tab-item ${isActive ? "active" : ""}`
              }
            >
              <ActivityIcon size={16} />
              <span>Overview</span>
            </NavLink>

            <NavLink
              to="/admin/migrations"
              className={({ isActive }) =>
                `admin-tab-item ${isActive ? "active" : ""}`
              }
            >
              <DatabaseIcon size={16} />
              <span>Data Migrations</span>
            </NavLink>
          </nav>
        </div>
      </div>

      {/* Main Admin Content Plane */}
      <main className="admin-main">
        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
