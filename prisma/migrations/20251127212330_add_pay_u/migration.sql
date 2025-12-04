/*
  Warnings:

  - You are about to drop the column `wompi_transaction_id` on the `payments` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProductSize" ADD VALUE 'extra_small';
ALTER TYPE "ProductSize" ADD VALUE 'extra_large';

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "wompi_transaction_id",
ADD COLUMN     "payu_transaction_id" TEXT;
