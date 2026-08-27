-- CreateTable
CREATE TABLE "functions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "functionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "plainLanguage" TEXT,
    CONSTRAINT "categories_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "functions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "priority" TEXT,
    "owner" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "assessments_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "categories_functionId_idx" ON "categories"("functionId");

-- CreateIndex
CREATE UNIQUE INDEX "assessments_categoryId_key" ON "assessments"("categoryId");

-- CreateIndex
CREATE INDEX "assessments_status_idx" ON "assessments"("status");
