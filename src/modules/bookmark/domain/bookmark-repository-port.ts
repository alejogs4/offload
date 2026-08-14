import { BookmarkState } from "./bookmark-schema";

export interface BookmarkRepositoryPort {
  findById(id: string): Promise<BookmarkState | null>;
  save(bookmark: BookmarkState): Promise<void>;
  update(bookmark: BookmarkState): Promise<void>;
  findAllByUserId(userId: string): Promise<BookmarkState[]>;
}
