/**
 * Camada de adapters (§7).
 *
 * A UI do produto nunca depende diretamente de um backend. O mesmo cenário pode
 * ser alimentado por fixture, REST, GraphQL ou staging sem alterar a composição
 * visual — e o padrão é sempre fixture (D-05).
 */

import type { DataRequest, DataSourceAdapter, Fixture } from "../types/index.js";

/** Latência simulada do estado `slow`, em ms. Longa o bastante para revelar
 * skeleton mal desenhado, curta o bastante para não irritar em revisão. */
export const SLOW_NETWORK_DELAY_MS = 2500;

/** Erro lançado quando o estado de rede é `error`. Nomeado para o produto poder
 * distinguir falha simulada de bug real. */
export class SimulatedNetworkError extends Error {
  constructor(scenarioId: string) {
    super(`Falha de rede simulada no cenário "${scenarioId}".`);
    this.name = "SimulatedNetworkError";
  }
}

/** Resolve `data` de uma fixture, aceitando valor puro ou factory pura. */
export function resolveFixture<T>(fixture: Fixture<T> | undefined): T | undefined {
  if (!fixture) return undefined;
  return typeof fixture.data === "function" ? (fixture.data as () => T)() : fixture.data;
}

/**
 * Adapter padrão. Materializa o estado de rede do cenário sem que o produto
 * precise escrever `if (loading)` de mentira em cada tela:
 *
 * - `success` devolve a fixture;
 * - `empty` devolve `null`, e a tela decide como é o seu vazio;
 * - `error` rejeita com {@link SimulatedNetworkError};
 * - `slow` atrasa e depois devolve a fixture;
 * - `loading` nunca resolve, congelando a tela no estado de carregamento.
 */
export const fixtureAdapter: DataSourceAdapter = {
  id: "fixtures",
  label: "Fixtures",
  load: async ({ scenario, fixture, network }: DataRequest) => {
    switch (network) {
      case "empty":
        return null;

      case "error":
        throw new SimulatedNetworkError(scenario.id);

      case "loading":
        // Promessa que nunca resolve: é o único jeito honesto de manter a tela
        // no estado de carregamento para revisão, sem um flag falso na UI.
        return new Promise(() => {});

      case "slow":
        await delay(SLOW_NETWORK_DELAY_MS);
        return resolveFixture(fixture);

      case "success":
      default:
        return resolveFixture(fixture);
    }
  },
};

/**
 * Constrói um adapter HTTP a partir de uma URL base. Entra apenas quando reduz
 * trabalho real, nunca como pré-requisito de existência do ambiente — e a
 * fixture continua como fallback para o preview seguir determinístico.
 */
export function createHttpAdapter(options: {
  id: string;
  label: string;
  baseUrl: string;
  /** Caminho por cenário. Padrão: a própria `scenario.route`. */
  path?: (request: DataRequest) => string;
  init?: RequestInit;
  /** Cai para a fixture quando a requisição falhar. Padrão: `true`. */
  fallbackToFixture?: boolean;
}): DataSourceAdapter {
  const { id, label, baseUrl, path, init, fallbackToFixture = true } = options;

  return {
    id,
    label,
    load: async (request) => {
      const target = new URL(path ? path(request) : request.scenario.route, baseUrl);
      try {
        const response = await fetch(target, init);
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return await response.json();
      } catch (cause) {
        if (fallbackToFixture) return resolveFixture(request.fixture);
        throw new Error(`Adapter "${id}" falhou em ${target.toString()}`, { cause });
      }
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
