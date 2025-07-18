/*
  Warnings:

  - You are about to drop the `LookBookImage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "LookBookImage";

-- CreateTable
CREATE TABLE "LookBookPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "uploader" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LookBookPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LookBookPostImage" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LookBookPostImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LookBookPostImage" ADD CONSTRAINT "LookBookPostImage_postId_fkey" FOREIGN KEY ("postId") REFERENCES "LookBookPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
