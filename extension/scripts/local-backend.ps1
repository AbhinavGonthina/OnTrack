# Runs OnTrack's backend against the throwaway Docker Postgres the extension's
# e2e suite uses, never against Neon.
#
#   docker run -d --rm --name ontrack-ext-db -e POSTGRES_PASSWORD=test `
#     -e POSTGRES_DB=ontrack -p 5434:5432 postgres:17
#   .\extension\scripts\local-backend.ps1
#
# backend/.env is loaded for JWT_SECRET and GEMINI_API_KEY, then every variable
# that could reach production or send real mail is overwritten below. Run it
# from the repo root.

param(
    # Appended to CORS_ALLOWED_ORIGINS so the unpacked extension can call the API.
    [string]$ExtensionId = "immfkodocchgncopfbmieneelgplgfai",
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$envFile = Join-Path $repoRoot "backend\.env"

if (-not (Test-Path $envFile)) {
    Write-Host "Missing backend/.env" -ForegroundColor Red
    exit 1
}

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}

# --- Overrides. Everything here replaces whatever .env just set. ---

# The local container, never Neon.
$env:DATABASE_URL = "jdbc:postgresql://localhost:5434/ontrack"
$env:DATABASE_USERNAME = "postgres"
$env:DATABASE_PASSWORD = "test"

# Host-only cookie with SameSite=None, which is the localhost shape.
$env:SESSION_COOKIE_DOMAIN = ""
$env:CORS_ALLOWED_ORIGINS = "http://localhost:3000,chrome-extension://$ExtensionId"
$env:FRONTEND_URL = "http://localhost:3000"

# A dummy key makes the verification email fail inside AuthService.trySend,
# which swallows it. Signup still works and no real mail is sent.
$env:RESEND_API_KEY = "re_local_dummy_key"
$env:FEEDBACK_RECIPIENT_EMAIL = "local@example.com"

if (-not ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe")))) {
    $jdk = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory -Filter "jdk-21*" -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | Select-Object -First 1
    if (-not $jdk) {
        Write-Host "No JDK 21 found." -ForegroundColor Red
        exit 1
    }
    $env:JAVA_HOME = $jdk.FullName
}
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

Write-Host "DATABASE_URL     = $env:DATABASE_URL"
Write-Host "CORS origins     = $env:CORS_ALLOWED_ORIGINS"
Write-Host "Cookie domain    = (host-only)"

# The wrapper resolves the project from the working directory, so run it from
# backend/ rather than the repo root (there is no pom.xml there).
Set-Location (Join-Path $repoRoot "backend")
& ".\mvnw.cmd" spring-boot:run "-Dspring-boot.run.jvmArguments=-Dserver.port=$Port"
