# Runs the backend in the *production cookie shape* for Experiment B of the
# Section 6.4 spike: HTTPS, a cookie scoped to a parent domain, SameSite=Lax,
# and the web app on a sibling subdomain. Production is
# api.abhinavgonthina.dev / ontrack.abhinavgonthina.dev with the cookie on
# .abhinavgonthina.dev; this reproduces that with *.ontrack.test names that
# Chromium maps to 127.0.0.1 via --host-resolver-rules (so nothing touches the
# hosts file and no real DNS is involved).
#
#   docker run -d --rm --name ontrack-ext-db -e POSTGRES_PASSWORD=test `
#     -e POSTGRES_DB=ontrack -p 5434:5432 postgres:17
#   .\extension\scripts\local-backend-https.ps1
#
# Pair with: cd frontend; npm run dev -- --experimental-https -p 3443
#   (with NEXT_PUBLIC_API_URL=https://api.ontrack.test:8443)

param(
    [string]$ExtensionId = "immfkodocchgncopfbmieneelgplgfai",
    [int]$Port = 8443,
    [int]$FrontendPort = 3443
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$envFile = Join-Path $repoRoot "backend\.env"
$keyDir = Join-Path $repoRoot "extension\.keys"
$keystore = Join-Path $keyDir "ontrack-test.p12"
$storePass = "changeit"

if (-not (Test-Path $envFile)) {
    Write-Host "Missing backend/.env" -ForegroundColor Red
    exit 1
}

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}

if (-not ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe")))) {
    $jdk = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory -Filter "jdk-21*" -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | Select-Object -First 1
    if (-not $jdk) { Write-Host "No JDK 21 found." -ForegroundColor Red; exit 1 }
    $env:JAVA_HOME = $jdk.FullName
}
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"

# Throwaway self-signed cert, valid for 3 days, regenerated on demand. It lives
# under .keys/ which is gitignored. Chromium is launched with
# --ignore-certificate-errors for these tests, so it is never trusted anywhere.
if (-not (Test-Path $keystore)) {
    New-Item -ItemType Directory -Force -Path $keyDir | Out-Null
    Write-Host "Generating throwaway keystore at $keystore"
    & keytool -genkeypair -alias ontrack-test -keyalg RSA -keysize 2048 -validity 3 `
        -storetype PKCS12 -keystore $keystore -storepass $storePass `
        -dname "CN=api.ontrack.test, OU=Test, O=OnTrack, L=Test, S=Test, C=US" `
        -ext "SAN=dns:api.ontrack.test,dns:app.ontrack.test,dns:localhost,ip:127.0.0.1"
}

# --- Overrides. The local container, never Neon. ---
$env:DATABASE_URL = "jdbc:postgresql://localhost:5434/ontrack"
$env:DATABASE_USERNAME = "postgres"
$env:DATABASE_PASSWORD = "test"

# The production shape: cookie on the shared parent domain, so it is sent to the
# api. subdomain from a page on the app. subdomain. SessionCookie.java switches
# to SameSite=Lax whenever this is set.
$env:SESSION_COOKIE_DOMAIN = ".ontrack.test"
$env:CORS_ALLOWED_ORIGINS = "https://app.ontrack.test:$FrontendPort,chrome-extension://$ExtensionId"
$env:FRONTEND_URL = "https://app.ontrack.test:$FrontendPort"

$env:RESEND_API_KEY = "re_local_dummy_key"
$env:FEEDBACK_RECIPIENT_EMAIL = "local@example.com"

Write-Host "HTTPS on       : https://api.ontrack.test:$Port"
Write-Host "Cookie domain  : $env:SESSION_COOKIE_DOMAIN"
Write-Host "CORS origins   : $env:CORS_ALLOWED_ORIGINS"

Set-Location (Join-Path $repoRoot "backend")
$jvmArgs = @(
    "-Dserver.port=$Port"
    "-Dserver.ssl.enabled=true"
    "-Dserver.ssl.key-store=$keystore"
    "-Dserver.ssl.key-store-password=$storePass"
    "-Dserver.ssl.key-store-type=PKCS12"
    "-Dserver.ssl.key-alias=ontrack-test"
) -join " "

& ".\mvnw.cmd" spring-boot:run "-Dspring-boot.run.jvmArguments=$jvmArgs"
