import { db } from "../client";
import { user } from "../schema";
import { eq } from "drizzle-orm";

export const LOCAL_USER_ID = "local-user-1";

export async function backfillLocalUser() {
  try {
    const existingUser = await db
      .select()
      .from(user)
      .where(eq(user.id, LOCAL_USER_ID))
      .get();

    if (!existingUser) {
      const now = new Date();
      await db.insert(user).values({
        id: LOCAL_USER_ID,
        name: "Local User",
        email: "local@offload.internal",
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`[Migration] Seeded placeholder user for '${LOCAL_USER_ID}'`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("[Migration] Error during backfillLocalUser:", error);
    return { success: false, error: error?.message || "Unknown error" };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  backfillLocalUser()
    .then((res) => {
      console.log("[Migration] Backfill finished:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Migration] Backfill failed:", err);
      process.exit(1);
    });
}
