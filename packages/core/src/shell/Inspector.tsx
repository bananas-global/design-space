/**
 * Painel de contexto: regras, critérios, acessibilidade e diagnóstico.
 *
 * É aqui que o ambiente para de ser um protótipo bonito e passa a ser
 * especificação. A aba de acessibilidade existe no mesmo nível das outras de
 * propósito — se ela fosse a última aba, seria auditoria de fim de projeto com
 * outro nome.
 */

import { useState } from "react";
import type { Registry } from "../registry/index.js";
import type { AccessibleNode } from "../a11y/accessible-tree.js";
import { checkContrastPairs } from "../a11y/contrast.js";
import type { ControlsState, Scenario } from "../types/index.js";
import { KEYBOARD_LABELS, NETWORK_LABELS, STATUS_LABELS, STATUS_MEANING } from "./labels.js";

type Tab = "scenario" | "a11y" | "diagnostics";

export type InspectorProps = {
  registry: Registry;
  scenario: Scenario | undefined;
  controls: ControlsState;
  focusedNode: AccessibleNode | undefined;
  tabStopCount: number;
};

export function Inspector({
  registry,
  scenario,
  controls,
  focusedNode,
  tabStopCount,
}: InspectorProps) {
  const [tab, setTab] = useState<Tab>("scenario");
  const errorCount = registry.issues.filter((issue) => issue.level === "error").length;

  return (
    <aside className="ds-chrome ds-inspector" aria-label="Painel de contexto">
      <div className="ds-inspector__tabs" role="tablist">
        <TabButton id="scenario" current={tab} onSelect={setTab}>
          Cenário
        </TabButton>
        <TabButton id="a11y" current={tab} onSelect={setTab}>
          Acessibilidade
        </TabButton>
        <TabButton id="diagnostics" current={tab} onSelect={setTab}>
          {errorCount > 0 ? `Diagnóstico (${errorCount})` : "Diagnóstico"}
        </TabButton>
      </div>

      <div className="ds-inspector__body" role="tabpanel">
        {tab === "scenario" && (
          <ScenarioPanel registry={registry} scenario={scenario} controls={controls} />
        )}
        {tab === "a11y" && (
          <A11yPanel
            registry={registry}
            scenario={scenario}
            focusedNode={focusedNode}
            keyboardMode={controls.keyboardMode}
            tabStopCount={tabStopCount}
          />
        )}
        {tab === "diagnostics" && <DiagnosticsPanel registry={registry} />}
      </div>
    </aside>
  );
}

function TabButton({
  id,
  current,
  onSelect,
  children,
}: {
  id: Tab;
  current: Tab;
  onSelect: (tab: Tab) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={current === id}
      onClick={() => onSelect(id)}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Cenário
 * ------------------------------------------------------------------ */

function ScenarioPanel({
  registry,
  scenario,
  controls,
}: {
  registry: Registry;
  scenario: Scenario | undefined;
  controls: ControlsState;
}) {
  if (!scenario) {
    return (
      <p className="ds-block">
        Nenhum cenário ativo. Escolha uma situação na navegação para ver contexto, regras e
        critérios.
      </p>
    );
  }

  const persona = registry.persona(controls.persona ?? scenario.persona);
  const permissions = controls.persona
    ? (registry.persona(controls.persona)?.permissions ?? [])
    : registry.permissionsOf(scenario);
  const rules = registry.rulesOf(scenario);
  const fixture = registry.fixture(controls.fixture ?? scenario.fixture);

  // Persona trocada pelo controle sem estar declarada no cenário é exatamente o
  // caso "e se um perfil sem permissão abrir esta tela?" — vale sinalizar, para
  // que a captura de tela não seja lida como o cenário canônico.
  const personaOverridden = Boolean(controls.persona && controls.persona !== scenario.persona);

  return (
    <>
      <div className="ds-block">
        <h2 className="ds-block__title">Situação</h2>
        <p style={{ color: "var(--ds-fg)", fontSize: 14, fontWeight: 600 }}>{scenario.title}</p>
        {scenario.intent && <p>{scenario.intent}</p>}
        <div className="ds-chips">
          <span className="ds-chip" data-tone={statusTone(scenario.status)}>
            {STATUS_LABELS[scenario.status]}
          </span>
          {(scenario.tags ?? []).map((tag) => (
            <span className="ds-chip" key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <p style={{ marginTop: 6 }}>{STATUS_MEANING[scenario.status]}</p>
      </div>

      <div className="ds-block">
        <h2 className="ds-block__title">Reprodução</h2>
        <dl className="ds-kv">
          <dt>Id</dt>
          <dd style={{ fontFamily: "var(--ds-mono)", fontSize: 11 }}>{scenario.id}</dd>
          <dt>Rota</dt>
          <dd style={{ fontFamily: "var(--ds-mono)", fontSize: 11 }}>{scenario.route}</dd>
          <dt>Persona</dt>
          <dd>
            {persona?.name ?? "—"}
            {personaOverridden && (
              <span className="ds-chip" data-tone="warn" style={{ marginLeft: 6 }}>
                trocada
              </span>
            )}
          </dd>
          <dt>Dados</dt>
          <dd>{fixture?.label ?? "—"}</dd>
          <dt>Rede</dt>
          <dd>{NETWORK_LABELS[controls.network]}</dd>
        </dl>
        {persona?.goal && <p style={{ marginTop: 8 }}>Objetivo: {persona.goal}</p>}
      </div>

      {permissions.length > 0 && (
        <div className="ds-block">
          <h2 className="ds-block__title">Permissões efetivas</h2>
          <div className="ds-chips">
            {permissions.map((permission) => (
              <span className="ds-chip" key={permission}>
                {permission}
              </span>
            ))}
          </div>
        </div>
      )}

      {scenario.preconditions?.length ? (
        <div className="ds-block">
          <h2 className="ds-block__title">Pré-condições</h2>
          <ul className="ds-list">
            {scenario.preconditions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {rules.length > 0 && (
        <div className="ds-block">
          <h2 className="ds-block__title">Regras</h2>
          {rules.map((rule) => (
            <div className="ds-rule" key={rule.id}>
              <span className="ds-rule__id">{rule.id}</span>
              <span className="ds-rule__statement">{rule.statement}</span>
              {rule.rationale && <p className="ds-rule__rationale">{rule.rationale}</p>}
            </div>
          ))}
        </div>
      )}

      {scenario.actions?.length ? (
        <div className="ds-block">
          <h2 className="ds-block__title">Ações disponíveis</h2>
          <ul className="ds-list">
            {scenario.actions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {scenario.expected?.length ? (
        <div className="ds-block">
          <h2 className="ds-block__title">Critérios de aceite</h2>
          <ul className="ds-list">
            {scenario.expected.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {scenario.approvedAt && (
        <div className="ds-block">
          <h2 className="ds-block__title">Aprovação</h2>
          <p>
            {scenario.approvedAt.date} · <code>{scenario.approvedAt.commit.slice(0, 7)}</code>
          </p>
          <a href={scenario.approvedAt.url} target="_blank" rel="noreferrer">
            Abrir a versão aprovada
          </a>
        </div>
      )}

      {scenario.ticket && (
        <div className="ds-block">
          <h2 className="ds-block__title">Engenharia</h2>
          <p>{scenario.ticket}</p>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Acessibilidade
 * ------------------------------------------------------------------ */

function A11yPanel({
  registry,
  scenario,
  focusedNode,
  keyboardMode,
  tabStopCount,
}: {
  registry: Registry;
  scenario: Scenario | undefined;
  focusedNode: AccessibleNode | undefined;
  keyboardMode: boolean;
  tabStopCount: number;
}) {
  const contrast = checkContrastPairs(registry.product.theme?.contrastPairs);
  const failing = contrast.filter((result) => result.passes !== true);

  return (
    <>
      {scenario && (
        <div className="ds-block">
          <h2 className="ds-block__title">Contrato do cenário</h2>
          <dl className="ds-kv">
            <dt>Teclado</dt>
            <dd>{KEYBOARD_LABELS[scenario.a11y.keyboard]}</dd>
            <dt>Contraste</dt>
            <dd>WCAG 2.2 {scenario.a11y.contrast}</dd>
          </dl>
          {scenario.a11y.announces?.length ? (
            <>
              <p style={{ marginTop: 8 }}>Precisa ser anunciado:</p>
              <div className="ds-chips">
                {scenario.a11y.announces.map((event) => (
                  <span className="ds-chip" key={event}>
                    {event}
                  </span>
                ))}
              </div>
            </>
          ) : null}
          {scenario.a11y.notes && <p style={{ marginTop: 8 }}>{scenario.a11y.notes}</p>}
        </div>
      )}

      <div className="ds-block">
        <h2 className="ds-block__title">Elemento em foco</h2>
        {!keyboardMode ? (
          <p>Ligue o modo teclado na barra de controles para inspecionar a árvore acessível.</p>
        ) : !focusedNode ? (
          <p>
            Pressione Tab dentro do palco. {tabStopCount} paradas de tabulação foram encontradas.
          </p>
        ) : (
          <>
            <dl className="ds-kv">
              <dt>Papel</dt>
              <dd>{focusedNode.role}</dd>
              <dt>Nome</dt>
              <dd>
                {focusedNode.name ? (
                  focusedNode.name
                ) : (
                  <span style={{ color: "var(--ds-err)" }}>sem nome acessível</span>
                )}
              </dd>
              <dt>Nome vem de</dt>
              <dd>{focusedNode.nameFrom}</dd>
              {focusedNode.description ? (
                <>
                  <dt>Descrição</dt>
                  <dd>{focusedNode.description}</dd>
                </>
              ) : null}
              <dt>Seletor</dt>
              <dd style={{ fontFamily: "var(--ds-mono)", fontSize: 11 }}>
                {focusedNode.selector}
              </dd>
            </dl>
            {focusedNode.states.length > 0 && (
              <div className="ds-chips" style={{ marginTop: 8 }}>
                {focusedNode.states.map((state) => (
                  <span className="ds-chip" key={state}>
                    {state}
                  </span>
                ))}
              </div>
            )}
            {focusedNode.hiddenFromAssistiveTech && (
              <p className="ds-note" style={{ marginTop: 8 }}>
                Este elemento é focável mas está escondido de tecnologia assistiva. Um leitor de
                tela recebe foco sem receber conteúdo.
              </p>
            )}
            <p style={{ marginTop: 8 }}>{tabStopCount} paradas de tabulação no palco.</p>
          </>
        )}
      </div>

      <div className="ds-block">
        <h2 className="ds-block__title">Contraste dos tokens</h2>
        {contrast.length === 0 ? (
          <p>
            O produto não declarou pares de contraste em <code>theme.contrastPairs</code>. Contraste
            é propriedade de par de cores: declarar aqui valida na origem, uma vez.
          </p>
        ) : (
          <table className="ds-contrast">
            <thead>
              <tr>
                <th scope="col">Par</th>
                <th scope="col">Razão</th>
              </tr>
            </thead>
            <tbody>
              {contrast.map((result) => (
                <tr key={result.pair.name}>
                  <td>
                    <span
                      className="ds-swatch"
                      style={{ background: result.pair.background }}
                      aria-hidden="true"
                    />
                    <span
                      className="ds-swatch"
                      style={{ background: result.pair.foreground }}
                      aria-hidden="true"
                    />
                    {result.pair.name}
                  </td>
                  <td
                    style={{
                      color:
                        result.passes === true
                          ? "var(--ds-ok)"
                          : result.passes === false
                            ? "var(--ds-err)"
                            : "var(--ds-warn)",
                    }}
                  >
                    {result.label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {failing.length > 0 && (
          <p className="ds-note" style={{ marginTop: 8 }}>
            {failing.length} {failing.length === 1 ? "par" : "pares"} fora do alvo. O teste de
            tokens do produto falha o build por isso.
          </p>
        )}
      </div>

      <p className="ds-note">
        Verificação automática é piso, não teto. Ordem de leitura confusa, rótulo tecnicamente
        presente mas sem sentido e fluxo impossível de completar com leitor de tela passam no axe.
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Diagnóstico
 * ------------------------------------------------------------------ */

function DiagnosticsPanel({ registry }: { registry: Registry }) {
  const coverage = registry.coverage();
  const { issues } = registry;

  return (
    <>
      <div className="ds-block">
        <h2 className="ds-block__title">Cobertura por status</h2>
        <dl className="ds-kv">
          {Object.entries(coverage)
            .filter(([, count]) => count > 0)
            .map(([status, count]) => (
              <div key={status} style={{ display: "contents" }}>
                <dt>{STATUS_LABELS[status as keyof typeof STATUS_LABELS]}</dt>
                <dd style={{ fontVariantNumeric: "tabular-nums" }}>{count}</dd>
              </div>
            ))}
        </dl>
        <p style={{ marginTop: 8 }}>{registry.product.scenarios.length} cenários registrados.</p>
      </div>

      <div className="ds-block">
        <h2 className="ds-block__title">Contrato de cenário</h2>
        {issues.length === 0 ? (
          <p>Nenhum problema encontrado.</p>
        ) : (
          issues.map((issue, index) => (
            <div className="ds-issue" data-level={issue.level} key={`${issue.where}-${index}`}>
              <span className="ds-issue__where">{issue.where}</span>
              {issue.message}
            </div>
          ))
        )}
      </div>
    </>
  );
}

function statusTone(status: Scenario["status"]): string | undefined {
  if (status === "approved" || status === "implemented") return "ok";
  if (status === "in-review" || status === "proposed") return "warn";
  return undefined;
}
