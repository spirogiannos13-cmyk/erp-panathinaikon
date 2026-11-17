SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF OBJECT_ID(N'dbo.OrderPayments', N'U') IS NOT NULL
BEGIN
    IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_OrderPayments_Method' AND parent_object_id=OBJECT_ID(N'dbo.OrderPayments'))
        ALTER TABLE dbo.OrderPayments DROP CONSTRAINT CK_OrderPayments_Method;
    ALTER TABLE dbo.OrderPayments WITH CHECK
        ADD CONSTRAINT CK_OrderPayments_Method CHECK(Method IN(N'Cash',N'Card',N'BankTransfer',N'Other',N'IRIS'));
END;
COMMIT TRANSACTION;
