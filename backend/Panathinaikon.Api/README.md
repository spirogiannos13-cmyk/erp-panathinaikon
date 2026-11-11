# Panathinaikon API

ASP.NET Core 8 API with SQL Server persistence. The current browser UI remains a prototype until a later integration step.

## Requirements
- .NET 8 SDK
- Docker Desktop (or SQL Server 2022 Developer)
- SQL Server tools such as sqlcmd or Azure Data Studio

## Start SQL Server locally
1. Copy root `.env.example` to `.env` and set a strong local password.
2. Run `docker compose up -d`.
3. Create an empty database named `Panathinaikon`.
4. Execute `database/schema.sql` against that database. Do not run against a database containing unrelated data.

## Configure and run the API (PowerShell)
```powershell
$env:ConnectionStrings__DefaultConnection = "Server=localhost,1433;Database=Panathinaikon;User Id=sa;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=True"
$env:Jwt__SigningKey = "replace-with-a-random-secret-of-at-least-32-bytes"
$env:Bootstrap__Enabled = "true"
dotnet run --project .\backend\Panathinaikon.Api
```
Open Swagger at the development URL printed by dotnet.

## First administrator
With `Bootstrap:Enabled=true`, call `POST /api/auth/bootstrap` once:
```json
{"storeName":"Κεντρικό","username":"admin","displayName":"Διαχειριστής","password":"Use-A-Unique-Password-Of-12-Chars-Minimum"}
```
The endpoint only works while Users is empty. Immediately set `Bootstrap:Enabled=false`. Never expose bootstrap enabled publicly. Then call `POST /api/auth/login`; protected endpoints require `Authorization: Bearer <token>`.

## Configuration
- `ConnectionStrings__DefaultConnection` or `PANATHINAIKON_DB`: SQL Server connection.
- `Jwt__SigningKey` or `PANATHINAIKON_JWT_KEY`: random secret, minimum 32 UTF-8 bytes.
- `Jwt__Issuer`, `Jwt__Audience`, `Jwt__ExpiresMinutes`: token settings.
- `Bootstrap__Enabled`: one-time setup only.
- `Cors__Origins__0`, etc.: explicit frontend origins.

No real credentials, customer data, production database details or secrets belong in source control.

## Initial endpoints
- `GET /api/health`
- `POST /api/auth/bootstrap` (disabled by default)
- `POST /api/auth/login`
- `GET /api/stores/current`
- `GET/POST /api/items`
- `GET /api/tables`
- `GET /api/inventory`
- `GET /api/recipes`
- `GET /api/orders`

Operational endpoints are authenticated and scoped to the store ID in the signed token. This is a foundation, not yet a complete production POS: order write workflows, inventory transaction services, audit logging, automated migrations, backups, monitoring and frontend integration are subsequent work.
