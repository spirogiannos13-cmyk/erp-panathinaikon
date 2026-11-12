IF COL_LENGTH(N'dbo.StockMovements',N'UnitCostSnapshot') IS NULL
 ALTER TABLE dbo.StockMovements ADD UnitCostSnapshot decimal(18,4) NULL;
GO
CREATE INDEX IX_StockMovements_Store_Supplier_PurchaseDate ON dbo.StockMovements(StoreId,SupplierId,CreatedAtUtc DESC) INCLUDE(StockItemId,QuantityDelta,UnitCostSnapshot,Reference) WHERE SupplierId IS NOT NULL;
GO
