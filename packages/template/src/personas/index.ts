import type { Persona } from "@brucesantos/design-space";

/**
 * Personas do domínio.
 *
 * Persona não é avatar: é o papel que influencia objetivo, permissão e
 * linguagem. Se duas personas têm as mesmas permissões e o mesmo objetivo, elas
 * são a mesma persona com dois nomes.
 */
export const personas: Persona[] = [
  {
    id: "requester",
    name: "Solicitante",
    goal: "Registrar uma solicitação e acompanhar o andamento.",
    permissions: ["requests.read", "requests.create"],
  },
  {
    id: "approver",
    name: "Aprovador",
    goal: "Decidir sobre solicitações pendentes sem abrir o sistema financeiro.",
    permissions: ["requests.read", "requests.approve", "requests.reject"],
  },
];
