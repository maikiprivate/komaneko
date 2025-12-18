-- CreateTable
CREATE TABLE "learning_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_date" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tsumeshogi_records" (
    "id" TEXT NOT NULL,
    "learning_record_id" TEXT NOT NULL,
    "tsumeshogi_id" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tsumeshogi_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "learning_records_user_id_completed_date_idx" ON "learning_records"("user_id", "completed_date");

-- CreateIndex
CREATE INDEX "learning_records_user_id_is_completed_idx" ON "learning_records"("user_id", "is_completed");

-- CreateIndex
CREATE UNIQUE INDEX "tsumeshogi_records_learning_record_id_key" ON "tsumeshogi_records"("learning_record_id");

-- CreateIndex
CREATE INDEX "tsumeshogi_records_tsumeshogi_id_idx" ON "tsumeshogi_records"("tsumeshogi_id");

-- AddForeignKey
ALTER TABLE "learning_records" ADD CONSTRAINT "learning_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tsumeshogi_records" ADD CONSTRAINT "tsumeshogi_records_learning_record_id_fkey" FOREIGN KEY ("learning_record_id") REFERENCES "learning_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
