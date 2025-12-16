-- CreateTable
CREATE TABLE "tsumeshogis" (
    "id" TEXT NOT NULL,
    "sfen" TEXT NOT NULL,
    "move_count" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tsumeshogis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tsumeshogis_move_count_status_idx" ON "tsumeshogis"("move_count", "status");
