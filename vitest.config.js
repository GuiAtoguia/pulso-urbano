// e2e/ tem seus próprios testes (Playwright, rodados via `npx playwright test`),
// não os testes unitários que o Vitest cobre — exclui pra não tentar rodar os dois juntos.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', 'e2e/**'],
  },
});
