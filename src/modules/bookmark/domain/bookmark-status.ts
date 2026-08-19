import { z } from "zod";

export const BookmarkStatus = {
  PROCESSING: "processing",
  PENDING: "pending",
  VISITED: "visited",
  FAILED: "failed",
} as const;

export type BookmarkStatus = (typeof BookmarkStatus)[keyof typeof BookmarkStatus];

export const BookmarkStatusSchema = z.enum([
  BookmarkStatus.PROCESSING,
  BookmarkStatus.PENDING,
  BookmarkStatus.VISITED,
  BookmarkStatus.FAILED,
]);
