-- Add a physical area/floor to existing dining tables without changing their identities or statuses.
-- Existing rows receive the default area "Ισόγειο".
IF COL_LENGTH('dbo.DiningTables','Area') IS NULL
BEGIN
    ALTER TABLE dbo.DiningTables
    ADD Area nvarchar(80) NOT NULL
        CONSTRAINT DF_DiningTables_Area DEFAULT N'Ισόγειο' WITH VALUES;
END;
