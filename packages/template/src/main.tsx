// Primeiro import, antes de qualquer React: instala o gancho do DevTools que o
// "Destacar componentes" usa para achar os componentes do catálogo na tela.
import "@brucesantos/design-space/devtools-hook";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DesignSpace } from "@brucesantos/design-space";
import "@brucesantos/design-space/styles.css";

import { productDefinition } from "./app/product.js";
import "./tokens/tokens.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DesignSpace product={productDefinition} />
  </StrictMode>,
);
