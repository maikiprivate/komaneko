-- AddProblemNumber migration
-- 1. Add nullable column
ALTER TABLE "tsumeshogis" ADD COLUMN "problem_number" INTEGER;

-- 2. Update existing data with sequential problem numbers per move_count
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY move_count ORDER BY created_at) as num
  FROM "tsumeshogis"
)
UPDATE "tsumeshogis" t
SET problem_number = n.num
FROM numbered n
WHERE t.id = n.id;

-- 3. Make column not null
ALTER TABLE "tsumeshogis" ALTER COLUMN "problem_number" SET NOT NULL;

-- 4. Add unique constraint on (move_count, problem_number)
ALTER TABLE "tsumeshogis" ADD CONSTRAINT "tsumeshogis_move_count_problem_number_key" UNIQUE ("move_count", "problem_number");
