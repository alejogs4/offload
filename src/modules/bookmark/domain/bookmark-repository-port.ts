import { BookmarkState } from "./bookmark-schema";

export interface BookmarkRepositoryPort {
  findById(id: string): Promise<BookmarkState | null>;
  save(bookmark: BookmarkState): Promise<void>;
  update(bookmark: BookmarkState): Promise<void>;
  markAsVisited(id: string, userId: string): Promise<BookmarkState>;
  toggleStarred(id: string, userId: string, isStarred: boolean): Promise<BookmarkState>;
  findAllByUserId(userId: string): Promise<BookmarkState[]>;
}
