-- AlterTable
ALTER TABLE "catalog_items" ADD COLUMN "image_updated_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "catalog_images" (
    "catalog_item_id" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_images_pkey" PRIMARY KEY ("catalog_item_id")
);

-- AddForeignKey
ALTER TABLE "catalog_images" ADD CONSTRAINT "catalog_images_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "catalog_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
