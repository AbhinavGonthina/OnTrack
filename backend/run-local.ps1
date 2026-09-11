# Loads backend/.env into this process's environment, then runs the app.
# Never commits or prints your secret values anywhere.

$envFile = Join-Path $PSScriptRoot ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "Missing backend/.env - copy .env.example to .env and fill in real values first." -ForegroundColor Red
    exit 1
}

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$') {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}

# Resolve a JDK 21 rather than hardcoding one exact patch version: Temurin updates itself in
# place under a new versioned folder name, which silently breaks a pinned path ("JAVA_HOME
# environment variable is not defined correctly"). Prefer an already-correct JAVA_HOME, then
# fall back to the newest Adoptium 21 install on disk.
if (-not ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe")))) {
    $jdk = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory -Filter "jdk-21*" -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending | Select-Object -First 1
    if (-not $jdk) {
        Write-Host "No JDK 21 found. Install it with: winget install --id EclipseAdoptium.Temurin.21.JDK" -ForegroundColor Red
        exit 1
    }
    $env:JAVA_HOME = $jdk.FullName
}
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
Write-Host "Using JAVA_HOME=$env:JAVA_HOME"

& "$PSScriptRoot\mvnw.cmd" spring-boot:run
