import { AsyncLocalStorage } from "node:async_hooks";

export interface TimingEntry {
  name: string;
  duration: number;
  description?: string;
}

export class ServerTiming {
  private metrics = new Map<string, TimingEntry>();
  private startTime = performance.now();

  record(name: string, duration: number, description?: string): void {
    this.metrics.set(name, { name, duration: Number(duration.toFixed(2)), description });
  }

  async measure<T>(name: string, fn: () => Promise<T> | T, description?: string): Promise<T> {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      this.record(name, performance.now() - start, description);
    }
  }

  toHeader(): string {
    const totalDuration = Number((performance.now() - this.startTime).toFixed(2));
    const entries: string[] = [];

    for (const metric of this.metrics.values()) {
      let entry = `${metric.name};dur=${metric.duration}`;
      if (metric.description) {
        entry += `;desc="${metric.description.replace(/"/g, "'")}"`;
      }
      entries.push(entry);
    }

    entries.push(`total;dur=${totalDuration}`);
    return entries.join(", ");
  }
}

export const serverTimingStorage = new AsyncLocalStorage<ServerTiming>();

export async function withServerTiming<T>(
  fn: (timing: ServerTiming) => Promise<T>
): Promise<{ result: T; timing: ServerTiming }> {
  const timing = new ServerTiming();
  const result = await serverTimingStorage.run(timing, () => fn(timing));
  return { result, timing };
}
