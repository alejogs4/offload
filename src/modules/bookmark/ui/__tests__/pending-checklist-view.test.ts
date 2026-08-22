import { describe, it, expect, vi, beforeEach } from "vitest";
import * as ReactRouter from "react-router";
import { useInFlightVisitedIds } from "../pending-checklist-view";

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
