-- CreateEnum
CREATE TYPE "BgmGenre" AS ENUM ('INST', 'K_POP', 'J_POP', 'POP', '탑골가요', 'ETC');

-- CreateTable
CREATE TABLE "BgmTrack" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "videoUrl" TEXT NOT NULL,
    "genre" "BgmGenre" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "duration" INTEGER,
    "thumbnail" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BgmTrack_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BgmTrack_genre_idx" ON "BgmTrack"("genre");

-- CreateIndex
CREATE INDEX "BgmTrack_createdAt_idx" ON "BgmTrack"("createdAt");

-- CreateIndex
CREATE INDEX "BgmTrack_order_idx" ON "BgmTrack"("order");
