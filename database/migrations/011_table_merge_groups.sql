SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.TableMergeGroups',N'U') IS NULL
BEGIN
 CREATE TABLE dbo.TableMergeGroups(Id int IDENTITY PRIMARY KEY,StoreId int NOT NULL,AnchorTableId int NOT NULL,CreatedAtUtc datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),IsActive bit NOT NULL DEFAULT 1,CONSTRAINT FK_TableMergeGroups_Stores FOREIGN KEY(StoreId) REFERENCES dbo.Stores(Id),CONSTRAINT FK_TableMergeGroups_AnchorTable FOREIGN KEY(AnchorTableId) REFERENCES dbo.DiningTables(Id));
 CREATE UNIQUE INDEX UX_TableMergeGroups_Store_Anchor_Active ON dbo.TableMergeGroups(StoreId,AnchorTableId) WHERE IsActive=1;
END;
IF OBJECT_ID(N'dbo.TableMergeMembers',N'U') IS NULL
BEGIN
 CREATE TABLE dbo.TableMergeMembers(Id int IDENTITY PRIMARY KEY,GroupId int NOT NULL,TableId int NOT NULL,CONSTRAINT FK_TableMergeMembers_Groups FOREIGN KEY(GroupId) REFERENCES dbo.TableMergeGroups(Id) ON DELETE CASCADE,CONSTRAINT FK_TableMergeMembers_Tables FOREIGN KEY(TableId) REFERENCES dbo.DiningTables(Id),CONSTRAINT UQ_TableMergeMembers_Group_Table UNIQUE(GroupId,TableId));
 CREATE UNIQUE INDEX UX_TableMergeMembers_Table ON dbo.TableMergeMembers(TableId);
END;
COMMIT TRANSACTION;
