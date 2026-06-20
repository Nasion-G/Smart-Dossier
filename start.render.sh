#!/bin/bash
set -e

echo "=== Smart Dossier starting ==="

# Render sets PORT to the port they want us to listen on.
# We use nginx on :80, but if Render requires PORT, override nginx listen.
if [ -n "$PORT" ] && [ "$PORT" != "80" ]; then
    echo "Render assigned PORT=$PORT, overriding nginx listen"
    sed -i "s/listen 80;/listen $PORT;/" /etc/nginx/conf.d/default.conf
fi

# Remove default nginx site if it conflicts
rm -f /etc/nginx/sites-enabled/default

echo "Starting supervisord (nginx + uvicorn)..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
