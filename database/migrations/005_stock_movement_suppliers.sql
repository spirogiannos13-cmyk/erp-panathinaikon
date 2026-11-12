IF COL_LENGTH(N'dbo.StockMovements',N'SupplierId') IS NULL
 ALTER TABLE dbo.StockMovements ADD SupplierId int NULL;
GO
IF NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_StockMovements_Suppliers')
 ALTER TABLE dbo.StockMovements ADD CONSTRAINT FK_StockMovements_Suppliers FOREIGN KEY(SupplierId) REFERENCES dbo.Suppliers(Id);
GO
CREATE INDEX IX_StockMovements_Store_Supplier_Created ON dbo.StockMovements(StoreId,SupplierId,CreatedAtUtc DESC) WHERE SupplierId IS NOT NULL;
GO
