-- AlterTable
ALTER TABLE "Cv" ADD COLUMN "extraPersonal_new" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Cv" ADD COLUMN "extraContact_new" JSONB NOT NULL DEFAULT '[]';

UPDATE "Cv" SET "extraPersonal_new" = COALESCE(
  (SELECT jsonb_agg(jsonb_build_object('label', 'Fanampiny ' || idx, 'value', val) ORDER BY idx)
   FROM unnest("Cv"."extraPersonal") WITH ORDINALITY AS t(val, idx)),
  '[]'::jsonb
);

UPDATE "Cv" SET "extraContact_new" = COALESCE(
  (SELECT jsonb_agg(jsonb_build_object('label', 'Fifandraisana fanampiny ' || idx, 'value', val) ORDER BY idx)
   FROM unnest("Cv"."extraContact") WITH ORDINALITY AS t(val, idx)),
  '[]'::jsonb
);

ALTER TABLE "Cv" DROP COLUMN "extraPersonal";
ALTER TABLE "Cv" DROP COLUMN "extraContact";
ALTER TABLE "Cv" RENAME COLUMN "extraPersonal_new" TO "extraPersonal";
ALTER TABLE "Cv" RENAME COLUMN "extraContact_new" TO "extraContact";
