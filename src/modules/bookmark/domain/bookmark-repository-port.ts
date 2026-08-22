import { BookmarkState } from "./bookmark-schema";

export interface BookmarkRepositoryPort {
  findById(id: string): Promise<BookmarkState | null>;
  save(bookmark: BookmarkState): Promise<void>;
  update(bookmark: BookmarkState): Promise<void>;
  markAsVisited(id: string, userId: string): Promise<BookmarkState>;
  findAllByUserId(userId: string): Promise<BookmarkState[]>;
}
