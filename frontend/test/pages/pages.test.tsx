// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Catalog } from "../../src/pages/Catalog.js";
import { ProjectDetail } from "../../src/pages/ProjectDetail.js";
import { ManageProjects } from "../../src/pages/ManageProjects.js";
import * as api from "../../src/services/api.js";

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Catalog — HU-01", () => {
  it("muestra nombre, finalidad, meta y suma confirmada de cada proyecto (CA-01.1)", async () => {
    vi.spyOn(api, "fetchProjects").mockResolvedValue([
      {
        projectId: "p-1",
        title: "Comedor comunitario",
        description: "Alimentación para 50 familias",
        goalAmountCents: 500000,
        confirmedAmountCents: 100000,
        currency: "PEN",
        status: "PUBLICADO",
      },
    ]);

    renderWithQuery(<Catalog />);

    expect(await screen.findByText("Comedor comunitario")).toBeTruthy();
    expect(screen.getByText(/Alimentación para 50 familias/)).toBeTruthy();
    expect(screen.getByText(/5000\.00/)).toBeTruthy();
    expect(screen.getByText(/1000\.00/)).toBeTruthy();
  });

  it("muestra un estado vacío comprensible sin proyectos publicados (CA-01.3)", async () => {
    vi.spyOn(api, "fetchProjects").mockResolvedValue([]);

    renderWithQuery(<Catalog />);

    expect(await screen.findByTestId("empty-state")).toBeTruthy();
  });
});

describe("ProjectDetail — HU-02", () => {
  it("muestra el detalle sin datos de donantes (CA-02.1)", async () => {
    vi.spyOn(api, "fetchProject").mockResolvedValue({
      projectId: "p-1",
      title: "Comedor comunitario",
      description: "Alimentación para 50 familias",
      goalAmountCents: 500000,
      confirmedAmountCents: 100000,
      currency: "PEN",
      status: "PUBLICADO",
    });

    renderWithQuery(<ProjectDetail projectId="p-1" />);

    expect(await screen.findByText("Comedor comunitario")).toBeTruthy();
    expect(screen.queryByText(/donorSub|donante/i)).toBeNull();
  });

  it("muestra 'no encontrado' cuando el proyecto no existe o no está publicado (CA-02.2)", async () => {
    vi.spyOn(api, "fetchProject").mockResolvedValue(null);

    renderWithQuery(<ProjectDetail projectId="inexistente" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/no encontrado/i);
  });
});

describe("ManageProjects — HU-08 (guardia de UX, no de seguridad)", () => {
  it("oculta el formulario a un usuario sin el grupo GESTOR", () => {
    renderWithQuery(
      <ManageProjects accessToken="token" groups={["DONANTE"]} />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/solo para gestores/i);
    expect(screen.queryByRole("button", { name: /crear proyecto/i })).toBeNull();
  });

  it("muestra el formulario de creación a un usuario GESTOR", () => {
    renderWithQuery(<ManageProjects accessToken="token" groups={["GESTOR"]} />);

    expect(screen.getByRole("button", { name: /crear proyecto/i })).toBeTruthy();
  });
});
