#!/bin/bash

# Path to the project
PROJECT_DIR="/var/www/style-scan"
# Path to NVM node/npm
NODE_PATH="/home/marco/.nvm/versions/node/v22.19.0/bin"
export PATH="$NODE_PATH:$PATH"

cd "$PROJECT_DIR"

# Wait a few seconds for system services to be ready
sleep 60

echo "$(date): Starting style-scan server loop..." >> server.log

# Infinite loop to restart server if it crashes
while true; do
    echo "$(date): Launching npm run dev" >> server.log
    npm run dev >> server.log 2>&1
    echo "$(date): Server stopped with exit code $?. Restarting in 5 seconds..." >> server.log
    sleep 10
done
