#!/bin/bash

# Crypto Automation Cloudflare Worker Deployment Script
# This script helps you deploy the worker with all necessary configuration

set -e

echo "🚀 Crypto Automation Cloudflare Worker Deployment"
echo "=================================================="

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI is not installed. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if user is logged in
if ! wrangler whoami &> /dev/null; then
    echo "❌ You are not logged in to Cloudflare. Please run:"
    echo "wrangler login"
    exit 1
fi

echo "✅ Wrangler CLI is ready"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if secrets are already set
echo "🔐 Checking environment variables..."

# Function to check if secret exists
check_secret() {
    local secret_name=$1
    if wrangler secret list 2>/dev/null | grep -q "$secret_name"; then
        echo "✅ $secret_name is already set"
        return 0
    else
        echo "❌ $secret_name is not set"
        return 1
    fi
}

# Check required secrets
required_secrets=("GEMINI_API_KEY" "NEWSAPI_KEY" "TELEGRAM_BOT_TOKEN" "TELEGRAM_CHAT_ID")
missing_secrets=()

for secret in "${required_secrets[@]}"; do
    if ! check_secret "$secret"; then
        missing_secrets+=("$secret")
    fi
done

# Prompt for missing secrets
if [ ${#missing_secrets[@]} -gt 0 ]; then
    echo ""
    echo "⚠️  The following required secrets are missing:"
    printf '%s\n' "${missing_secrets[@]}"
    echo ""
    echo "Please set them using:"
    echo "wrangler secret put SECRET_NAME"
    echo ""
    echo "Or run this script again after setting them manually."
    exit 1
fi

# Deploy to staging first
echo "🚀 Deploying to staging environment..."
wrangler deploy --env staging

echo "✅ Staging deployment complete!"
echo ""
echo "🧪 Test the staging deployment:"
echo "Health check: curl https://crypto-automation-staging.your-subdomain.workers.dev/health"
echo "Manual run: curl -X POST https://crypto-automation-staging.your-subdomain.workers.dev/run"
echo ""
echo "If everything looks good, deploy to production with:"
echo "npm run deploy:production"
echo ""
echo "🎉 Setup complete! Your worker will run automatically every 8 hours."
