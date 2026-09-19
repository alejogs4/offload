import { useLoaderData, useOutletContext, data } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import {
  getLegacyMigrationStatusQuery,
  migrateLegacyBookmarksHandler,
} from "~/shared/infrastructure/container";
import { withServerTiming } from "~/shared/infrastructure/telemetry/server-timing";
import { toUserErrorMessage } from "~/shared/domain/errors";
import type { SessionUser } from "~/modules/admin/domain/admin-authorization-service";
import { MigrationRunnerPanel } from "~/modules/admin/ui/migration-runner-panel";

export async function loader({ request }: LoaderFunctionArgs) {
  const { result, timing } = await withServerTiming(async (t) => {
    const status = await t.measure(
      "db-legacy-status",
      () => getLegacyMigrationStatusQuery.execute("local-user-1"),
      "Inspect unassigned legacy records"
    );
    return status;
  });

  return data(
    { status: result },
    {
      headers: {
        "Server-Timing": timing.toHeader(),
      },
    }
  );
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { result, timing } = await withServerTiming(async (t) => {
      const formData = await request.formData();
      const intent = formData.get("intent")?.toString();

      if (intent === "migrate_legacy") {
        const targetUserId =
          formData.get("targetUserId")?.toString() || "admin-user";

        const execution = await t.measure(
          "db-migrate-legacy",
          () =>
            migrateLegacyBookmarksHandler.execute({
              sourceUserId: "local-user-1",
              targetUserId,
            }),
          "Atomically reassign legacy bookmarks"
        );

        return {
          success: true as const,
          migratedCount: execution.migratedCount,
          executedAt: execution.executedAt.toISOString(),
        };
      }

      return { error: "Unknown action intent" };
    });

    return data(result, {
      headers: {
        "Server-Timing": timing.toHeader(),
      },
    });
  } catch (err: unknown) {
    console.error("[Admin Migration Action Error]:", err);
    return data(
      { error: toUserErrorMessage(err, "Failed to execute migration") },
      { status: 500 }
    );
  }
}

export default function AdminMigrationsRoute() {
  const { status } = useLoaderData<typeof loader>();
  const { user } = useOutletContext<{ user: SessionUser }>();

  return <MigrationRunnerPanel initialStatus={status} targetUser={user} />;
}
