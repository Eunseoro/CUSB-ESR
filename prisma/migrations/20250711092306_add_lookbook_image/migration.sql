-- CreateTable
CREATE TABLE "LookBookImage" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "uploader" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LookBookImage_pkey" PRIMARY KEY ("id")
);
