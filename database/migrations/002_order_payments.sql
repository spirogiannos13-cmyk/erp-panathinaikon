SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.OrderPayments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrderPayments
    (
        Id bigint IDENTITY(1,1) NOT NULL CONSTRAINT PK_OrderPayments PRIMARY KEY,
        StoreId int NOT NULL,
        SalesOrderId int NOT NULL,
        Amount decimal(18,2) NOT NULL,
        Method nvarchar(24) NOT NULL,
        Reference nvarchar(160) NULL,
        PaidAtUtc datetime2(3) NOT NULL CONSTRAINT DF_OrderPayments_PaidAtUtc DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_OrderPayments_Stores FOREIGN KEY(StoreId) REFERENCES dbo.Stores(Id),
        CONSTRAINT FK_OrderPayments_SalesOrders FOREIGN KEY(SalesOrderId) REFERENCES dbo.SalesOrders(Id) ON DELETE CASCADE,
        CONSTRAINT CK_OrderPayments_Amount CHECK(Amount > 0),
        CONSTRAINT CK_OrderPayments_Method CHECK(Method IN(N'Cash',N'Card',N'BankTransfer',N'Other'))
    );
    CREATE INDEX IX_OrderPayments_Store_Order_PaidAt
        ON dbo.OrderPayments(StoreId, SalesOrderId, PaidAtUtc);
END;

COMMIT TRANSACTION;
