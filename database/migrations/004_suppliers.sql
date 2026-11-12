IF OBJECT_ID(N'dbo.Suppliers',N'U') IS NULL
BEGIN
 CREATE TABLE dbo.Suppliers(
  Id int IDENTITY(1,1) NOT NULL CONSTRAINT PK_Suppliers PRIMARY KEY,
  StoreId int NOT NULL,
  Name nvarchar(160) NOT NULL,
  ContactName nvarchar(160) NULL,
  Phone nvarchar(40) NULL,
  Email nvarchar(160) NULL,
  Address nvarchar(300) NULL,
  TaxNumber nvarchar(32) NULL,
  Notes nvarchar(500) NULL,
  IsActive bit NOT NULL CONSTRAINT DF_Suppliers_IsActive DEFAULT(1),
  CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_Suppliers_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_Suppliers_Stores FOREIGN KEY(StoreId) REFERENCES dbo.Stores(Id)
 );
 CREATE UNIQUE INDEX UX_Suppliers_Store_Name ON dbo.Suppliers(StoreId,Name) WHERE IsActive=1;
END;
