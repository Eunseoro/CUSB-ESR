-- Add isMr field to Song table
ALTER TABLE "Song" ADD COLUMN "isMr" BOOLEAN NOT NULL DEFAULT false; 