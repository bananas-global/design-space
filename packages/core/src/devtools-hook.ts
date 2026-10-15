/**
 * Entrypoint `@brucesantos/design-space/devtools-hook`.
 *
 * Instala o gancho do React DevTools antes de o `react-dom` carregar, para o
 * "Destacar componentes" encontrar sozinho os componentes do catálogo. Precisa
 * ser o primeiro `import` do ponto de entrada do produto; sem ele, o destaque
 * contorna só a marcação manual `data-ds-component`. Ver a decisão 0017.
 */

import { installDevtoolsHook } from "./fiber/hook.js";

installDevtoolsHook();
