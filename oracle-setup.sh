#!/bin/bash
# Run this once on a fresh Oracle Cloud Ubuntu VM
# Usage: bash oracle-setup.sh

set -e

echo "=== 1. Update system ==="
sudo apt-get update && sudo apt-get upgrade -y

echo "=== 2. Install Docker ==="
curl -fsSL https://get.docker.com | sudo bash
sudo usermod -aG docker $USER

echo "=== 3. Open port 80 in Ubuntu firewall ==="
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo netfilter-persistent save

echo "=== 4. Install git ==="
sudo apt-get install -y git

echo ""
echo "================================================================"
echo "  Setup complete. Now run the following commands:"
echo "================================================================"
echo ""
echo "  newgrp docker   # or log out and back in"
echo ""
echo "  git clone https://github.com/YOUR_USERNAME/client-dashboard.git"
echo "  cd client-dashboard"
echo "  cp .env.example .env"
echo "  nano .env        # fill in your secret values"
echo "  docker compose up -d --build"
echo ""
echo "  Then open http://YOUR_SERVER_IP in your browser."
echo "================================================================"
