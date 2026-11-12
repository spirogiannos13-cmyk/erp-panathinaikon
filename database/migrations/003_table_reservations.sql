IF OBJECT_ID(N'dbo.TableReservations',N'U') IS NULL
BEGIN
 CREATE TABLE dbo.TableReservations(
  Id int IDENTITY PRIMARY KEY,StoreId int NOT NULL,TableId int NULL,CustomerId int NULL,
  GuestName nvarchar(160) NOT NULL,Phone nvarchar(40) NULL,GuestCount int NOT NULL,
  StartsAtLocal datetime2(0) NOT NULL,DurationMinutes int NOT NULL CONSTRAINT DF_TableReservations_Duration DEFAULT 120,
  Status nvarchar(20) NOT NULL CONSTRAINT DF_TableReservations_Status DEFAULT 'Booked',Notes nvarchar(500) NULL,
  CreatedAtUtc datetime2(3) NOT NULL CONSTRAINT DF_TableReservations_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_TableReservations_Stores FOREIGN KEY(StoreId) REFERENCES dbo.Stores(Id),
  CONSTRAINT FK_TableReservations_Tables FOREIGN KEY(TableId) REFERENCES dbo.DiningTables(Id),
  CONSTRAINT FK_TableReservations_Customers FOREIGN KEY(CustomerId) REFERENCES dbo.Customers(Id),
  CONSTRAINT CK_TableReservations_GuestCount CHECK(GuestCount BETWEEN 1 AND 50),
  CONSTRAINT CK_TableReservations_Duration CHECK(DurationMinutes BETWEEN 30 AND 360),
  CONSTRAINT CK_TableReservations_Status CHECK(Status IN('Booked','Seated','Cancelled','NoShow'))
 );
 CREATE INDEX IX_TableReservations_Store_Start_Status ON dbo.TableReservations(StoreId,StartsAtLocal,Status);
END;
