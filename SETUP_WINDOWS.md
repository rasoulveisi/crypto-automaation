# Windows Setup Guide for Crypto Automation Worker

This guide is specifically for Windows users to set up the Cloudflare Worker.

## Prerequisites

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **Git** (optional but recommended)
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

## Setup Steps

### 1. Install Wrangler CLI

Open PowerShell or Command Prompt and run:

```powershell
npm install -g wrangler
```

### 2. Login to Cloudflare

```powershell
wrangler login
```

This will open your browser to authenticate with Cloudflare.

### 3. Install Project Dependencies

In your project directory:

```powershell
npm install
```

### 4. Set Environment Variables

You need to set these secrets using Wrangler. Run each command and enter the value when prompted:

```powershell
# Gemini API Key (for AI analysis)
wrangler secret put GEMINI_API_KEY

# NewsAPI Key (for crypto news)
wrangler secret put NEWSAPI_KEY

# Telegram Bot Token (from @BotFather)
wrangler secret put TELEGRAM_BOT_TOKEN

# Telegram Chat ID (where to send messages)
wrangler secret put TELEGRAM_CHAT_ID
```

### 5. Deploy to Staging

```powershell
npm run deploy:staging
```

### 6. Test the Deployment

```powershell
# Test health endpoint
curl https://crypto-automation-staging.your-subdomain.workers.dev/health

# Test manual run (this will trigger analysis and send to Telegram)
curl -X POST https://crypto-automation-staging.your-subdomain.workers.dev/run
```

### 7. Deploy to Production

If staging works correctly:

```powershell
npm run deploy:production
```

## Local Development

To test locally before deploying:

```powershell
# Start local development server
npm run dev

# In another terminal, test locally
npm run test:local
```

## Troubleshooting

### Common Windows Issues

1. **PowerShell Execution Policy**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **Node.js not found**
   - Make sure Node.js is installed and in your PATH
   - Restart your terminal after installation

3. **Wrangler not found**
   ```powershell
   npm install -g wrangler
   ```

4. **Permission denied**
   - Run PowerShell as Administrator if needed

### Getting API Keys

1. **Gemini API Key**
   - Go to https://aistudio.google.com/app/apikey
   - Create a new API key

2. **NewsAPI Key**
   - Go to https://newsapi.org/
   - Sign up for a free account
   - Get your API key

3. **Telegram Bot**
   - Message @BotFather on Telegram
   - Create a new bot with `/newbot`
   - Get the bot token
   - Add bot to your channel/group
   - Get chat ID by messaging @userinfobot

## Verification

After deployment, your worker will:

- ✅ Run automatically every 8 hours
- ✅ Send crypto analysis to your Telegram channel
- ✅ Respond to manual triggers via `/run` endpoint
- ✅ Provide health checks via `/health` endpoint

## Monitoring

Check your worker logs:

```powershell
wrangler tail
```

## Next Steps

1. Monitor the first few automated runs
2. Adjust analysis parameters if needed
3. Set up monitoring/alerting for failures
4. Consider setting up a backup worker

## Support

If you encounter issues:

1. Check the logs: `wrangler tail`
2. Verify all secrets are set: `wrangler secret list`
3. Test endpoints manually
4. Check Cloudflare Workers dashboard for errors
