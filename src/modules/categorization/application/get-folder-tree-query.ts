import { BookmarkRepositoryPort } from "~/modules/bookmark/domain/bookmark-repository-port";
import {
  BookmarkState,
  BookmarkStatus,
  DefaultTaxonomy,
} from "~/modules/bookmark/domain/bookmark-schema";

export interface BookmarkItemDTO {
  id: string;
  url: string;
  title: string;
  description: string;
  ogImage?: string;
  category: string;
  subcategory: string;
  status: BookmarkStatus;
  createdAt: string;
}

export interface SubcategoryGroupDTO {
  name: string;
  bookmarks: BookmarkItemDTO[];
}

export interface CategoryGroupDTO {
  name: string;
  subcategories: SubcategoryGroupDTO[];
}

export interface FolderTreeResultDTO {
  pendingFolders: CategoryGroupDTO[];
  visitedBookmarks: BookmarkItemDTO[];
  processingBookmarks: BookmarkItemDTO[];
}

export class GetFolderTreeQueryHandler {
  constructor(private repository: BookmarkRepositoryPort) {}

  async execute(userId: string): Promise<FolderTreeResultDTO> {
    const allBookmarks = await this.repository.findAllByUserId(userId);

    const processing = allBookmarks
      .filter((b) => b.status === BookmarkStatus.PROCESSING)
      .map((b) => this.toDTO(b));
    const pending = allBookmarks.filter((b) => b.status === BookmarkStatus.PENDING);
    const visited = allBookmarks
      .filter((b) => b.status === BookmarkStatus.VISITED)
      .map((b) => this.toDTO(b));

    // Group pending bookmarks by Category > Subcategory
    const categoryMap = new Map<string, Map<string, BookmarkItemDTO[]>>();

    for (const item of pending) {
      const dto = this.toDTO(item);
      const cat = dto.category || DefaultTaxonomy.CATEGORY;
      const sub = dto.subcategory || DefaultTaxonomy.SUBCATEGORY;

      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, new Map());
      }
      const subMap = categoryMap.get(cat)!;

      if (!subMap.has(sub)) {
        subMap.set(sub, []);
      }
      subMap.get(sub)!.push(dto);
    }

    const pendingFolders: CategoryGroupDTO[] = Array.from(categoryMap.entries()).map(([catName, subMap]) => ({
      name: catName,
      subcategories: Array.from(subMap.entries()).map(([subName, items]) => ({
        name: subName,
        bookmarks: items,
      })),
    }));

    return {
      pendingFolders,
      visitedBookmarks: visited,
      processingBookmarks: processing,
    };
  }

  private toDTO(b: BookmarkState): BookmarkItemDTO {
    return {
      id: b.id,
      url: b.url,
      title: b.title,
      description: b.description,
      ogImage: b.ogImage,
      category: b.category,
      subcategory: b.subcategory,
      status: b.status,
      createdAt: b.createdAt.toISOString(),
    };
  }
}
