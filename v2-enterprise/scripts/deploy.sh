#!/usr/bin/env bash
# deploy.sh — رفع الكود للسيرفر وإعادة البناء
# الاستخدام: ./scripts/deploy.sh <ip>
# مثال:     ./scripts/deploy.sh 192.168.0.200

set -euo pipefail

SERVER_IP="${1:?يرجى تمرير IP السيرفر: ./scripts/deploy.sh 192.168.0.200}"
SERVER_USER="mustafa"
SERVER_PASS="Aldulimi99"
SERVER_DIR="/home/mustafa/can-management"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "▶ تحديث nginx.conf بـ IP الجديد: $SERVER_IP"
sed -i.bak "s/server_name localhost 127\.0\.0\.1 [0-9.]* _;/server_name localhost 127.0.0.1 $SERVER_IP _;/" \
  "$LOCAL_DIR/nginx/nginx.conf"
rm -f "$LOCAL_DIR/nginx/nginx.conf.bak"

echo "▶ إرسال الكود إلى $SERVER_IP ..."
sshpass -p "$SERVER_PASS" rsync -az --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='*.DS_Store' \
  --exclude='.claude' \
  "$LOCAL_DIR/" \
  "$SERVER_USER@$SERVER_IP:$SERVER_DIR/"

# إرسال .env بشكل منفصل (غير مشمول في rsync لأسباب أمنية عادةً)
sshpass -p "$SERVER_PASS" rsync -az \
  "$LOCAL_DIR/.env" \
  "$SERVER_USER@$SERVER_IP:$SERVER_DIR/.env"

echo "▶ بناء وتشغيل على السيرفر ..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" bash <<ENDSSH
  set -e
  cd $SERVER_DIR

  # كتابة متغير SERVER_URL للـ CORS
  export SERVER_URL=http://$SERVER_IP

  # بناء وتشغيل
  SERVER_URL=http://$SERVER_IP docker compose build
  SERVER_URL=http://$SERVER_IP docker compose up -d

  docker compose ps
ENDSSH

echo "✓ تم النشر بنجاح — http://$SERVER_IP"
