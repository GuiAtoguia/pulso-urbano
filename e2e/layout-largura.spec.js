// Regressão: o conteúdo principal (.pu-demo-body) nunca pode ficar mais estreito
// do que o esperado nem perder a centralização em telas largas.
//
// Bug original: .pu-demo-body tinha `width:min(100%,1480px); margin:0 auto` ao
// mesmo tempo que um padding horizontal calculado a partir de 100vw (a mesma
// técnica de centralização já usada, sem esse width extra, em .pu-header e
// .pu-footer). As duas técnicas de centralização brigavam: a partir de ~1536px
// o padding já consumia toda a largura do box, e acima de ~2930px o padding
// sozinho passava da largura máxima, forçando o conteúdo a colapsar numa
// coluna estreita e desalinhada (ver css/style.css, regra .pu-demo-body).
import { test, expect } from '@playwright/test';

// Mesmos valores do CSS (ver `max(20px, calc((100vw - 1450px)/2))` em .pu-demo-body):
// 20px de respiro mínimo de cada lado, conteúdo nunca passa de 1450px.
const PADDING_MINIMO_TOTAL = 40;
const LARGURA_MAXIMA = 1450;

const LARGURAS = [320, 375, 768, 1024, 1280, 1366, 1440, 1480, 1536, 1920, 2000, 2560, 3440];
const TEMAS = ['light', 'dark'];

function larguraEsperada(viewport) {
  return Math.min(viewport - PADDING_MINIMO_TOTAL, LARGURA_MAXIMA);
}

for (const tema of TEMAS) {
  test.describe(`largura do conteúdo principal (tema ${tema})`, () => {
    for (const largura of LARGURAS) {
      test(`em ${largura}px, main ocupa >= 90% da largura útil e fica centralizado`, async ({ page }) => {
        await page.setViewportSize({ width: largura, height: 900 });
        await page.goto('/');
        await page.evaluate((t) => localStorage.setItem('pulso-urbano-tema', t), tema);
        await page.reload();
        await page.waitForSelector('.pu-demo-body');

        const medidas = await page.evaluate(() => {
          const main = document.querySelector('.pu-demo-body');
          const rect = main.getBoundingClientRect();
          const cs = getComputedStyle(main);
          return {
            left: rect.left,
            right: rect.right,
            outerWidth: rect.width,
            paddingLeft: parseFloat(cs.paddingLeft),
            paddingRight: parseFloat(cs.paddingRight),
            viewportWidth: window.innerWidth,
          };
        });

        const larguraConteudo = medidas.outerWidth - medidas.paddingLeft - medidas.paddingRight;
        const esperada = larguraEsperada(largura);
        const minimoAceitavel = esperada * 0.9;

        expect(
          larguraConteudo,
          `main com ${larguraConteudo.toFixed(0)}px de conteúdo, esperado pelo menos ${minimoAceitavel.toFixed(0)}px (90% de ${esperada.toFixed(0)}px) em viewport de ${largura}px`,
        ).toBeGreaterThanOrEqual(minimoAceitavel);

        // Centralizado: a folga à esquerda e à direita do box (fora do padding
        // em si) deve ser aproximadamente igual — nunca o conteúdo grudado numa
        // ponta como no bug original.
        const folgaEsquerda = medidas.left;
        const folgaDireita = medidas.viewportWidth - medidas.right;
        const diferenca = Math.abs(folgaEsquerda - folgaDireita);
        expect(
          diferenca,
          `main desalinhado: folga esquerda ${folgaEsquerda.toFixed(0)}px vs. direita ${folgaDireita.toFixed(0)}px em viewport de ${largura}px`,
        ).toBeLessThanOrEqual(2);

        // Nunca deve haver rolagem horizontal.
        const temRolagemHorizontal = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        );
        expect(temRolagemHorizontal, `rolagem horizontal em viewport de ${largura}px`).toBe(false);
      });
    }
  });
}
