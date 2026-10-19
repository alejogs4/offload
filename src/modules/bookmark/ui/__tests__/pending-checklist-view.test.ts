import { describe, it, expect, vi, beforeEach } from "vitest";
import * as ReactRouter from "react-router";
import {
  useInFlightVisitedIds,
  useInFlightStarredOverrides,
  buildOptimisticVisibleFolders,
} from "../pending-checklist-view";
import { BookmarkStatus } from "~/modules/bookmark/domain/bookmark-schema";
import type { CategoryGroupDTO } from "~/modules/categorization/application/get-folder-tree-query";

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof ReactRouter>("react-router");
  return {
    ...actual,
    useFetchers: vi.fn(),
    useFetcher: vi.fn(),
  };
});

describe("useInFlightVisitedIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should extract bookmark IDs from in-flight mark_visited fetchers", () => {
    const mockFormData1 = new FormData();
    mockFormData1.set("intent", "mark_visited");
    mockFormData1.set("bookmarkId", "id-1");

    const mockFormData2 = new FormData();
    mockFormData2.set("intent", "mark_visited");
    mockFormData2.set("bookmarkId", "id-2");

    const mockFormDataOther = new FormData();
    mockFormDataOther.set("intent", "create");
    mockFormDataOther.set("url", "https://example.com");

    vi.mocked(ReactRouter.useFetchers).mockReturnValue([
      {
        state: "submitting",
        formData: mockFormData1,
        data: undefined,
        formAction: "/",
        formMethod: "POST",
        formEncType: "application/x-www-form-urlencoded",
        text: undefined,
        json: undefined,
        key: "mark-1",
        submit: vi.fn(),
        load: vi.fn(),
        Form: () => null,
      } as any,
      {
        state: "submitting",
        formData: mockFormData2,
        data: undefined,
        formAction: "/",
        formMethod: "POST",
        formEncType: "application/x-www-form-urlencoded",
        text: undefined,
        json: undefined,
        key: "mark-2",
        submit: vi.fn(),
        load: vi.fn(),
        Form: () => null,
      } as any,
      {
        state: "submitting",
        formData: mockFormDataOther,
        data: undefined,
        formAction: "/",
        formMethod: "POST",
        formEncType: "application/x-www-form-urlencoded",
        text: undefined,
        json: undefined,
        key: "create-1",
        submit: vi.fn(),
        load: vi.fn(),
        Form: () => null,
      } as any,
      {
        state: "idle",
        formData: undefined,
        data: { success: true },
        formAction: undefined,
        formMethod: undefined,
        formEncType: undefined,
        text: undefined,
        json: undefined,
        key: "idle-1",
        submit: vi.fn(),
        load: vi.fn(),
        Form: () => null,
      } as any,
    ]);

    const inFlightIds = useInFlightVisitedIds();

    expect(inFlightIds.size).toBe(2);
    expect(inFlightIds.has("id-1")).toBe(true);
    expect(inFlightIds.has("id-2")).toBe(true);
    expect(inFlightIds.has("other-id")).toBe(false);
  });

  it("should return an empty set when no fetchers are submitting mark_visited", () => {
    vi.mocked(ReactRouter.useFetchers).mockReturnValue([]);
    const inFlightIds = useInFlightVisitedIds();
    expect(inFlightIds.size).toBe(0);
  });

  it("should return empty set when fetcher completes and formData is cleared (automatic rollback on failure)", () => {
    vi.mocked(ReactRouter.useFetchers).mockReturnValue([
      {
        state: "idle",
        formData: undefined,
        data: { error: "Failed to mark as visited" },
      } as any,
    ]);

    const inFlightIds = useInFlightVisitedIds();
    expect(inFlightIds.size).toBe(0);
  });
});

describe("useInFlightStarredOverrides & buildOptimisticVisibleFolders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should extract optimistic star overrides from active toggle_starred fetchers", () => {
    const formStar = new FormData();
    formStar.set("intent", "toggle_starred");
    formStar.set("bookmarkId", "b-1");
    formStar.set("isStarred", "true");

    const formUnstar = new FormData();
    formUnstar.set("intent", "toggle_starred");
    formUnstar.set("bookmarkId", "b-2");
    formUnstar.set("isStarred", "false");

    vi.mocked(ReactRouter.useFetchers).mockReturnValue([
      { state: "submitting", formData: formStar } as any,
      { state: "submitting", formData: formUnstar } as any,
    ]);

    const overrides = useInFlightStarredOverrides();
    expect(overrides.get("b-1")).toBe(true);
    expect(overrides.get("b-2")).toBe(false);
  });

  it("should optimistically pin newly starred bookmark to Starred category at index 0 and restore unstarred item to its original category", () => {
    const initialFolders: CategoryGroupDTO[] = [
      {
        name: "Starred",
        isFlat: true,
        subcategories: [
          {
            name: "",
            bookmarks: [
              {
                id: "b-already-starred",
                title: "Already Starred",
                description: "",
                url: "https://example.com/1",
                category: "Design",
                subcategory: "Systems",
                status: BookmarkStatus.PENDING,
                isStarred: true,
                createdAt: "2026-01-01",
              },
            ],
          },
        ],
      },
      {
        name: "Tech",
        subcategories: [
          {
            name: "TypeScript",
            bookmarks: [
              {
                id: "b-to-star",
                title: "TS 5.8",
                description: "",
                url: "https://example.com/2",
                category: "Tech",
                subcategory: "TypeScript",
                status: BookmarkStatus.PENDING,
                isStarred: false,
                createdAt: "2026-01-01",
              },
            ],
          },
        ],
      },
    ];

    // Optimistically unstar "b-already-starred" and star "b-to-star"
    const overrides = new Map<string, boolean>([
      ["b-already-starred", false],
      ["b-to-star", true],
    ]);

    const visible = buildOptimisticVisibleFolders(initialFolders, new Set(), overrides);

    expect(visible).toHaveLength(2);
    expect(visible[0].name).toBe("Starred");
    expect(visible[0].isFlat).toBe(true);
    expect(visible[0].subcategories[0].bookmarks.map((b) => b.id)).toEqual(["b-to-star"]);

    expect(visible[1].name).toBe("Design");
    expect(visible[1].subcategories[0].name).toBe("Systems");
    expect(visible[1].subcategories[0].bookmarks.map((b) => b.id)).toEqual(["b-already-starred"]);
  });
});
