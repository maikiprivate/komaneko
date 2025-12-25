-- CreateUniqueIndex
CREATE UNIQUE INDEX "courses_order_key" ON "courses"("order");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "sections_course_id_order_key" ON "sections"("course_id", "order");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "lessons_section_id_order_key" ON "lessons"("section_id", "order");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "lesson_problems_lesson_id_order_key" ON "lesson_problems"("lesson_id", "order");
