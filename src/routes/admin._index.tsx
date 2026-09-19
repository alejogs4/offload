import { useLoaderData, data } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { getAdminSystemStatsQuery } from "~/shared/infrastructure/container";
import { withServerTiming } from "~/shared/infrastructure/telemetry/server-timing";
import { SystemHealthCard } from "~/modules/admin/ui/system-health-card";

export async function loader({ request }: LoaderFunctionArgs) {
  const { result, timing } = await withServerTiming(async (t) => {
    const stats = await t.measure(
      "db-admin-stats",
      () => getAdminSystemStatsQuery.execute(),
      "Query system telemetry and bookmark counts"
    );
    return stats;
  });

  return data(
    { stats: result },
    {
      headers: {
        "Server-Timing": timing.toHeader(),
      },
    }
  );
}

export default function AdminOverviewRoute() {
  const { stats } = useLoaderData<typeof loader>();
  return <SystemHealthCard stats={stats} />;
}
