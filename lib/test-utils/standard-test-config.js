/**
 * Standardized Test Configuration
 *
 * All local tests should use port 3010 for consistency
 * This configuration ensures reproducible testing across all agents
 */

const TEST_CONFIG = {
  // Standard test port for all local development tests
  port: 3010,

  // Base URL for API tests
  baseUrl: 'http://localhost:3010',

  // Standard timeouts
  timeout: {
    request: 5000,  // 5 seconds for individual requests
    server: 30000,  // 30 seconds for server startup
  },

  // Helper to ensure port is free
  async ensurePortFree() {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    try {
      // Kill any process on port 3010
      await execAsync(`lsof -ti:3010 | xargs kill -9 2>/dev/null`);
      console.log(`✅ Port 3010 cleared for testing`);
    } catch {
      // Port was already free
      console.log(`✅ Port 3010 is available`);
    }
  },

  // Helper to start dev server on port 3010
  async startDevServer() {
    const { spawn } = require('child_process');

    // Ensure port is free first
    await this.ensurePortFree();

    // Start server with PORT environment variable
    const server = spawn('npm', ['run', 'dev'], {
      env: { ...process.env, PORT: '3010' },
      cwd: process.cwd(),
      stdio: 'pipe'
    });

    // Wait for server to be ready
    return new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => {
        server.kill();
        reject(new Error('Server failed to start within timeout'));
      }, this.timeout.server);

      server.stdout.on('data', (data) => {
        output += data.toString();
        if (output.includes('Ready') || output.includes('started')) {
          clearTimeout(timeout);
          resolve(server);
        }
      });

      server.stderr.on('data', (data) => {
        console.error(`Server error: ${data}`);
      });

      server.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  },

  // Helper to make test requests
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: AbortSignal.timeout(this.timeout.request),
      });

      const responseTime = Date.now() - startTime;
      const data = await response.json().catch(() => null);

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        data,
        responseTime,
        headers: Object.fromEntries(response.headers),
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        error: error.message,
        responseTime: Date.now() - startTime,
      };
    }
  },
};

module.exports = TEST_CONFIG;

// Example usage:
if (require.main === module) {
  (async () => {
    console.log('🧪 Standard Test Configuration Example');
    console.log('=======================================');
    console.log(`Test Port: ${TEST_CONFIG.port}`);
    console.log(`Base URL: ${TEST_CONFIG.baseUrl}`);
    console.log('');

    // Ensure port is free
    await TEST_CONFIG.ensurePortFree();

    console.log('✨ Ready for testing on port 3010');
    console.log('');
    console.log('Usage in test files:');
    console.log("  const TEST = require('./lib/test-utils/standard-test-config');");
    console.log('  const result = await TEST.makeRequest("/api/contracts");');
  })();
}