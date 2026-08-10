import { Bookmark } from "./bookmark";

export interface BookmarkRepositoryPort {
  findById(id: string): Promise<Bookmark | null>;
  save(bookmark: Bookmark): Promise<void>;
  update(bookmark: Bookmark): Promise<void>;
  findAllByUserId(userId: string): Promise<Bookmark[]>;
}
