-- CreateEnum
CREATE TYPE "PotContributionStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "group_pots" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "bizumPhone" TEXT NOT NULL,
    "bizumName" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_pots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pot_contributions" (
    "id" TEXT NOT NULL,
    "potId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PotContributionStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pot_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "group_pots_groupId_key" ON "group_pots"("groupId");

-- CreateIndex
CREATE INDEX "pot_contributions_groupId_idx" ON "pot_contributions"("groupId");

-- CreateIndex
CREATE INDEX "pot_contributions_userId_idx" ON "pot_contributions"("userId");

-- AddForeignKey
ALTER TABLE "group_pots" ADD CONSTRAINT "group_pots_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pot_contributions" ADD CONSTRAINT "pot_contributions_potId_fkey" FOREIGN KEY ("potId") REFERENCES "group_pots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pot_contributions" ADD CONSTRAINT "pot_contributions_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pot_contributions" ADD CONSTRAINT "pot_contributions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
