import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './test/e2e',
  
  // Timeout за един тест
  timeout: 30000,
  
  // Fail при първия error (за да видиш веднага какво не работи)
  fullyParallel: false,
  
  // Retry при fail (0 = no retry, за да видиш истинския fail веднага)
  retries: 0,
  
  // Само 1 worker (sequential execution за ясност)
  workers: 1,
  
  // Reporter - подробен output в конзолата
  reporter: [
    ['list'], // Показва всеки тест като list
    ['html', { open: 'never' }] // HTML report (виж с: npm run test:report)
  ],
  
  use: {
    // Base URL
    baseURL: 'http://localhost:8000',
    
    // Screenshot само при fail
    screenshot: 'only-on-failure',
    
    // Video само при fail
    video: 'retain-on-failure',
    
    // Trace само при fail (за debug)
    trace: 'retain-on-failure',
    
    // Browser options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  
  // Web server (автоматично стартира за тестовете)
  webServer: {
    command: 'python -m http.server 8000',
    port: 8000,
    reuseExistingServer: true,
    timeout: 10000,
  },
  
  // Browser configurations
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Uncomment за да тестваш на таблет viewport
    // {
    //   name: 'tablet',
    //   use: { ...devices['iPad Pro'] },
    // },
  ],
});
