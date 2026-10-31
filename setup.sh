#!/usr/bin/env bash
# ============================================================
# PTDARRAHMAN — One-Command Project Setup
# ============================================================
# Skrip ini menyiapkan seluruh monorepo PPDB PTDARRAHMAN dalam
# satu perintah. Dua opsi tersedia:
#
#   ./setup.sh docker     → Build & jalankan seluruh stack via Docker
#   ./setup.sh local      → Jalankan frontend (Vite) + backend (FastAPI)
#                           langsung di host (tanpa Docker)
#
# Prasyarat otomatis diperiksa (Node, pnpm, Python, Docker).
# File .env disiapkan dari .env.example jika belum ada, dan
# secret yang hilang di-generate otomatis.
# ============================================================

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── Detect script root ──────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ============================================================
# Prasyarat
# ============================================================

check_cmd() {
    if ! command -v "$1" &>/dev/null; then
        return 1
    fi
    return 0
}

check_prerequisites() {
    local missing=()

    if ! check_cmd node; then
        missing+=("Node.js (v20+)")
    else
        local node_ver
        node_ver=$(node -v | sed 's/v//' | cut -d. -f1)
        if [ "$node_ver" -lt 20 ]; then
            warn "Node.js versi $(node -v) — disarankan v20+"
        fi
    fi

    if ! check_cmd pnpm; then
        missing+=("pnpm (npm install -g pnpm)")
    fi

    if ! check_cmd python3; then
        missing+=("Python 3.12+")
    fi

    if [ "${1:-}" = "docker" ] && ! check_cmd docker; then
        missing+=("Docker")
    fi

    if [ ${#missing[@]} -gt 0 ]; then
        error "Prasyarat belum terpenuhi:\n  ${missing[*]}\n\nInstall dulu lalu jalankan ulang skrip ini."
    fi
}

# ============================================================
# Generate random secret
# ============================================================
gen_secret() {
    python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || \
    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || \
    echo "CHANGE_ME_$(date +%s)_$(head -c 16 /dev/urandom | xxd -p)"
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
        # Cek apakah secret masih kosong / placeholder
        if ! grep -q "JWT_SECRET=" "$api_env" || \
           grep -q "JWT_SECRET=$" "$api_env" || \
           grep -q "JWT_SECRET=ganti_dengan" "$api_env"; then
            need_api=true
        fi
        if ! grep -q "PAKASIR_WEBHOOK_SECRET=" "$api_env"; then
            need_api=true
        fi
    fi

    if [ "$need_api" = true ]; then
        local jwt_secret cron_secret wa_api_key wa_webhook_secret

        # Ambil nilai yang sudah ada jika sudah ada (jangan timpa yang sudah diisi user)
        jwt_secret=$(grep "^JWT_SECRET=" "$api_env" 2>/dev/null | cut -d= -f2- || true)
        if [ -z "$jwt_secret" ] || [ "$jwt_secret" = "ganti_dengan_string_panjang_acak_minimal_32_karakter" ]; then
            jwt_secret=$(gen_secret)
        fi

        cron_secret=$(grep "^CRON_SECRET=" "$api_env" 2>/dev/null | cut -d= -f2- || true)
        if [ -z "$cron_secret" ] || [ "$cron_secret" = "ganti_dengan_string_panjang_acak_minimal_16_karakter" ]; then
            cron_secret=$(python3 -c "import secrets; print(secrets.token_hex(16))" 2>/dev/null || gen_secret)
        fi

        wa_api_key=$(grep "^WA_SERVICE_API_KEY=" "$api_env" 2>/dev/null | cut -d= -f2- || true)
        if [ -z "$wa_api_key" ]; then
            wa_api_key=$(gen_secret)
        fi

        wa_webhook_secret=$(grep "^WA_WEBHOOK_SECRET=" "$api_env" 2>/dev/null | cut -d= -f2- || true)
        if [ -z "$wa_webhook_secret" ]; then
            wa_webhook_secret=$(gen_secret)
        fi

        # Tulis / update file
        if [ ! -f "$api_env" ]; then
            cp "$api_example" "$api_env"
        fi

        # Update nilai dengan sed (portable)
        sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$jwt_secret|" "$api_env"
        sed -i "s|^CRON_SECRET=.*|CRON_SECRET=$cron_secret|" "$api_env"
        sed -i "s|^WA_SERVICE_API_KEY=.*|WA_SERVICE_API_KEY=$wa_api_key|" "$api_env"
        sed -i "s|^WA_WEBHOOK_SECRET=.*|WA_WEBHOOK_SECRET=$wa_webhook_secret|" "$api_env"

        # Set APP_ENV=development untuk local, production untuk docker
        if [ "${SETUP_MODE:-}" = "local" ]; then
            sed -i "s|^APP_ENV=.*|APP_ENV=development|" "$api_env"
        else
            sed -i "s|^APP_ENV=.*|APP_ENV=production|" "$api_env"
        fi

        success "  apps/api/.env: JWT_SECRET, CRON_SECRET, WA_SERVICE_API_KEY, WA_WEBHOOK_SECRET diisi"
    else
        success "  apps/api/.env: sudah lengkap"
    fi

    # ── apps/whatsapp/.env ──────────────────────────────────
    local wa_env="apps/whatsapp/.env"
    local wa_example="apps/whatsapp/.env.example"
    local wa_api_secret

    if [ ! -f "$wa_env" ]; then
        cp "$wa_example" "$wa_env"
        info "  apps/whatsapp/.env dibuat dari .env.example"
    fi

    # Sync API_KEY dengan apps/api/.env WA_SERVICE_API_KEY
    wa_api_key=$(grep "^WA_SERVICE_API_KEY=" "apps/api/.env" 2>/dev/null | cut -d= -f2- || true)
    if [ -n "$wa_api_key" ] && [ "$wa_api_key" != "ganti_dengan_string_panjang_acak_minimal_32_karakter" ]; then
        sed -i "s|^API_KEY=.*|API_KEY=$wa_api_key|" "$wa_env"
    fi

    # Sync WEBHOOK_SECRET dengan apps/api/.env WA_WEBHOOK_SECRET
    wa_webhook_secret=$(grep "^WA_WEBHOOK_SECRET=" "apps/api/.env" 2>/dev/null | cut -d= -f2- || true)
    if [ -n "$wa_webhook_secret" ]; then
        sed -i "s|^WEBHOOK_SECRET=.*|WEBHOOK_SECRET=$wa_webhook_secret|" "$wa_env"
    fi

    success "  apps/whatsapp/.env: API_KEY & WEBHOOK_SECRET disinkronisasi"

    # ── apps/ppdb/.env ──────────────────────────────────────
    local ppdb_env="apps/ppdb/.env"
    if [ ! -f "$ppdb_env" ]; then
        echo "VITE_API_URL=http://localhost:8000" > "$ppdb_env"
        info "  apps/ppdb/.env dibuat"
    fi
    success "  apps/ppdb/.env: OK"

    # ── apps/superadmin/.env ────────────────────────────────
    local sa_env="apps/superadmin/.env"
    if [ ! -f "$sa_env" ]; then
        cat > "$sa_env" << 'EOF'
VITE_API_URL=http://localhost:8000
EOF
        info "  apps/superadmin/.env dibuat (tanpa VITE_WA_API_KEY — proxy via API)"
    else
        # Hapus VITE_WA_API_KEY jika ada (keamanan: jangan expose WA API key ke client)
        if grep -q "VITE_WA_API_KEY" "$sa_env"; then
            sed -i '/^VITE_WA_API_KEY=/d' "$sa_env"
            warn "  apps/superadmin/.env: VITE_WA_API_KEY dihapus (keamanan — proxy via API backend)"
        fi
    fi
    success "  apps/superadmin/.env: OK"

    # ── apps/companyprofile/.env ────────────────────────────
    local cp_env="apps/companyprofile/.env"
    if [ ! -f "$cp_env" ]; then
        cat > "$cp_env" << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
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
    (cd apps/api && python3 -m alembic upgrade head 2>/dev/null || \
        warn "  Alembic migration belum bisa dijalankan — mungkin database belum tersedia")
    success "Alembic migration selesai"
}

# ============================================================
# Mode: Docker
# ============================================================
mode_docker() {
    info "Mode: Docker Compose"
    check_prerequisites docker

    setup_env_files

    info "Build & jalankan Docker Compose..."
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
    check_prerequisites
    export SETUP_MODE=local

    setup_env_files
    install_deps

    # Database migration (jangan fatal jika DB belum ada)
    run_migrations

    # Install Python dependencies
    info "Menginstal dependensi Python (API)..."
    (cd apps/api && pip install -r requirements.txt 2>/dev/null || \
        (cd apps/api && pip3 install -r requirements.txt) || \
        warn "  Tidak bisa install Python deps — pastikan pip tersedia")

    # Seed database dengan roles & admin default
    info "Menjalankan seed database..."
    (cd apps/api && python3 scripts/seed.py 2>/dev/null || \
        warn "  Seed belum bisa dijalankan — mungkin database belum tersedia")

    # ── Start backend (FastAPI) ──────────────────────────────
    info "Menjalankan FastAPI backend (port 8000)..."
    (cd apps/api && python3 -m uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload) &
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
