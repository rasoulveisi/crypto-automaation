#!/usr/bin/env node

/**
 * Simple test script for the Crypto Automation Worker
 * Run this after deployment to verify everything works
 */

const https = require('https');
const http = require('http');

// Configuration - update these with your actual worker URL
const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8787';
const isLocal = WORKER_URL.includes('localhost');

const client = isLocal ? http : https;

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, WORKER_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || (isLocal ? 8787 : 443),
      path: url.pathname,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Crypto Automation Worker');
  console.log('===================================');
  console.log(`Worker URL: ${WORKER_URL}\n`);

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing health endpoint...');
    const health = await makeRequest('/health');
    if (health.status === 200 && health.data.ok) {
      console.log('✅ Health check passed');
    } else {
      console.log('❌ Health check failed:', health);
    }

    // Test 2: Manual Run (this will trigger the full analysis)
    console.log('\n2️⃣ Testing manual run endpoint...');
    console.log('⚠️  This will trigger the full analysis and send messages to Telegram');
    console.log('   Press Ctrl+C to cancel, or wait for the request to complete...');
    
    const run = await makeRequest('/run', 'POST');
    if (run.status === 200 && run.data.ok) {
      console.log('✅ Manual run completed successfully');
      console.log('📊 Analyzed coins:', run.data.coins);
    } else {
      console.log('❌ Manual run failed:', run);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Tests interrupted by user');
  process.exit(0);
});

// Run tests
runTests().catch(console.error);
