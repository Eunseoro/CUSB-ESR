/*
  Warnings:

  - The values [JPOP,OTHER] on the enum `Category` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `userId` on the `Song` table. All the data in the column will be lost.
  - You are about to drop the column `viewCount` on the `Song` table. All the data in the column will be lost.
  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VerificationToken` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Category_new" AS ENUM ('KPOP', 'POP', 'MISSION', 'NEWSONG');
ALTER TABLE "Song" ALTER COLUMN "category" TYPE "Category_new" USING ("category"::text::"Category_new");
ALTER TYPE "Category" RENAME TO "Category_old";
ALTER TYPE "Category_new" RENAME TO "Category";
DROP TYPE "Category_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "Song" DROP CONSTRAINT "Song_userId_fkey";

-- DropIndex
DROP INDEX "Song_viewCount_idx";

-- AlterTable
ALTER TABLE "Song" DROP COLUMN "userId",
DROP COLUMN "viewCount",
ADD COLUMN     "isFirstVerseOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isHighDifficulty" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLoopStation" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "VerificationToken";

-- CreateTable
CREATE TABLE "SongLike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongLike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SongLike_userId_idx" ON "SongLike"("userId");

-- CreateIndex
CREATE INDEX "SongLike_songId_idx" ON "SongLike"("songId");

-- CreateIndex
CREATE UNIQUE INDEX "SongLike_userId_songId_key" ON "SongLike"("userId", "songId");

-- AddForeignKey
ALTER TABLE "SongLike" ADD CONSTRAINT "SongLike_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
