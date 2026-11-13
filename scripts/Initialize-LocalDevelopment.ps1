[CmdletBinding()]
param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot ".env"
$settingsPath = Join-Path $repoRoot "backend\Panathinaikon.Api\appsettings.Development.json"

if ((Test-Path -LiteralPath $settingsPath) -and -not $Force) {
    throw "Local API settings already exist. Use -Force only if you intentionally want to regenerate the JWT key and replace them."
}

$password = $null
if (Test-Path -LiteralPath $envPath) {
    $envContent = [System.IO.File]::ReadAllText($envPath)
    $match = [regex]::Match($envContent, '(?m)^\s*MSSQL_SA_PASSWORD\s*=\s*(.*?)\s*$')
    if ($match.Success) {
        $password = $match.Groups[1].Value.Trim()
        if (($password.StartsWith('"') -and $password.EndsWith('"')) -or
            ($password.StartsWith("'") -and $password.EndsWith("'"))) {
            $password = $password.Substring(1, $password.Length - 2)
        }
    }
}

if ([string]::IsNullOrWhiteSpace($password)) {
    $docker = Get-Command docker -ErrorAction SilentlyContinue
    if ($null -eq $docker) {
        throw "Docker CLI was not found. Start Docker Desktop, or configure MSSQL_SA_PASSWORD in the root .env file."
    }

    $containerEnvironment = & docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' panathinaikon-sql 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Could not read the existing panathinaikon-sql container. Start it, or set MSSQL_SA_PASSWORD in the root .env file, then rerun this script."
    }

    $passwordEntry = $containerEnvironment | Where-Object { $_.StartsWith("MSSQL_SA_PASSWORD=") } | Select-Object -First 1
    if ($null -ne $passwordEntry -and $passwordEntry.Length -gt "MSSQL_SA_PASSWORD=".Length) {
        $password = $passwordEntry.Substring("MSSQL_SA_PASSWORD=".Length)

        if (Test-Path -LiteralPath $envPath) {
            $lines = @(Get-Content -LiteralPath $envPath)
            $updated = $false
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match '^\s*MSSQL_SA_PASSWORD\s*=') {
                    $lines[$i] = "MSSQL_SA_PASSWORD=$password"
                    $updated = $true
                }
            }
            if (-not $updated) {
                $lines += "MSSQL_SA_PASSWORD=$password"
            }
            Set-Content -LiteralPath $envPath -Value $lines -Encoding ascii
        }
        else {
            Set-Content -LiteralPath $envPath -Value "MSSQL_SA_PASSWORD=$password" -Encoding ascii
        }
        Write-Host "Recovered the existing SQL Server password into the ignored root .env file."
    }
    else {
        throw "The container did not expose a non-empty MSSQL_SA_PASSWORD. Set the existing SQL password in the root .env file and rerun this script."
    }
}

if ([string]::IsNullOrWhiteSpace($password)) {
    throw "MSSQL_SA_PASSWORD is empty. Configure it in the root .env file and rerun this script."
}

$connection = New-Object System.Data.Common.DbConnectionStringBuilder
$connection["Data Source"] = "localhost,1433"
$connection["Initial Catalog"] = "PanathinaikonDb"
$connection["User ID"] = "sa"
$connection["Password"] = $password
$connection["Encrypt"] = "True"
$connection["TrustServerCertificate"] = "True"

$keyBytes = New-Object byte[] 64
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $rng.GetBytes($keyBytes)
}
finally {
    $rng.Dispose()
}
$jwtKey = [Convert]::ToBase64String($keyBytes)

$config = @{
    ConnectionStrings = @{
        DefaultConnection = $connection.ConnectionString
    }
    Jwt = @{
        Issuer = "Panathinaikon.Api"
        Audience = "Panathinaikon.Web"
        SigningKey = $jwtKey
        ExpiresMinutes = 60
    }
    Bootstrap = @{
        Enabled = $false
    }
    AllowedHosts = "*"
}

$json = $config | ConvertTo-Json -Depth 6
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($settingsPath, $json + [Environment]::NewLine, $utf8NoBom)

Write-Host "Local API settings created at backend\Panathinaikon.Api\appsettings.Development.json."
Write-Host "The existing database was not modified. Local secrets remain in Git-ignored files."
