/**
 * Resolução dos dados do cenário ativo pelo adapter selecionado.
 *
 * Fica no motor porque a promessa de determinismo é do ambiente, não do
 * produto: a mesma URL tem que produzir os mesmos dados, e a UI do produto não
 * deveria escrever a máquina de estados de carregamento, vazio e erro em cada
 * tela para conseguir isso.
 */

import { useEffect, useState } from "react";
import type { DataSourceAdapter, Fixture, NetworkState, Scenario } from "../types/index.js";
import { fixtureAdapter } from "./index.js";

export type ScenarioData = {
  data: unknown;
  isLoading: boolean;
  error: Error | undefined;
};

export function useScenarioData(options: {
  scenario: Scenario | undefined;
  fixture: Fixture | undefined;
  network: NetworkState;
  adapter: DataSourceAdapter | undefined;
}): ScenarioData {
  const { scenario, fixture, network, adapter } = options;
  const [state, setState] = useState<ScenarioData>({
    data: undefined,
    isLoading: Boolean(scenario),
    error: undefined,
  });

  useEffect(() => {
    if (!scenario) {
      setState({ data: undefined, isLoading: false, error: undefined });
      return;
    }

    let active = true;
    setState({ data: undefined, isLoading: true, error: undefined });

    const resolved = adapter ?? fixtureAdapter;

    void Promise.resolve(resolved.load({ scenario, fixture, network }))
      .then((data) => {
        // A guarda evita que uma troca rápida de cenário deixe os dados do
        // cenário anterior aparecerem — que seria um determinismo falso, e o
        // tipo de bug que só aparece em revisão com cliente.
        if (active) setState({ data, isLoading: false, error: undefined });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          data: undefined,
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });

    return () => {
      active = false;
    };
  }, [scenario, fixture, network, adapter]);

  return state;
}
