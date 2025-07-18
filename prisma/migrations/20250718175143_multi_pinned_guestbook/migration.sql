/*
  Warnings:

  - A unique constraint covering the columns `[guestbookId]` on the table `PinnedGuestbook` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
CREATE SEQUENCE pinnedguestbook_id_seq;
ALTER TABLE "PinnedGuestbook" ALTER COLUMN "id" SET DEFAULT nextval('pinnedguestbook_id_seq');
ALTER SEQUENCE pinnedguestbook_id_seq OWNED BY "PinnedGuestbook"."id";

-- CreateIndex
CREATE UNIQUE INDEX "PinnedGuestbook_guestbookId_key" ON "PinnedGuestbook"("guestbookId");
