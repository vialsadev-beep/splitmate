-- Reemplazar bizumPhone/bizumName por paypalMe
ALTER TABLE "group_pots" ADD COLUMN "paypalMe" TEXT;
UPDATE "group_pots" SET "paypalMe" = "bizumPhone";
ALTER TABLE "group_pots" ALTER COLUMN "paypalMe" SET NOT NULL;
ALTER TABLE "group_pots" DROP COLUMN "bizumPhone";
ALTER TABLE "group_pots" DROP COLUMN IF EXISTS "bizumName";
