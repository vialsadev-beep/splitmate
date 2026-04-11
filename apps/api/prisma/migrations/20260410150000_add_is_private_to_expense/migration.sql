-- AlterTable: add isPrivate column to expenses
ALTER TABLE "expenses" ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false;
