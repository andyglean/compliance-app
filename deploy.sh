#!/bin/bash
set -e

echo "=== Travis Ranch Compliance App - Deploy Script ==="
echo ""

APP_DIR="/opt/compliance-app"
REPO_URL="${1:-}"

if [ -z "$REPO_URL" ]; then
  echo "Usage: ./deploy.sh <git-repo-url>"
  echo "Example: ./deploy.sh https://github.com/youruser/compliance-app.git"
  exit 1
fi

echo "1. Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

echo "2. Installing Docker if not present..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "   Docker installed."
else
  echo "   Docker already installed."
fi

if ! command -v docker compose &> /dev/null; then
  apt-get install -y -qq docker-compose-plugin
fi

echo "3. Cloning/updating repository..."
if [ -d "$APP_DIR" ]; then
  cd "$APP_DIR"
  git pull origin main
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

echo "4. Setting up environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "   *** IMPORTANT: Edit $APP_DIR/.env with your real API keys ***"
  echo "   Then re-run this script or run: docker compose up -d --build"
  echo ""
fi

echo "5. Setting up database..."
mkdir -p /opt/compliance-data
if [ ! -f /opt/compliance-data/dev.db ]; then
  touch /opt/compliance-data/dev.db
fi

echo "6. Building and starting application..."
docker compose down 2>/dev/null || true
docker compose up -d --build

echo "7. Running database migrations..."
sleep 5
docker compose exec app npx prisma db push 2>/dev/null || echo "   Migration will run on first request"

echo ""
echo "=== Deployment complete! ==="
echo "App is running at: http://$(curl -s ifconfig.me):3000"
echo ""
echo "Next steps:"
echo "  1. Edit $APP_DIR/.env with your Twilio, OpenAI, and other API keys"
echo "  2. Run: cd $APP_DIR && docker compose up -d --build"
echo "  3. (Optional) Set up a domain and SSL with: ./setup-ssl.sh yourdomain.com"
