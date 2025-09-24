#!/bin/bash

# Database Backup Script for Service Layer Migration
# Creates a complete backup of the PostgreSQL database before migration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔄 Starting database backup for service layer migration...${NC}"

# Get current timestamp for backup filename
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_DIR="backups"
BACKUP_FILE="arqcashflow_backup_${TIMESTAMP}.sql"

# Create backups directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL environment variable is not set${NC}"
    echo "Please set DATABASE_URL in your .env file"
    exit 1
fi

# Extract database connection details from DATABASE_URL
# Format: postgresql://user:password@host/database
DB_URL_REGEX="postgresql://([^:]+):([^@]+)@([^/]+)/(.+)"

if [[ $DATABASE_URL =~ $DB_URL_REGEX ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASS="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_NAME="${BASH_REMATCH[4]}"
else
    echo -e "${RED}❌ ERROR: Invalid DATABASE_URL format${NC}"
    echo "Expected format: postgresql://user:password@host/database"
    exit 1
fi

# Remove SSL and other parameters from host
DB_HOST=$(echo "$DB_HOST" | cut -d'?' -f1)

echo -e "${YELLOW}📊 Database connection details:${NC}"
echo "Host: $DB_HOST"
echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Backup file: $BACKUP_DIR/$BACKUP_FILE"

# Set password for pg_dump
export PGPASSWORD="$DB_PASS"

# Create the backup
echo -e "${YELLOW}🔽 Creating database backup...${NC}"

if pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" --verbose --clean --if-exists --create > "$BACKUP_DIR/$BACKUP_FILE"; then
    echo -e "${GREEN}✅ Database backup completed successfully!${NC}"
    echo -e "${GREEN}📁 Backup saved to: $BACKUP_DIR/$BACKUP_FILE${NC}"

    # Get backup file size
    BACKUP_SIZE=$(ls -lh "$BACKUP_DIR/$BACKUP_FILE" | awk '{print $5}')
    echo -e "${GREEN}📏 Backup size: $BACKUP_SIZE${NC}"

    # Verify backup file is not empty
    if [ -s "$BACKUP_DIR/$BACKUP_FILE" ]; then
        echo -e "${GREEN}✅ Backup file verification: OK (file is not empty)${NC}"
    else
        echo -e "${RED}❌ WARNING: Backup file appears to be empty!${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ ERROR: Database backup failed!${NC}"
    exit 1
fi

# Clean up password environment variable
unset PGPASSWORD

echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Verify backup integrity by checking the file contents"
echo "2. Test restore process in development environment (optional)"
echo "3. Enable USE_SERVICE_LAYER=true to begin Phase 1 testing"
echo "4. Monitor /api/monitoring/health for error rates"

echo -e "${GREEN}🎉 Database backup completed successfully!${NC}"
echo -e "${GREEN}Ready to proceed with service layer migration Phase 1.${NC}"