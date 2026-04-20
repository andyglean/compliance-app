#!/bin/bash
set -e

DOMAIN="${1:-}"

if [ -z "$DOMAIN" ]; then
  echo "Usage: ./setup-ssl.sh yourdomain.com"
  echo "Example: ./setup-ssl.sh compliance.travisranchlife.com"
  exit 1
fi

echo "=== Setting up Nginx + SSL for $DOMAIN ==="

echo "1. Installing Nginx and Certbot..."
apt-get update -qq
apt-get install -y -qq nginx certbot python3-certbot-nginx

echo "2. Creating Nginx config..."
cat > /etc/nginx/sites-available/compliance-app << EOF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/compliance-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx

echo "3. Obtaining SSL certificate..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@"$DOMAIN" || {
  echo ""
  echo "SSL certificate request failed."
  echo "Make sure your DNS A record points $DOMAIN to this server's IP: $(curl -s ifconfig.me)"
  echo "Then re-run: certbot --nginx -d $DOMAIN"
  exit 1
}

echo "4. Setting up auto-renewal..."
systemctl enable certbot.timer

echo ""
echo "=== SSL setup complete! ==="
echo "App is now available at: https://$DOMAIN"
