#!/bin/bash
# render-deploy.sh - Script to be used on Render server

echo "=== Render deployment script starting ==="

# Ensure we're in the right directory
cd /opt/render/project/src

# Install server dependencies
echo "=== Installing server dependencies ==="
cd server
npm install

# Check if we're on deploy branch (Render should clone the deploy branch)
echo "=== Current branch and status ==="
git branch
git status

# The frontend should already be built in server/public from the deploy branch
if [ -d "public" ]; then
    echo "=== Frontend build found in server/public ==="
    ls -la public/
else
    echo "=== WARNING: No frontend build found in server/public ==="
    echo "Make sure you ran the deploy script locally first!"
fi

# Start the server
echo "=== Starting server ==="
npm start
