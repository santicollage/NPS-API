/*
  Warnings:

  - A unique constraint covering the columns `[order_token]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "guest_id" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "address_line" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "customer_document" TEXT,
ADD COLUMN     "customer_email" TEXT,
ADD COLUMN     "customer_name" TEXT,
ADD COLUMN     "customer_phone" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "guest_id" TEXT,
ADD COLUMN     "order_token" TEXT,
ADD COLUMN     "postal_code" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "guest_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_token_key" ON "orders"("order_token");
