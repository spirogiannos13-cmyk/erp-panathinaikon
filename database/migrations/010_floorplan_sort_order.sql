SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF COL_LENGTH('dbo.TableAreas','SortOrder') IS NULL
BEGIN
    ALTER TABLE dbo.TableAreas ADD SortOrder int NOT NULL
        CONSTRAINT DF_TableAreas_SortOrder DEFAULT 0 WITH VALUES;
END;
IF COL_LENGTH('dbo.DiningTables','SortOrder') IS NULL
BEGIN
    ALTER TABLE dbo.DiningTables ADD SortOrder int NOT NULL
        CONSTRAINT DF_DiningTables_SortOrder DEFAULT 0 WITH VALUES;
END;
;WITH AreaOrder AS (
    SELECT Id, ROW_NUMBER() OVER(PARTITION BY StoreId ORDER BY Name,Id) AS NewOrder
    FROM dbo.TableAreas WHERE IsActive=1
)
UPDATE a SET SortOrder=CONVERT(int,o.NewOrder)
FROM dbo.TableAreas a JOIN AreaOrder o ON o.Id=a.Id;
;WITH TableOrder AS (
    SELECT Id, ROW_NUMBER() OVER(PARTITION BY StoreId,AreaId ORDER BY Name,Id) AS NewOrder
    FROM dbo.DiningTables WHERE IsActive=1
)
UPDATE t SET SortOrder=CONVERT(int,o.NewOrder)
FROM dbo.DiningTables t JOIN TableOrder o ON o.Id=t.Id;
COMMIT TRANSACTION;
