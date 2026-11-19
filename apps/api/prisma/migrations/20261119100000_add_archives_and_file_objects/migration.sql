CREATE TABLE "FileObject" (
    "storageKey" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileObject_pkey" PRIMARY KEY ("storageKey"),
    CONSTRAINT "FileObject_size_check" CHECK ("size" >= 0 AND "size" <= 5242880)
);

CREATE TABLE "Archive" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL,
    "year" INTEGER,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storageKey" TEXT NOT NULL,
    CONSTRAINT "Archive_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Archive_size_check" CHECK ("size" > 0 AND "size" <= 5242880),
    CONSTRAINT "Archive_year_check" CHECK ("year" IS NULL OR ("year" >= 1900 AND "year" <= 2200)),
    CONSTRAINT "Archive_storageKey_fkey" FOREIGN KEY ("storageKey") REFERENCES "FileObject"("storageKey") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Archive_storageKey_key" ON "Archive"("storageKey");
CREATE INDEX "Archive_isPublished_category_year_title_idx" ON "Archive"("isPublished", "category", "year", "title");
