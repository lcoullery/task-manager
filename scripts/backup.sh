#!/bin/bash
BACKUP_DIR=/home/ubuntu/backups
DATA_DIR=/home/ubuntu/task-manager/data
DATE=$(date +%Y%m%d-%H%M%S)
TMPDB="$BACKUP_DIR/tmp-$DATE.db"

# Dump propre de la DB (atomic, safe avec WAL)
sqlite3 "$DATA_DIR/taskmanager.db" ".backup '$TMPDB'"

# Archive DB uniquement
tar -czf "$BACKUP_DIR/tasks-$DATE.tar.gz" -C "$BACKUP_DIR" "tmp-$DATE.db"

rm -f "$TMPDB"

# Garder uniquement les 30 derniers backups DB
ls -t "$BACKUP_DIR"/tasks-*.tar.gz | tail -n +31 | xargs -r rm

# Sync incrémental des images (pas de suppression — les images ne changent jamais)
mkdir -p "$BACKUP_DIR/images"
rsync -a "$DATA_DIR/images/" "$BACKUP_DIR/images/"

echo "$(date): Backup completed -> tasks-$DATE.tar.gz" >> "$BACKUP_DIR/backup.log"
