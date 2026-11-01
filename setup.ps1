<#
.SYNOPSIS
    PTDARRAHMAN — One-Command Project Setup (Windows PowerShell)

.DESCRIPTION
    Skrip ini menyiapkan seluruh monorepo PPDB PTDARRAHMAN dalam satu perintah
    langsung di Windows PowerShell / Windows Terminal (tanpa perlu Bash / WSL manual).

.PARAMETER Mode
    docker : Build & jalankan seluruh stack via Docker Compose
    local  : Jalankan frontend (Vite) + backend (FastAPI) langsung di host

.EXAMPLE
    .\setup.ps1 docker
    .\setup.ps1 local
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet("docker", "d", "local", "l", "help", "h", "")]
    [string]$Mode = ""
)

$ErrorActionPreference = "Stop"

# ── Deteksi Root Direktori Dinamis ───────────────────────────
$ScriptDir = $PSScriptRoot
if (-not $ScriptDir) {
    $ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if (-not $ScriptDir) {
    $ScriptDir = (Get-Location).Path
}
Set-Location $ScriptDir

# ── Helper Output Berwarna ───────────────────────────────────
function Write-Info([string]$msg) {
    Write-Host "[INFO] $msg" -ForegroundColor Cyan
}
function Write-Success([string]$msg) {
    Write-Host "[OK]   $msg" -ForegroundColor Green
}
function Write-Warn([string]$msg) {
    Write-Host "[WARN] $msg" -ForegroundColor Yellow
}
function Write-Err([string]$msg) {
    Write-Host "[ERR]  $msg" -ForegroundColor Red
}

# ── Helper Generate Random Secret ────────────────────────────
function New-RandomHex([int]$bytes = 32) {
    $buffer = New-Object byte[] $bytes
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($buffer)
    return -join ($buffer | ForEach-Object { "{0:x2}" -f $_ })
}

# ── Helper Manipulasi File .env ──────────────────────────────
function Set-EnvValue([string]$FilePath, [string]$Key, [string]$Value) {
    if (-not (Test-Path $FilePath)) {
        return
    }
    $raw = Get-Content -Path $FilePath -Raw -Encoding UTF8
    $pattern = "(?m)^$([regex]::Escape($Key))=.*$"
    if ($raw -match $pattern) {
        $raw = [regex]::Replace($raw, $pattern, "$Key=$Value")
    } else {
        $raw = $raw.TrimEnd() + [System.Environment]::NewLine + "$Key=$Value" + [System.Environment]::NewLine
    }
    # Tulis ulang file UTF-8 tanpa BOM agar kompatibel dengan Docker/Linux
    [System.IO.File]::WriteAllText($FilePath, $raw, [System.Text.UTF8Encoding]::new($false))
}

function Get-EnvValue([string]$FilePath, [string]$Key) {
    if (-not (Test-Path $FilePath)) { return $null }
    $pattern = "^$([regex]::Escape($Key))=(.*)$"
    foreach ($line in (Get-Content -Path $FilePath -Encoding UTF8)) {
        if ($line -match $pattern) {
            return $Matches[1].Trim()
        }
    }
    return $null
}

# ── Cek Prasyarat ────────────────────────────────────────────
function Test-Prerequisites([string]$TargetMode) {
    $missing = @()

    # Node.js
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        $missing += "Node.js v20+ (https://nodejs.org/ atau 'winget install OpenJS.NodeJS.LTS')"
    } else {
        try {
            $nodeVerRaw = (node -v).Trim().TrimStart("v")
            $nodeMajor = [int]($nodeVerRaw.Split(".")[0])
            if ($nodeMajor -lt 20) {
                Write-Warn "Node.js versi $nodeVerRaw — disarankan v20+"
            }
        } catch {}
    }

    # pnpm
    if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
        $missing += "pnpm ('npm install -g pnpm' atau 'winget install pnpm.pnpm')"
    }

    # Python
    $pythonCmd = $null
    if (Get-Command python -ErrorAction SilentlyContinue) {
        $pythonCmd = "python"
    } elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
        $pythonCmd = "python3"
    }

    if (-not $pythonCmd) {
        $missing += "Python 3.12+ (https://python.org/ atau 'winget install Python.Python.3.12')"
    }

    # Docker
    if ($TargetMode -eq "docker") {
        if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
            $missing += "Docker Desktop (https://www.docker.com/products/docker-desktop/)"
        } else {
            # Pastikan daemon berjalan
            $dockerRunning = $false
            try {
                docker info >$null 2>&1
                if ($LASTEXITCODE -eq 0) { $dockerRunning = $true }
            } catch {}

            if (-not $dockerRunning) {
                Write-Warn "Docker CLI terpasang tapi engine belum berjalan. Pastikan Docker Desktop sudah aktif/Running."
            }
        }
    }

    if ($missing.Count -gt 0) {
        Write-Err "Prasyarat belum lengkap:"
        foreach ($m in $missing) {
            Write-Host "  - $m" -ForegroundColor Red
        }
        Write-Host ""
        exit 1
    }

    return $pythonCmd
}

# ── Setup .env Files ─────────────────────────────────────────
function Setup-EnvFiles([string]$AppEnvMode) {
    Write-Info "Menyiapkan file .env di seluruh monorepo..."

    # 1. apps/api/.env
    $apiEnv = "apps/api/.env"
    $apiExample = "apps/api/.env.example"
    $needApi = $false

    if (-not (Test-Path $apiEnv)) {
        Copy-Item $apiExample $apiEnv
        $needApi = $true
        Write-Info "  apps/api/.env dibuat dari .env.example"
    } else {
        $jwt = Get-EnvValue $apiEnv "JWT_SECRET"
        if ([string]::IsNullOrWhiteSpace($jwt) -or $jwt -like "*ganti_dengan*") {
            $needApi = $true
        }
        $pakasir = Get-EnvValue $apiEnv "PAKASIR_WEBHOOK_SECRET"
        if ($null -eq $pakasir) {
            $needApi = $true
        }
    }

    if ($needApi) {
        $jwtSecret = Get-EnvValue $apiEnv "JWT_SECRET"
        if ([string]::IsNullOrWhiteSpace($jwtSecret) -or $jwtSecret -like "*ganti_dengan*") {
            $jwtSecret = New-RandomHex 32
        }

        $cronSecret = Get-EnvValue $apiEnv "CRON_SECRET"
        if ([string]::IsNullOrWhiteSpace($cronSecret) -or $cronSecret -like "*ganti_dengan*") {
            $cronSecret = New-RandomHex 16
        }

        $waApiKey = Get-EnvValue $apiEnv "WA_SERVICE_API_KEY"
        if ([string]::IsNullOrWhiteSpace($waApiKey) -or $waApiKey -like "*ganti_dengan*") {
            $waApiKey = New-RandomHex 32
        }

        $waWebhookSecret = Get-EnvValue $apiEnv "WA_WEBHOOK_SECRET"
        if ([string]::IsNullOrWhiteSpace($waWebhookSecret) -or $waWebhookSecret -like "*ganti_dengan*") {
            $waWebhookSecret = New-RandomHex 32
        }

        Set-EnvValue $apiEnv "JWT_SECRET" $jwtSecret
        Set-EnvValue $apiEnv "CRON_SECRET" $cronSecret
        Set-EnvValue $apiEnv "WA_SERVICE_API_KEY" $waApiKey
        Set-EnvValue $apiEnv "WA_WEBHOOK_SECRET" $waWebhookSecret
        Set-EnvValue $apiEnv "APP_ENV" $AppEnvMode

        Write-Success "  apps/api/.env: Secrets otomatis diisi & diamankan"
    } else {
        Write-Success "  apps/api/.env: Sudah lengkap"
    }

    # 2. apps/whatsapp/.env
    $waEnv = "apps/whatsapp/.env"
    $waExample = "apps/whatsapp/.env.example"
    if (-not (Test-Path $waEnv)) {
        Copy-Item $waExample $waEnv
        Write-Info "  apps/whatsapp/.env dibuat dari .env.example"
    }

    $apiWaKey = Get-EnvValue $apiEnv "WA_SERVICE_API_KEY"
    if (-not [string]::IsNullOrWhiteSpace($apiWaKey)) {
        Set-EnvValue $waEnv "API_KEY" $apiWaKey
    }

    $apiWaSecret = Get-EnvValue $apiEnv "WA_WEBHOOK_SECRET"
    if (-not [string]::IsNullOrWhiteSpace($apiWaSecret)) {
        Set-EnvValue $waEnv "WEBHOOK_SECRET" $apiWaSecret
    }
    Write-Success "  apps/whatsapp/.env: API_KEY & WEBHOOK_SECRET disinkronkan"

    # 3. apps/ppdb/.env
    $ppdbEnv = "apps/ppdb/.env"
    if (-not (Test-Path $ppdbEnv)) {
        $ppdbApiUrl = if ($AppEnvMode -eq "production") { "http://localhost:8080" } else { "http://localhost:8000" }
        [System.IO.File]::WriteAllText($ppdbEnv, "VITE_API_URL=$ppdbApiUrl`n", [System.Text.UTF8Encoding]::new($false))
        Write-Info "  apps/ppdb/.env dibuat"
    }
    Write-Success "  apps/ppdb/.env: OK"

    # 4. apps/superadmin/.env
    $saEnv = "apps/superadmin/.env"
    if (-not (Test-Path $saEnv)) {
        $saApiUrl = if ($AppEnvMode -eq "production") { "http://localhost:8080" } else { "http://localhost:8000" }
        [System.IO.File]::WriteAllText($saEnv, "VITE_API_URL=$saApiUrl`n", [System.Text.UTF8Encoding]::new($false))
        Write-Info "  apps/superadmin/.env dibuat"
    } else {
        # Hapus VITE_WA_API_KEY jika ada untuk keamanan
        $saContent = Get-Content $saEnv -Raw -Encoding UTF8
        if ($saContent -match "(?m)^VITE_WA_API_KEY=.*$") {
            $saContent = [regex]::Replace($saContent, "(?m)^VITE_WA_API_KEY=.*\r?\n?", "")
            [System.IO.File]::WriteAllText($saEnv, $saContent, [System.Text.UTF8Encoding]::new($false))
            Write-Warn "  apps/superadmin/.env: VITE_WA_API_KEY dihapus (keamanan — proxy via API backend)"
        }
    }
    Write-Success "  apps/superadmin/.env: OK"

    # 5. apps/companyprofile/.env
    $cpEnv = "apps/companyprofile/.env"
    if (-not (Test-Path $cpEnv)) {
        $cpApiUrl = if ($AppEnvMode -eq "production") { "http://localhost:8080" } else { "http://localhost:8000" }
        $cpContent = "NEXT_PUBLIC_API_URL=$cpApiUrl`nNEXT_PUBLIC_FALLBACK_API_URL=`nNEXT_PUBLIC_PORTAL_URL=http://localhost:5174`n"
        [System.IO.File]::WriteAllText($cpEnv, $cpContent, [System.Text.UTF8Encoding]::new($false))
        Write-Info "  apps/companyprofile/.env dibuat"
    }
    Write-Success "  apps/companyprofile/.env: OK"
}

# ── Mode: Docker ─────────────────────────────────────────────
function Invoke-ModeDocker {
    Write-Info "Menjalankan mode: Docker Compose"
    $null = Test-Prerequisites "docker"

    Setup-EnvFiles "production"

    Write-Info "Build & jalankan Docker Compose stack..."
    docker compose up -d --build
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Gagal menjalankan docker compose up."
        exit $LASTEXITCODE
    }

    Write-Success "Docker stack berhasil berjalan!"
    Write-Host ""
    Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  PTDARRAHMAN PPDB — Docker Stack Siap!" -ForegroundColor Green
    Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Company Profile:  http://localhost:3000"
    Write-Host "  Panel Superadmin: http://localhost:5173"
    Write-Host "  Portal PPDB:      http://localhost:5174"
    Write-Host "  Core API:         http://localhost:8080"
    Write-Host "  API Docs:         http://localhost:8080/scalar"
    Write-Host ""
    Write-Host "  Cek status:  docker compose ps"
    Write-Host "  Lihat logs:  docker compose logs -f [service]"
    Write-Host "  Stop:        docker compose down"
    Write-Host ""
}

# ── Mode: Local ──────────────────────────────────────────────
function Invoke-ModeLocal {
    Write-Info "Menjalankan mode: Local Dev (Host Dev)"
    $pythonCmd = Test-Prerequisites "local"

    Setup-EnvFiles "development"

    Write-Info "Menginstal dependensi monorepo (pnpm)..."
    pnpm install

    Write-Info "Menginstal dependensi WhatsApp service (npm)..."
    Push-Location "apps/whatsapp"
    try { npm install } finally { Pop-Location }

    Write-Info "Menginstal dependensi Python API..."
    Push-Location "apps/api"
    try {
        & $pythonCmd -m pip install -r requirements.txt
    } catch {
        Write-Warn "Gagal install requirements Python secara otomatis. Pastikan pip tersedia."
    } finally {
        Pop-Location
    }

    Write-Info "Menjalankan database migration (Alembic)..."
    Push-Location "apps/api"
    try {
        & $pythonCmd -m alembic upgrade head
        Write-Success "Alembic migration selesai"
    } catch {
        Write-Warn "Alembic migration belum bisa dijalankan (pastikan database lokal aktif)."
    } finally {
        Pop-Location
    }

    Write-Info "Menjalankan seed database (Admin & Roles)..."
    Push-Location "apps/api"
    try {
        & $pythonCmd scripts/seed.py
        Write-Success "Seed database selesai"
    } catch {
        Write-Warn "Seed database belum bisa dijalankan."
    } finally {
        Pop-Location
    }

    Write-Host ""
    Write-Host "Layanan dev siap dijalankan!" -ForegroundColor Cyan
    Write-Host "Untuk menjalankan seluruh frontend & backend secara bersamaan di terminal berbeda:" -ForegroundColor White
    Write-Host "  Terminal 1 (API):      cd apps/api; $pythonCmd -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload"
    Write-Host "  Terminal 2 (WhatsApp): cd apps/whatsapp; npm run dev"
    Write-Host "  Terminal 3 (Frontend): pnpm dev"
    Write-Host ""
    Write-Host "Membuka dev frontend (pnpm dev) sekarang..." -ForegroundColor Green
    pnpm dev
}

# ── Entry Point ──────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     PTDARRAHMAN PPDB — One-Command Setup (Windows)       ║" -ForegroundColor Cyan
Write-Host "║     Pesantren Tahfidz Qur'an dan Digital Ar-Rahman       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

if ([string]::IsNullOrWhiteSpace($Mode)) {
    Write-Host "Pilih mode:"
    Write-Host "  [1] docker  -> Build & jalankan seluruh stack via Docker Compose"
    Write-Host "  [2] local   -> Siapkan dependensi, database & dev di host"
    Write-Host ""
    $choice = Read-Host "Pilih mode (1/2 atau docker/local)"
    if ($choice -eq "1" -or $choice -eq "docker" -or $choice -eq "d") {
        $Mode = "docker"
    } elseif ($choice -eq "2" -or $choice -eq "local" -or $choice -eq "l") {
        $Mode = "local"
    } else {
        Write-Err "Pilihan tidak valid: '$choice'. Dibatalkan."
        exit 1
    }
}

switch ($Mode.ToLower()) {
    { $_ -in @("docker", "d") } { Invoke-ModeDocker }
    { $_ -in @("local", "l") }  { Invoke-ModeLocal }
    { $_ -in @("help", "h") }   {
        Write-Host "Penggunaan: .\setup.ps1 [docker|local]"
        exit 0
    }
    default {
        Write-Err "Mode tidak dikenal: '$Mode'. Gunakan 'docker' atau 'local'."
        exit 1
    }
}
