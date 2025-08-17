#!/bin/bash

# Crypto Automation Worker Deployment Script
# This script deploys the worker to Cloudflare Workers

set -e  # Exit on any error

echo "🚀 Starting deployment of Crypto Automation Worker..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler CLI is not installed"
    echo "Please install it with: npm install -g wrangler"
    exit 1
fi

# Check if we're logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "❌ Error: Not logged in to Cloudflare"
    echo "Please run: wrangler login"
    exit 1
fi

# Build the project
echo "📦 Building project..."
npm run build


# Deploy to Cloudflare Workers
echo "🚀 Deploying to Cloudflare Workers..."
wrangler deploy

echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Set your environment variables:"
echo "   wrangler secret put GEMINI_API_KEY"
echo "   wrangler secret put THENEWSAPI_KEY"
echo "   wrangler secret put TELEGRAM_BOT_TOKEN"
echo "   wrangler secret put TELEGRAM_CHAT_ID"
echo ""
echo "2. Test the deployment:"
echo "   curl https://crypto-automation.your-subdomain.workers.dev/health"
echo ""
echo "3. Manual run:"
echo "   curl -X POST https://crypto-automation.your-subdomain.workers.dev/run"
echo ""
echo "4. Monitor logs:"
echo "   wrangler tail"
