import { BookmarkRepositoryPort } from "../domain/bookmark-repository-port";
import { BookmarkState } from "../domain/bookmark-schema";
import { serverTimingStorage } from "~/shared/infrastructure/telemetry/server-timing";

export class TelemetryBookmarkRepositoryDecorator implements BookmarkRepositoryPort {
  constructor(private readonly inner: BookmarkRepositoryPort) {}

  private async timed<T>(opName: string, fn: () => Promise<T>): Promise<T> {
    const timing = serverTimingStorage.getStore();
    if (!timing) return fn();
    return timing.measure(`db_${opName}`, fn, `Turso SQL: ${opName}`);
  }

  findById(id: string): Promise<BookmarkState | null> {
    return this.timed("findById", () => this.inner.findById(id));
  }

  save(bookmark: BookmarkState): Promise<void> {
    return this.timed("save", () => this.inner.save(bookmark));
  }

  update(bookmark: BookmarkState): Promise<void> {
    return this.timed("update", () => this.inner.update(bookmark));
  }

  markAsVisited(id: string, userId: string): Promise<BookmarkState> {
    return this.timed("markAsVisited", () => this.inner.markAsVisited(id, userId));
  }

  findAllByUserId(userId: string): Promise<BookmarkState[]> {
    return this.timed("findAllByUserId", () => this.inner.findAllByUserId(userId));
  }
}
