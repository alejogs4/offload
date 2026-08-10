import { BaseEntity } from "~/shared/domain/base-entity";

export type BookmarkStatus = "pending" | "visited";

export interface BookmarkProps {
  id: string;
  userId: string;
  url: string;
  title: string;
  description: string;
  ogImage?: string;
  category: string;
  subcategory: string;
  status: BookmarkStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Bookmark extends BaseEntity<string> {
  private props: BookmarkProps;

  constructor(props: BookmarkProps) {
    super(props.id);
    this.props = props;
  }

  get userId(): string {
    return this.props.userId;
  }

  get url(): string {
    return this.props.url;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
  }

  get ogImage(): string | undefined {
    return this.props.ogImage;
  }

  get category(): string {
    return this.props.category;
  }

  get subcategory(): string {
    return this.props.subcategory;
  }

  get status(): BookmarkStatus {
    return this.props.status;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  public categorize(category: string, subcategory: string): void {
    this.props.category = category;
    this.props.subcategory = subcategory;
    this.props.updatedAt = new Date();
  }

  public markAsVisited(): void {
    this.props.status = "visited";
    this.props.updatedAt = new Date();
  }

  public toJSON(): BookmarkProps {
    return { ...this.props };
  }
}
