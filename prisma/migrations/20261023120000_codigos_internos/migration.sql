ALTER TABLE "Customer" ADD COLUMN "code" TEXT;
ALTER TABLE "Supplier" ADD COLUMN "code" TEXT;

CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");
