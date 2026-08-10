import { BookmarkRepositoryPort } from "~/modules/bookmark/domain/bookmark-repository-port";

export interface BookmarkItemDTO {
  id: string;
  url: string;
  title: string;
  description: string;
  ogImage?: string;
  category: string;
  subcategory: string;
  status: "pending" | "visited";
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
}

export class GetFolderTreeQueryHandler {
  constructor(private repository: BookmarkRepositoryPort) {}

  async execute(userId: string): Promise<FolderTreeResultDTO> {
    const allBookmarks = await this.repository.findAllByUserId(userId);

    const pending = allBookmarks.filter((b) => b.status === "pending");
    const visited = allBookmarks
      .filter((b) => b.status === "visited")
      .map((b) => this.toDTO(b));

    // Group pending bookmarks by Category > Subcategory
    const categoryMap = new Map<string, Map<string, BookmarkItemDTO[]>>();

    for (const item of pending) {
      const dto = this.toDTO(item);
      const cat = dto.category || "Uncategorized";
      const sub = dto.subcategory || "General";

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
    };
  }

  private toDTO(b: any): BookmarkItemDTO {
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
