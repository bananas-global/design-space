/**
 * Rótulos em português do vocabulário do motor.
 *
 * O motor é neutro quanto ao produto, não quanto ao idioma do time: quem opera
 * o Design Space é a Bananas e seus clientes. Rótulo de produto vem do produto;
 * rótulo de mecanismo vem daqui.
 */

import type { KeyboardCoverage, NetworkState, ScenarioStatus } from "../types/index.js";

export const STATUS_LABELS: Record<ScenarioStatus, string> = {
  proposed: "Proposta",
  "in-review": "Em revisão",
  approved: "Aprovado",
  "in-implementation": "Em implementação",
  implemented: "Implementado",
  superseded: "Superado",
};

export const STATUS_MEANING: Record<ScenarioStatus, string> = {
  proposed: "Exploração ainda não aprovada.",
  "in-review": "Aberto para validação de design, negócio ou cliente.",
  approved: "Referência autorizada, registrada por URL de commit.",
  "in-implementation": "Ligado a um trabalho ativo de engenharia.",
  implemented: "Disponível no produto real e validado.",
  superseded: "Mantido para histórico ou substituído por outra decisão.",
};

export const NETWORK_LABELS: Record<NetworkState, string> = {
  success: "Sucesso",
  loading: "Carregando",
  empty: "Vazio",
  error: "Erro",
  slow: "Lento",
};

export const KEYBOARD_LABELS: Record<KeyboardCoverage, string> = {
  full: "Jornada completável só por teclado",
  partial: "Parcialmente operável por teclado",
  "not-applicable": "Não se aplica",
};
