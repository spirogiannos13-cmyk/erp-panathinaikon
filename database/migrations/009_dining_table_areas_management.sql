-- Create persistent dining-table areas and link existing tables without losing data.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.TableAreas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TableAreas(
        Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_TableAreas PRIMARY KEY,
        StoreId int NOT NULL,
        Name nvarchar(80) NOT NULL,
        IsActive bit NOT NULL CONSTRAINT DF_TableAreas_IsActive DEFAULT 1,
        CONSTRAINT FK_TableAreas_Stores FOREIGN KEY(StoreId) REFERENCES dbo.Stores(Id),
        CONSTRAINT UQ_TableAreas_Store_Name UNIQUE(StoreId,Name)
    );
END;
IF COL_LENGTH('dbo.DiningTables','AreaId') IS NULL
    ALTER TABLE dbo.DiningTables ADD AreaId int NULL;
INSERT INTO dbo.TableAreas(StoreId,Name)
SELECT DISTINCT t.StoreId, COALESCE(NULLIF(LTRIM(RTRIM(t.Area)),N''),N'Ισόγειο')
FROM dbo.DiningTables t
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.TableAreas a
    WHERE a.StoreId=t.StoreId AND a.Name=COALESCE(NULLIF(LTRIM(RTRIM(t.Area)),N''),N'Ισόγειο')
);
UPDATE t SET AreaId=a.Id
FROM dbo.DiningTables t
JOIN dbo.TableAreas a ON a.StoreId=t.StoreId
 AND a.Name=COALESCE(NULLIF(LTRIM(RTRIM(t.Area)),N''),N'Ισόγειο')
WHERE t.AreaId IS NULL;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_DiningTables_TableAreas')
    ALTER TABLE dbo.DiningTables ADD CONSTRAINT FK_DiningTables_TableAreas
    FOREIGN KEY(AreaId) REFERENCES dbo.TableAreas(Id);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'IX_DiningTables_Store_AreaId' AND object_id=OBJECT_ID(N'dbo.DiningTables'))
    CREATE INDEX IX_DiningTables_Store_AreaId ON dbo.DiningTables(StoreId,AreaId,IsActive);
COMMIT TRANSACTION;
