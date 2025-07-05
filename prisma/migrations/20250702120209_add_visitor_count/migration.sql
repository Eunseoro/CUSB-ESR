-- CreateTable
CREATE TABLE "VisitorCount" (
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VisitorCount_pkey" PRIMARY KEY ("date")
);
