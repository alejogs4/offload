import { z } from "zod";

export const BookmarkStatus = {
  PENDING: "pending",
  VISITED: "visited",
} as const;

export type BookmarkStatus = (typeof BookmarkStatus)[keyof typeof BookmarkStatus];

export const BookmarkStatusSchema = z.enum([
  BookmarkStatus.PENDING,
  BookmarkStatus.VISITED,
]);
