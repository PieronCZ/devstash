-- CreateIndex
CREATE INDEX "Collection_userId_updatedAt_idx" ON "Collection"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Item_userId_isPinned_updatedAt_idx" ON "Item"("userId", "isPinned", "updatedAt");
