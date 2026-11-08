// Config do Playwright só para os testes de regressão visual/layout em e2e/.
// Separado do Vitest (que cobre js/ e scripts/) porque precisa de um motor de
// renderização real para medir larguras calculadas pelo CSS (algo que jsdom não faz).
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'npx http-server . -p 4173 -c-1 -s',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 20000,
  },
});
