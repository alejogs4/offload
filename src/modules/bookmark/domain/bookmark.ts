import { BaseEntity } from "~/shared/domain/base-entity";
import {
  BookmarkState,
  BookmarkStateSchema,
  BookmarkStatus,
  DefaultTaxonomy,
} from "./bookmark-schema";
import { BookmarkEvent } from "./bookmark-events";

export interface CreateBookmarkProps {
  id?: string;
  userId: string;
  url: string;
  title: string;
  description: string;
  ogImage?: string;
  category?: string;
  subcategory?: string;
}

export interface CreateProcessingProps {
  id?: string;
  userId: string;
  url: string;
  title?: string;
}

export interface CompleteProcessingProps {
  title: string;
  description?: string;
  ogImage?: string;
  category?: string;
  subcategory?: string;
}

export class Bookmark extends BaseEntity<BookmarkState, BookmarkEvent> {
  /**
   * Enforces creation invariants and generates the initial BookmarkCreated event + evolved state.
   */
  public create(props: CreateBookmarkProps): { event: BookmarkEvent; evolved: BookmarkState } {
    const now = new Date();
    const state = BookmarkStateSchema.parse({
      id: props.id ?? crypto.randomUUID(),
      userId: props.userId,
      url: props.url,
      title: props.title,
      description: props.description,
      ogImage: props.ogImage,
      category: props.category ?? DefaultTaxonomy.CATEGORY,
      subcategory: props.subcategory ?? DefaultTaxonomy.SUBCATEGORY,
      status: BookmarkStatus.PENDING,
      createdAt: now,
      updatedAt: now,
    });

    const event: BookmarkEvent = {
      type: "BookmarkCreated",
      payload: state,
    };

    return { event, evolved: this.evolve(null, event) };
  }

  /**
   * Creates an initial lightweight bookmark in PROCESSING state for fast ingestion (<20ms).
   */
  public createProcessing(
    props: CreateProcessingProps
  ): { event: BookmarkEvent; evolved: BookmarkState } {
    const now = new Date();
    let defaultTitle = props.title?.trim();
    if (!defaultTitle) {
      try {
        defaultTitle = new URL(props.url).hostname;
      } catch {
        defaultTitle = props.url;
      }
    }

    const state = BookmarkStateSchema.parse({
      id: props.id ?? crypto.randomUUID(),
      userId: props.userId,
      url: props.url,
      title: defaultTitle,
      description: "",
      ogImage: undefined,
      category: DefaultTaxonomy.CATEGORY,
      subcategory: DefaultTaxonomy.SUBCATEGORY,
      status: BookmarkStatus.PROCESSING,
      createdAt: now,
      updatedAt: now,
    });

    const event: BookmarkEvent = {
      type: "BookmarkProcessingStarted",
      payload: state,
    };

    return { event, evolved: this.evolve(null, event) };
  }

  /**
   * Completes background processing, transitioning bookmark to PENDING with enriched metadata.
   */
  public completeProcessing(
    state: BookmarkState,
    props: CompleteProcessingProps
  ): { event: BookmarkEvent; evolved: BookmarkState } {
    if (state.status === BookmarkStatus.VISITED) {
      throw new Error("InvalidInvariant: Cannot complete processing for a visited bookmark");
    }

    const trimmedTitle = props.title?.trim() || state.title;
    const trimmedDesc = props.description !== undefined ? props.description : state.description;
    const trimmedCat = props.category?.trim() || state.category || DefaultTaxonomy.CATEGORY;
    const trimmedSub = props.subcategory?.trim() || state.subcategory || DefaultTaxonomy.SUBCATEGORY;

    const updatedState = BookmarkStateSchema.parse({
      ...state,
      title: trimmedTitle,
      description: trimmedDesc,
      ogImage: props.ogImage ?? state.ogImage,
      category: trimmedCat,
      subcategory: trimmedSub,
      status: BookmarkStatus.PENDING,
      updatedAt: new Date(),
    });

    const event: BookmarkEvent = {
      type: "BookmarkProcessingCompleted",
      payload: updatedState,
    };

    return { event, evolved: this.evolve(state, event) };
  }

  /**
   * Enforces visit invariants: user authorization and unvisited status.
   */
  public markAsVisited(
    state: BookmarkState,
    userId: string
  ): { event: BookmarkEvent; evolved: BookmarkState } {
    if (state.userId !== userId) {
      throw new Error("Unauthorized: Cannot modify bookmark belonging to another user");
    }

    if (state.status === BookmarkStatus.VISITED) {
      throw new Error("InvalidInvariant: Bookmark is already marked as visited");
    }

    const event: BookmarkEvent = {
      type: "BookmarkVisited",
      payload: {
        id: state.id,
        userId,
        visitedAt: new Date(),
      },
    };

    return { event, evolved: this.evolve(state, event) };
  }

  /**
   * Enforces categorization invariants.
   */
  public categorize(
    state: BookmarkState,
    category: string,
    subcategory: string
  ): { event: BookmarkEvent; evolved: BookmarkState } {
    const trimmedCategory = category.trim();
    const trimmedSubcategory = subcategory.trim();

    if (!trimmedCategory) {
      throw new Error("InvalidInvariant: Category cannot be empty");
    }

    const event: BookmarkEvent = {
      type: "BookmarkCategorized",
      payload: {
        id: state.id,
        category: trimmedCategory,
        subcategory: trimmedSubcategory || DefaultTaxonomy.SUBCATEGORY,
        updatedAt: new Date(),
      },
    };

    return { event, evolved: this.evolve(state, event) };
  }

  /**
   * Pure state reducer implementing sum-type pattern matching.
   */
  protected evolve(state: BookmarkState | null, event: BookmarkEvent): BookmarkState {
    switch (event.type) {
      case "BookmarkCreated":
      case "BookmarkProcessingStarted":
        return event.payload;

      case "BookmarkProcessingCompleted":
      case "BookmarkProcessingFailed": {
        if (!state) {
          throw new Error("Cannot evolve non-existent bookmark state");
        }
        return event.payload;
      }

      case "BookmarkVisited": {
        if (!state) {
          throw new Error("Cannot evolve non-existent bookmark state");
        }
        return {
          ...state,
          status: BookmarkStatus.VISITED,
          updatedAt: event.payload.visitedAt,
        };
      }

      case "BookmarkCategorized": {
        if (!state) {
          throw new Error("Cannot evolve non-existent bookmark state");
        }
        return {
          ...state,
          category: event.payload.category,
          subcategory: event.payload.subcategory,
          updatedAt: event.payload.updatedAt,
        };
      }
    }
  }
}
