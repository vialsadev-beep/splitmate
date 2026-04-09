-- AlterTable groups: add debtLimit and avatarUrl
ALTER TABLE "groups" ADD COLUMN "debtLimit" DECIMAL(12,2);
ALTER TABLE "groups" ADD COLUMN "avatarUrl" TEXT;

-- AlterTable expenses: add receiptUrl
ALTER TABLE "expenses" ADD COLUMN "receiptUrl" TEXT;
