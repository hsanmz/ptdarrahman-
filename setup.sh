#!/usr/bin/env bash
# ============================================================
# PTDARRAHMAN — One-Command Project Setup (Linux & macOS)
# ============================================================
# Skrip ini menyiapkan seluruh monorepo PPDB PTDARRAHMAN dalam
# satu perintah. Dua opsi tersedia:
#
#   ./setup.sh docker     → Build & jalankan seluruh stack via Docker
#   ./setup.sh local      → Jalankan frontend (Vite) + backend (FastAPI)
#                           langsung di host (tanpa Docker)
#
# Prasyarat otomatis diperiksa (Node, pnpm, Python, Docker).
# Kompatibel dengan seluruh distro Linux (Ubuntu, Debian, Arch,
# Fedora, Alpine, openSUSE) dan macOS.
# ============================================================

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Deteksi Root Direktori Dinamis ──────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Deteksi WSL Mount Warning (Performa) ────────────────────
if [ -n "${WSL_DISTRO_NAME:-}" ] || grep -qi microsoft /proc/version 2>/dev/null; then
    if [[ "$SCRIPT_DIR" == /mnt/* ]]; then
        warn "Terdeteksi dijalankan dari direktori mount Windows ($SCRIPT_DIR)."
        warn "I/O file di mount /mnt/c/ jauh lebih lambat untuk Docker & Node."
        info "Tips performa: Untuk kecepatan maksimal di WSL, clone ke ~/project-ppdb (ext4)."
        echo ""
    fi
fi

# ============================================================
# Deteksi Binary & Package Manager
# ============================================================

check_cmd() {
    command -v "$1" &>/dev/null
}

# Deteksi Python binary yang tersedia (python3 atau python)
PYTHON_BIN=""
if check_cmd python3; then
    PYTHON_BIN="python3"
elif check_cmd python; then
    # Pastikan ini Python 3
    if python -c "import sys; sys.exit(0 if sys.version_info[0] >= 3 else 1)" 2>/dev/null; then
        PYTHON_BIN="python"
    fi
fi

detect_pkg_hint() {
    local missing_tool="$1"
    if check_cmd apt-get; then
        echo "  Debian/Ubuntu: sudo apt update && sudo apt install -y $missing_tool"
    elif check_cmd pacman; then
        echo "  Arch Linux:    sudo pacman -S $missing_tool"
    elif check_cmd dnf; then
        echo "  Fedora/RHEL:   sudo dnf install -y $missing_tool"
    elif check_cmd apk; then
        echo "  Alpine Linux:  sudo apk add $missing_tool"
    elif check_cmd zypper; then
        echo "  openSUSE:      sudo zypper install -y $missing_tool"
    elif check_cmd brew; then
        echo "  macOS (Homebrew): brew install $missing_tool"
    fi
}

check_prerequisites() {
    local missing=()
    local hints=()

    if ! check_cmd node; then
        missing+=("Node.js (v20+)")
        hints+=("Node.js: kunjungi https://nodejs.org/ atau gunakan nvm / $(detect_pkg_hint nodejs)")
    else
        local node_ver
        node_ver=$(node -v | sed 's/v//' | cut -d. -f1)
        if [ "$node_ver" -lt 20 ]; then
            warn "Node.js versi $(node -v) — disarankan v20+"
        fi
    fi

    if ! check_cmd pnpm; then
        missing+=("pnpm")
        hints+=("pnpm: jalankan 'npm install -g pnpm' atau 'corepack enable'")
    fi

    if [ -z "$PYTHON_BIN" ]; then
        missing+=("Python 3.12+")
        hints+=("Python 3: $(detect_pkg_hint python3)")
    fi

    if [ "${1:-}" = "docker" ]; then
        if ! check_cmd docker; then
            missing+=("Docker")
            hints+=("Docker: kunjungi https://docs.docker.com/get-docker/")
        else
            # Cek apakah docker daemon aktif
            if ! docker info >/dev/null 2>&1; then
                warn "Docker CLI ditemukan, namun Docker Daemon belum aktif."
                if check_cmd systemctl; then
                    info "Coba jalankan: sudo systemctl start docker"
                fi
            fi
        fi
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        echo ""
        echo -e "${RED}[ERROR] Prasyarat belum terpenuhi:${NC}"
        for m in "${missing[@]}"; do
            echo "  - $m"
        done
        echo ""
        echo -e "${CYAN}Panduan instalasi:${NC}"
        for h in "${hints[@]}"; do
            echo "  * $h"
        done
        echo ""
        exit 1
    fi
}

# ============================================================
# Helper Manipulasi .env (Cross-Platform & Bebas Masalah Sed)
# ============================================================

# Generate cryptographically secure random secret
gen_secret() {
    local length="${1:-32}"
    if [ -n "$PYTHON_BIN" ]; then
        $PYTHON_BIN -c "import secrets; print(secrets.token_hex($length))" 2>/dev/null && return 0
    fi
    if check_cmd node; then
        node -e "console.log(require('crypto').randomBytes($length).toString('hex'))" 2>/dev/null && return 0
    fi
    if check_cmd openssl; then
        openssl rand -hex "$length" 2>/dev/null && return 0
    fi
    head -c "$length" /dev/urandom | od -An -tx1 | tr -d ' \n' 2>/dev/null || echo "SEC_$(date +%s)_RANDOM"
}

# Ambil nilai key dari file .env (menghilangkan \r jika file CRLF)
get_env_val() {
    local file="$1"
    local key="$2"
    if [ -f "$file" ]; then
        grep "^${key}=" "$file" 2>/dev/null | cut -d= -f2- | tr -d '\r' || true
    fi
}

# Set atau update nilai key di file .env secara portable (macOS/Linux aman dari beda 'sed -i')
set_env_val() {
    local file="$1"
    local key="$2"
    local val="$3"

    [ ! -f "$file" ] && return 0

    if [ -n "$PYTHON_BIN" ]; then
        $PYTHON_BIN -c "
import sys
p, k, v = sys.argv[1], sys.argv[2], sys.argv[3]
try:
    with open(p, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    found = False
    new_lines = []
    for line in lines:
        if line.startswith(k + '='):
            new_lines.append(f'{k}={v}\n')
            found = True
        else:
            new_lines.append(line)
    if not found:
        if new_lines and not new_lines[-1].endswith('\n'):
            new_lines[-1] += '\n'
        new_lines.append(f'{k}={v}\n')
    with open(p, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
except Exception:
    pass
" "$file" "$key" "$val" 2>/dev/null && return 0
    fi

    # Fallback Node.js jika Python belum siap
    if check_cmd node; then
        node -e "
const fs = require('fs');
const [,, p, k, v] = process.argv;
try {
    let c = fs.readFileSync(p, 'utf8');
    const regex = new RegExp('^' + k + '=.*$', 'm');
    if (regex.test(c)) {
        c = c.replace(regex, k + '=' + v);
    } else {
        c = c.trimEnd() + '\n' + k + '=' + v + '\n';
    }
    fs.writeFileSync(p, c, 'utf8');
} catch(e) {}
" "$file" "$key" "$val" 2>/dev/null && return 0
    fi

    # Fallback portable sed (buat file temp .bak lalu hapus)
    if grep -q "^${key}=" "$file"; then
        sed -i.bak "s|^${key}=.*|${key}=${val}|" "$file" 2>/dev/null && rm -f "${file}.bak"
    else
        echo "${key}=${val}" >> "$file"
    fi
}

# ============================================================
# Setup .env files
# ============================================================
setup_env_files() {
    info "Menyiapkan file .env..."

    # ── apps/api/.env ──────────────────────────────────────
    local api_env="apps/api/.env"
    local api_example="apps/api/.env.example"
    local need_api=false

    if [ ! -f "$api_env" ]; then
        cp "$api_example" "$api_env"
        need_api=true
        info "  apps/api/.env dibuat dari .env.example"
    else
        local existing_jwt
        existing_jwt=$(get_env_val "$api_env" "JWT_SECRET")
        if [ -z "$existing_jwt" ] || [[ "$existing_jwt" == *"ganti_dengan"* ]]; then
            need_api=true
        fi
        if ! grep -q "PAKASIR_WEBHOOK_SECRET=" "$api_env"; then
            need_api=true
        fi
    fi

    if [ "$need_api" = true ]; then
        local jwt_secret cron_secret wa_api_key wa_webhook_secret

        jwt_secret=$(get_env_val "$api_env" "JWT_SECRET")
        if [ -z "$jwt_secret" ] || [[ "$jwt_secret" == *"ganti_dengan"* ]]; then
            jwt_secret=$(gen_secret 32)
        fi

        cron_secret=$(get_env_val "$api_env" "CRON_SECRET")
        if [ -z "$cron_secret" ] || [[ "$cron_secret" == *"ganti_dengan"* ]]; then
            cron_secret=$(gen_secret 16)
        fi

        wa_api_key=$(get_env_val "$api_env" "WA_SERVICE_API_KEY")
        if [ -z "$wa_api_key" ] || [[ "$wa_api_key" == *"ganti_dengan"* ]]; then
            wa_api_key=$(gen_secret 32)
        fi

        wa_webhook_secret=$(get_env_val "$api_env" "WA_WEBHOOK_SECRET")
        if [ -z "$wa_webhook_secret" ] || [[ "$wa_webhook_secret" == *"ganti_dengan"* ]]; then
            wa_webhook_secret=$(gen_secret 32)
        fi

        set_env_val "$api_env" "JWT_SECRET" "$jwt_secret"
        set_env_val "$api_env" "CRON_SECRET" "$cron_secret"
        set_env_val "$api_env" "WA_SERVICE_API_KEY" "$wa_api_key"
        set_env_val "$api_env" "WA_WEBHOOK_SECRET" "$wa_webhook_secret"

        if [ "${SETUP_MODE:-}" = "local" ]; then
            set_env_val "$api_env" "APP_ENV" "development"
        else
            set_env_val "$api_env" "APP_ENV" "production"
        fi

        success "  apps/api/.env: Secrets otomatis diisi & diamankan"
    else
        success "  apps/api/.env: Sudah lengkap"
    fi

    # ── apps/whatsapp/.env ──────────────────────────────────
    local wa_env="apps/whatsapp/.env"
    local wa_example="apps/whatsapp/.env.example"

    if [ ! -f "$wa_env" ]; then
        cp "$wa_example" "$wa_env"
        info "  apps/whatsapp/.env dibuat dari .env.example"
    fi

    local sync_wa_key
    sync_wa_key=$(get_env_val "$api_env" "WA_SERVICE_API_KEY")
    if [ -n "$sync_wa_key" ] && [[ "$sync_wa_key" != *"ganti_dengan"* ]]; then
        set_env_val "$wa_env" "API_KEY" "$sync_wa_key"
    fi

    local sync_wa_secret
    sync_wa_secret=$(get_env_val "$api_env" "WA_WEBHOOK_SECRET")
    if [ -n "$sync_wa_secret" ] && [[ "$sync_wa_secret" != *"ganti_dengan"* ]]; then
        set_env_val "$wa_env" "WEBHOOK_SECRET" "$sync_wa_secret"
    fi

    success "  apps/whatsapp/.env: API_KEY & WEBHOOK_SECRET disinkronisasi"

    # ── apps/ppdb/.env ──────────────────────────────────────
    local ppdb_env="apps/ppdb/.env"
    if [ ! -f "$ppdb_env" ]; then
        local target_api_url="http://localhost:8000"
        [ "${SETUP_MODE:-}" = "docker" ] && target_api_url="http://localhost:8080"
        echo "VITE_API_URL=$target_api_url" > "$ppdb_env"
        info "  apps/ppdb/.env dibuat"
    fi
    success "  apps/ppdb/.env: OK"

    # ── apps/superadmin/.env ────────────────────────────────
    local sa_env="apps/superadmin/.env"
    if [ ! -f "$sa_env" ]; then
        local target_sa_url="http://localhost:8000"
        [ "${SETUP_MODE:-}" = "docker" ] && target_sa_url="http://localhost:8080"
        echo "VITE_API_URL=$target_sa_url" > "$sa_env"
        info "  apps/superadmin/.env dibuat"
    else
        # Hapus VITE_WA_API_KEY jika ada (keamanan: jangan expose WA API key ke client)
        if grep -q "VITE_WA_API_KEY" "$sa_env"; then
            set_env_val "$sa_env" "VITE_WA_API_KEY" ""
            # Gunakan python/node untuk hapus baris bersih jika ada
            if [ -n "$PYTHON_BIN" ]; then
                $PYTHON_BIN -c "
with open('$sa_env', 'r') as f: lines = f.readlines()
with open('$sa_env', 'w') as f:
    for l in lines:
        if not l.startswith('VITE_WA_API_KEY='): f.write(l)
" 2>/dev/null || true
            fi
            warn "  apps/superadmin/.env: VITE_WA_API_KEY dibersihkan (keamanan)"
        fi
    fi
    success "  apps/superadmin/.env: OK"

    # ── apps/companyprofile/.env ────────────────────────────
    local cp_env="apps/companyprofile/.env"
    if [ ! -f "$cp_env" ]; then
        local target_cp_url="http://localhost:8000"
        [ "${SETUP_MODE:-}" = "docker" ] && target_cp_url="http://localhost:8080"
        cat > "$cp_env" << EOF
NEXT_PUBLIC_API_URL=$target_cp_url
NEXT_PUBLIC_FALLBACK_API_URL=
NEXT_PUBLIC_PORTAL_URL=http://localhost:5174
EOF
        info "  apps/companyprofile/.env dibuat"
    fi
    success "  apps/companyprofile/.env: OK"
}

# ============================================================
# Install dependencies
# ============================================================
install_deps() {
    info "Menginstal dependensi monorepo (pnpm)..."
    pnpm install
    success "Dependensi monorepo terinstal"

    # WhatsApp service (npm standalone, bukan pnpm workspace)
    info "Menginstal dependensi WhatsApp service (npm)..."
    (cd apps/whatsapp && npm install)
    success "Dependensi WhatsApp terinstal"
}

# ============================================================
# Database migration
# ============================================================
run_migrations() {
    info "Menjalankan Alembic migration..."
    (cd apps/api && $PYTHON_BIN -m alembic upgrade head 2>/dev/null || \
        warn "  Alembic migration belum bisa dijalankan — mungkin database belum tersedia")
    success "Alembic migration selesai"
}

# ============================================================
# Mode: Docker
# ============================================================
mode_docker() {
    info "Mode: Docker Compose"
    export SETUP_MODE=docker
    check_prerequisites docker

    setup_env_files

    info "Build & jalankan Docker Compose stack..."
    docker compose up -d --build
    success "Docker stack berjalan!"

    echo ""
    echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  PTDARRAHMAN PPDB — Docker Stack siap!${NC}"
    echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "  Company Profile:  http://localhost:3000"
    echo "  Panel Superadmin: http://localhost:5173"
    echo "  Portal PPDB:      http://localhost:5174"
    echo "  Core API:          http://localhost:8080"
    echo "  API Docs:          http://localhost:8080/scalar"
    echo ""
    echo "  Cek status:  docker compose ps"
    echo "  Lihat logs:   docker compose logs -f [service]"
    echo "  Stop:         docker compose down"
    echo ""
}

# ============================================================
# Mode: Local Vite Dev (Host Dev)
# ============================================================
mode_local() {
    info "Mode: Local Vite Dev (Host Dev)"
    export SETUP_MODE=local
    check_prerequisites

    setup_env_files
    install_deps

    # Database migration (jangan fatal jika DB belum ada)
    run_migrations

    # Install Python dependencies
    info "Menginstal dependensi Python (API)..."
    (cd apps/api && $PYTHON_BIN -m pip install -r requirements.txt 2>/dev/null || \
        warn "  Tidak bisa install Python deps — pastikan pip tersedia")

    # Seed database dengan roles & admin default
    info "Menjalankan seed database..."
    (cd apps/api && $PYTHON_BIN scripts/seed.py 2>/dev/null || \
        warn "  Seed belum bisa dijalankan — mungkin database belum tersedia")

    # ── Start backend (FastAPI) ──────────────────────────────
    info "Menjalankan FastAPI backend (port 8000)..."
    (cd apps/api && $PYTHON_BIN -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload) &
    BACKEND_PID=$!
    success "  Backend PID: $BACKEND_PID (port 8000)"

    # ── Start WhatsApp service (opsional) ────────────────────
    info "Menjalankan WhatsApp service (port 3100)..."
    (cd apps/whatsapp && npm run dev) &
    WA_PID=$!
    success "  WhatsApp PID: $WA_PID (port 3100)"

    # ── Start frontend (pnpm dev via Turborepo) ──────────────
    info "Menjalankan frontend (pnpm dev)..."
    success "  PPDB:          http://localhost:5174"
    success "  Superadmin:   http://localhost:5173"
    success "  CompanyProfile: http://localhost:3000"

    # Trap untuk cleanup saat Ctrl+C
    trap "kill $BACKEND_PID $WA_PID 2>/dev/null; exit 0" INT TERM
    pnpm dev

    # Jika pnpm dev exit, kill background processes
    kill $BACKEND_PID $WA_PID 2>/dev/null || true
}

# ============================================================
# Main
# ============================================================
main() {
    local mode="${1:-}"

    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║     PTDARRAHMAN PPDB — One-Command Setup                  ║"
    echo "║     Pesantren Tahfidz Qur'an dan Digital Ar-Rahman       ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    if [ -z "$mode" ]; then
        echo "Pilih mode:"
        echo ""
        echo "  ./setup.sh docker   → Build & jalankan seluruh stack via Docker Compose"
        echo "  ./setup.sh local    → Jalankan frontend + backend di host (tanpa Docker)"
        echo ""
        read -rp "Pilih mode [docker/local]: " mode
    fi

    case "$mode" in
        docker|d)
            mode_docker
            ;;
        local|l)
            mode_local
            ;;
        *)
            error "Mode tidak dikenal: $mode\n\nPenggunaan: ./setup.sh [docker|local]"
            ;;
    esac
}

main "$@"
