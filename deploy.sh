#!/bin/bash

# Volume505 Site Info Deployment Script
# This script sets up the server for www.volume505.com

set -e

echo "🚀 Starting Volume505 Site Info deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js and npm
print_status "Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
print_status "Installing PM2 process manager..."
sudo npm install -g pm2

# Install Nginx
print_status "Installing Nginx..."
sudo apt install -y nginx

# Install Certbot for SSL certificates
print_status "Installing Certbot for SSL certificates..."
sudo apt install -y certbot python3-certbot-nginx

# Create application directory
APP_DIR="/var/www/volume505-site-info"
print_status "Creating application directory: $APP_DIR"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

# Copy application files
print_status "Copying application files..."
cp -r . $APP_DIR/
cd $APP_DIR

# Install dependencies
print_status "Installing Node.js dependencies..."
npm install --production

# Create logs directory
mkdir -p logs

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    print_warning "Creating .env file from template..."
    cp env.example .env
    print_warning "Please edit .env file with your actual configuration values"
fi

# Configure Nginx
print_status "Configuring Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/volume505-site-info
sudo ln -sf /etc/nginx/sites-available/volume505-site-info /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
print_status "Testing Nginx configuration..."
sudo nginx -t

# Start the application with PM2
print_status "Starting application with PM2..."
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Reload Nginx
print_status "Reloading Nginx..."
sudo systemctl reload nginx

# Enable Nginx and PM2 to start on boot
print_status "Enabling services to start on boot..."
sudo systemctl enable nginx

# SSL Certificate setup
print_status "Setting up SSL certificates..."
print_warning "Make sure your domain www.volume505.com points to this server's IP address"
print_warning "Run the following command to obtain SSL certificates:"
echo "sudo certbot --nginx -d www.volume505.com -d volume505.com"

# Final status check
print_status "Deployment completed!"
print_status "Application URL: https://www.volume505.com"
print_status "Health check: https://www.volume505.com/health"
print_status "PM2 status: pm2 status"
print_status "PM2 logs: pm2 logs volume505-site-info"

echo ""
print_warning "Next steps:"
echo "1. Edit .env file with your Perplexity API key"
echo "2. Run: sudo certbot --nginx -d www.volume505.com -d volume505.com"
echo "3. Test the application at https://www.volume505.com" 