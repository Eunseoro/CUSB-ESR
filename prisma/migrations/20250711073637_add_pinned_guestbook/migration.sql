-- CreateTable
CREATE TABLE "PinnedGuestbook" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "guestbookId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PinnedGuestbook_pkey" PRIMARY KEY ("id")
);
