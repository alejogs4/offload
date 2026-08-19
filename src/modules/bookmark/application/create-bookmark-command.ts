import { z } from "zod";
import { Bookmark } from "../domain/bookmark";
import {
  BookmarkState,
  UrlSchema,
  UserIdSchema,
} from "../domain/bookmark-schema";
import { BookmarkCreatedEvent } from "../domain/bookmark-events";
import { BookmarkRepositoryPort } from "../domain/bookmark-repository-port";
import { EventBusPort } from "~/shared/domain/domain-event";
import { BookmarkEnrichmentService } from "../domain/services/bookmark-enrichment-service";
import { runBackground } from "~/shared/infrastructure/async/wait-until";

export const CreateBookmarkInputSchema = z.object({
  userId: UserIdSchema,
  url: UrlSchema,
});

export type CreateBookmarkInput = z.infer<typeof CreateBookmarkInputSchema>;

export class CreateBookmarkCommandHandler {
  private bookmarkAggregate = new Bookmark();

  constructor(
    private readonly repository: BookmarkRepositoryPort,
    private readonly enrichmentService: BookmarkEnrichmentService,
    private readonly eventBus: EventBusPort
  ) {}

  async execute(rawInput: CreateBookmarkInput): Promise<BookmarkState> {
    const input = CreateBookmarkInputSchema.parse(rawInput);

    let defaultTitle = "";
    try {
      defaultTitle = new URL(input.url).hostname;
    } catch {
      defaultTitle = input.url;
    }

    const { evolved } = this.bookmarkAggregate.createProcessing({
      userId: input.userId,
      url: input.url,
      title: defaultTitle,
    });

    await this.repository.save(evolved);

    await this.eventBus.publish(
      new BookmarkCreatedEvent({
        bookmarkId: evolved.id,
        userId: evolved.userId,
        url: evolved.url,
        title: evolved.title,
        description: evolved.description,
      })
    );

    runBackground(this.enrichmentService.enrich(evolved));

    return evolved;
  }
}
