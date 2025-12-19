-- CreateTable
CREATE TABLE "lesson_records" (
    "id" TEXT NOT NULL,
    "learning_record_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "correct_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lesson_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_problem_attempts" (
    "id" TEXT NOT NULL,
    "lesson_record_id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "problem_index" INTEGER NOT NULL,
    "is_correct" BOOLEAN NOT NULL,
    "used_hint" BOOLEAN NOT NULL DEFAULT false,
    "used_solution" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "lesson_problem_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lesson_records_learning_record_id_key" ON "lesson_records"("learning_record_id");

-- CreateIndex
CREATE INDEX "lesson_records_lesson_id_idx" ON "lesson_records"("lesson_id");

-- CreateIndex
CREATE INDEX "lesson_problem_attempts_lesson_record_id_idx" ON "lesson_problem_attempts"("lesson_record_id");

-- AddForeignKey
ALTER TABLE "lesson_records" ADD CONSTRAINT "lesson_records_learning_record_id_fkey" FOREIGN KEY ("learning_record_id") REFERENCES "learning_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_problem_attempts" ADD CONSTRAINT "lesson_problem_attempts_lesson_record_id_fkey" FOREIGN KEY ("lesson_record_id") REFERENCES "lesson_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
