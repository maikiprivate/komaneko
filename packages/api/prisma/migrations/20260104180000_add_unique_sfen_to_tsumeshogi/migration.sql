-- Add unique constraint to sfen column
-- This ensures no duplicate tsumeshogi problems and enables efficient SFEN-based lookups

CREATE UNIQUE INDEX "tsumeshogis_sfen_key" ON "tsumeshogis"("sfen");
