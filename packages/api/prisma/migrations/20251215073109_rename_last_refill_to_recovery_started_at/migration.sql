/*
  Warnings:

  - You are about to drop the column `last_refill` on the `hearts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "hearts" DROP COLUMN "last_refill",
ADD COLUMN     "recovery_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
