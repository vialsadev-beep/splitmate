-- AlterTable: add receiptItems column (nullable JSON) to expenses
ALTER TABLE "expenses" ADD COLUMN "receiptItems" JSONB;
