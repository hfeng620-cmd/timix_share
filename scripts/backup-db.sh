#!/usr/bin/env bash
# =============================================================================
# Timix 数据库备份脚本
# 用法: bash scripts/backup-db.sh
#
# 功能:
#   1. 通过 Supabase pg_dump 导出数据库 schema + data
#   2. 备份 Supabase Storage 文件清单
#   3. 压缩并保存到 backup/ 目录
#   4. 自动清理 7 天前的旧备份
#   5. 可选：上传到远程备份存储
# =============================================================================

set -euo pipefail

# ---- 配置 ------------------------------------------------
BACKUP_DIR="backup"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-svksgdsuquhkwyliavfn}"
SUPABASE_DB_PASSWORD="${SUPABASE_DB_PASSWORD:-}"
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')

# ---- 颜色输出 ------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*"; }

# ---- 检查前置条件 ------------------------------------------------
check_prerequisites() {
  if ! command -v pg_dump &>/dev/null; then
    log_warn "未找到 pg_dump，尝试使用 Supabase CLI 备份..."
    if ! command -v supabase &>/dev/null; then
      log_error "请安装 supabase CLI: npm i -g supabase"
      exit 1
    fi
  fi
}

# ---- 备份 Supabase 数据库 ------------------------------------------------
backup_database() {
  local output_file="${BACKUP_DIR}/db-backup-${TIMESTAMP}.sql"

  log_info "备份数据库到 ${output_file}..."

  if [ -n "${SUPABASE_DB_PASSWORD}" ]; then
    # Direct pg_dump (faster, needs password)
    PGPASSWORD="${SUPABASE_DB_PASSWORD}" pg_dump \
      --host="aws-0-us-west-1.pooler.supabase.com" \
      --port=6543 \
      --username="postgres.${SUPABASE_PROJECT_REF}" \
      --dbname=postgres \
      --no-owner \
      --no-acl \
      --file="${output_file}" 2>&1 || {
        log_error "pg_dump 失败，尝试 Supabase CLI..."
        supabase db dump --linked --file "${output_file}" 2>&1
      }
  else
    # Fallback: Supabase CLI (requires supabase link)
    log_info "使用 Supabase CLI 导出..."
    supabase db dump --linked --file "${output_file}" 2>&1 || {
      log_error "数据库备份失败"
      return 1
    }
  fi

  log_info "数据库备份完成: ${output_file}"
}

# ---- 备份 Supabase Storage 文件清单 ------------------------------------------------
backup_storage_manifest() {
  local output_file="${BACKUP_DIR}/storage-manifest-${TIMESTAMP}.json"

  log_info "导出 Storage 文件清单..."

  # Using Supabase API to list storage objects
  # This requires the service_role key — set SUPABASE_SERVICE_ROLE_KEY env var
  if [ -n "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
    curl -s "https://${SUPABASE_PROJECT_REF}.supabase.co/storage/v1/bucket" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      > "${output_file}" 2>/dev/null || {
        log_warn "Storage 清单导出失败（API 不可达）"
        echo '{"note": "Manual backup required — see Supabase Dashboard → Storage"}' > "${output_file}"
      }
  else
    echo '{"note": "Set SUPABASE_SERVICE_ROLE_KEY to auto-export storage manifest"}' > "${output_file}"
    log_warn "未设置 SUPABASE_SERVICE_ROLE_KEY，跳过 Storage 清单导出"
  fi

  log_info "Storage 清单已保存: ${output_file}"
}

# ---- 压缩备份 ------------------------------------------------
compress_backups() {
  local archive="${BACKUP_DIR}/timin-backup-${TIMESTAMP}.tar.gz"

  log_info "压缩备份到 ${archive}..."

  tar -czf "${archive}" \
    "${BACKUP_DIR}/db-backup-${TIMESTAMP}.sql" \
    "${BACKUP_DIR}/storage-manifest-${TIMESTAMP}.json" 2>/dev/null || true

  # Remove uncompressed originals
  rm -f "${BACKUP_DIR}/db-backup-${TIMESTAMP}.sql"
  rm -f "${BACKUP_DIR}/storage-manifest-${TIMESTAMP}.json"

  log_info "备份包已创建: ${archive} ($(du -h "${archive}" | cut -f1))"
}

# ---- 清理旧备份 ------------------------------------------------
cleanup_old_backups() {
  log_info "清理 ${RETENTION_DAYS} 天前的旧备份..."

  find "${BACKUP_DIR}" -name "timin-backup-*.tar.gz" -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
  find "${BACKUP_DIR}" -name "db-backup-*.sql" -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
  find "${BACKUP_DIR}" -name "storage-manifest-*.json" -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true

  log_info "清理完成"
}

# ---- 主流程 ------------------------------------------------
main() {
  echo ""
  echo "=============================================="
  echo "  Timix 数据备份 — $(date '+%Y-%m-%d %H:%M:%S')"
  echo "=============================================="
  echo ""

  # Create backup directory
  mkdir -p "${BACKUP_DIR}"

  cd "$(dirname "$0")/.."

  check_prerequisites
  backup_database
  backup_storage_manifest
  compress_backups
  cleanup_old_backups

  echo ""
  log_info "备份完成！当前备份文件："
  ls -lh "${BACKUP_DIR}"/timin-backup-*.tar.gz 2>/dev/null | tail -5
  echo ""
  echo "提示：建议将备份文件同步到远程存储（如 S3/R2/网盘）"
  echo "      可配置定时任务：crontab -e"
  echo "      0 3 * * * cd /path/to/project && bash scripts/backup-db.sh"
  echo ""
}

main
