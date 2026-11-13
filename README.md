# Panathinaikon ERP

Modern restaurant and hospitality management system.

## Current preview
A responsive, Greek-language dashboard prototype with a minimal green visual identity inspired by Panathinaikos green and white.

## Local development setup

### Prerequisites
- .NET 8 SDK (the backend targets .NET 8).
- Docker Desktop with Docker Compose.
- SQL Server container started from the repository root.

### 1. Configure local environment

Copy the example environment file and set a strong local SQL Server password (at least 16 characters):

```powershell
Copy-Item .env.example .env
notepad .env
```

Keep `.env` local. It is ignored by Git and must never be committed.

### 2. Start SQL Server

From the repository root:

```powershell
docker compose up -d sqlserver
docker ps
```

Wait until the `panathinaikon-sql` container is healthy/ready before continuing.

### 3. Create local backend settings

From the repository root, create a local development settings file. Do not commit it:

```powershell
@'
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=PanathinaikonDb;User Id=sa;Password=PUT_THE_SAME_PASSWORD_AS_IN_DOT_ENV;Encrypt=True;TrustServerCertificate=True"
  },
  "Jwt": {
    "Issuer": "Panathinaikon.Api",
    "Audience": "Panathinaikon.Web",
    "SigningKey": "REPLACE_WITH_A_RANDOM_SECRET_OF_AT_LEAST_32_BYTES",
    "ExpiresMinutes": 60
  },
  "Bootstrap": { "Enabled": false },
  "AllowedHosts": "*"
}
'@ | Set-Content .\backend\Panathinaikon.Api\appsettings.Development.json
```

Replace both placeholders locally. Generate a random signing key with:

```powershell
$bytes = New-Object byte[] 48
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$rng.Dispose()
```

Paste the generated value as `Jwt:SigningKey`. Use the same password you configured in `.env` for the SQL connection string. Never commit these values.

### 4. Initialize the database (only for a fresh database)

Only run the schema script when creating a new, empty database. Do not rerun it against an existing database:

```powershell
docker exec -it panathinaikon-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YOUR_LOCAL_SA_PASSWORD" -C -Q "IF DB_ID('PanathinaikonDb') IS NULL CREATE DATABASE PanathinaikonDb"
docker exec -i panathinaikon-sql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "YOUR_LOCAL_SA_PASSWORD" -C -d PanathinaikonDb < database/schema.sql
```

For an existing database, apply only migrations that have not yet been applied. Back up first.

### 5. Run the backend

```powershell
cd backend\Panathinaikon.Api
dotnet run
```

With the Development environment active, Swagger is available at `/swagger` and health at `/api/health`. Default launch URLs are shown in the terminal.

### 6. Frontend preview

The static prototype can be opened by serving the repository root, for example:

```powershell
python -m http.server 5500
```

Then visit `http://localhost:5500`.

## Security notes
- Never commit `.env`, `appsettings.Development.json`, passwords, database connection strings, or JWT signing keys.
- `appsettings.json` intentionally contains empty secret values; supply local values through user secrets, environment variables, or the ignored Development settings file.
- The bootstrap endpoint is disabled by default. Do not enable it on a populated database.
- The dashboard is currently a prototype. Verify backend and frontend integration separately.

## Project direction
The project is evolving from the original dashboard prototype into a SQL-backed restaurant management application.

## Modules
- Dashboard
- Table Management
- Take Away
- Delivery
- Items and Pricing
- Inventory and Recipes
- Suppliers
- Customers
- Reservations
- Orders and Payments
- Staff Management
