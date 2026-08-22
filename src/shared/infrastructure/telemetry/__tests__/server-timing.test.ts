import { describe, it, expect } from "vitest";
import {
  ServerTiming,
  serverTimingStorage,
  withServerTiming,
} from "../server-timing";

describe("ServerTiming", () => {
  it("should record explicit timing metrics and generate W3C header format", () => {
    const timing = new ServerTiming();
    timing.record("auth", 2.45, "Session check");
    timing.record("db", 35.8);

    const header = timing.toHeader();
    expect(header).toContain("auth;dur=2.45;desc=\"Session check\"");
    expect(header).toContain("db;dur=35.8");
    expect(header).toContain("total;dur=");
  });

  it("should measure async operations and record duration", async () => {
    const timing = new ServerTiming();
    const result = await timing.measure("query", async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return 42;
    }, "Database query");

    expect(result).toBe(42);
    const header = timing.toHeader();
    expect(header).toContain("query;dur=");
    expect(header).toContain('desc="Database query"');
  });

  it("should measure synchronous functions and handle exceptions cleanly", async () => {
    const timing = new ServerTiming();
    await expect(
      timing.measure("failing_op", () => {
        throw new Error("Op failed");
      })
    ).rejects.toThrow("Op failed");

    // Even if it failed, timing metric should still be recorded in finally block
    const header = timing.toHeader();
    expect(header).toContain("failing_op;dur=");
  });

  it("should run withServerTiming using AsyncLocalStorage context", async () => {
    const { result, timing } = await withServerTiming(async (t) => {
      const stored = serverTimingStorage.getStore();
      expect(stored).toBe(t);

      await t.measure("inner_task", async () => {
        return "completed";
      });

      return "success";
    });

    expect(result).toBe("success");
    expect(timing.toHeader()).toContain("inner_task;dur=");
    expect(timing.toHeader()).toContain("total;dur=");
    expect(serverTimingStorage.getStore()).toBeUndefined();
  });
});
