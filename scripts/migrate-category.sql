-- 카테고리 필드를 enum에서 string으로 변경하는 SQL 스크립트

-- 1. 먼저 현재 카테고리 데이터를 확인
SELECT id, category FROM "Song" LIMIT 5;

-- 2. category 컬럼을 TEXT로 변경
ALTER TABLE "Song" ALTER COLUMN category TYPE TEXT;

-- 3. Category enum 타입 삭제 (더 이상 사용하지 않음)
DROP TYPE IF EXISTS "Category";

-- 4. 변경된 데이터 확인
SELECT id, category FROM "Song" LIMIT 5; 