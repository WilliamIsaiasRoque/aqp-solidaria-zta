// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/App.js";
import { useAuth } from "../src/auth/AuthProvider.js";
import * as api from "../src/services/api.js";

vi.mock("../src/auth/AuthProvider.js", () => ({ useAuth: vi.fn() }));

const login = vi.fn(async () => undefined);
const finishLogin = vi.fn(async () => undefined);
const logout = vi.fn(async () => undefined);

function renderRoute(route: string, authenticated = false, groups: string[] = []) {
  vi.mocked(useAuth).mockReturnValue({
    user: authenticated
      ? ({ access_token: "test-token" } as ReturnType<typeof useAuth>["user"])
      : null,
    groups,
    login,
    finishLogin,
    logout,
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={client}>
        <App />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("Rutas de la SPA", () => {
  it("muestra el estado real del catálogo público sin sesión", async () => {
    vi.spyOn(api, "fetchProjects").mockResolvedValue([]);
    renderRoute("/proyectos");
    expect(await screen.findByTestId("empty-state")).toHaveTextContent(
      /todavía no hay proyectos publicados/i,
    );
    expect(screen.getByRole("button", { name: /ingresar/i })).toBeVisible();
  });

  it("solicita sesión para la gestión", () => {
    renderRoute("/gestionar");
    expect(screen.getByText(/ingresa para continuar/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /crear proyecto/i })).toBeNull();
  });

  it("inicia Code + PKCE desde el botón de ingreso", () => {
    renderRoute("/");
    fireEvent.click(screen.getByRole("button", { name: /ingresar/i }));
    expect(login).toHaveBeenCalledTimes(1);
  });

  it("mantiene la guardia de interfaz por rol en gestión", async () => {
    renderRoute("/gestionar", true, ["DONANTE"]);
    expect(await screen.findByRole("alert")).toHaveTextContent(/solo para gestores/i);
  });

  it("procesa callback y navega al catálogo", async () => {
    vi.spyOn(api, "fetchProjects").mockResolvedValue([]);
    renderRoute("/callback");
    expect(await screen.findByText(/proyectos para transformar/i)).toBeVisible();
    expect(finishLogin).toHaveBeenCalledTimes(1);
  });

  it("explica el fallo de callback sin revelar datos técnicos", async () => {
    finishLogin.mockRejectedValueOnce(new Error("invalid_grant"));
    renderRoute("/callback");
    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo completar el ingreso/i);
    expect(screen.queryByText(/invalid_grant/i)).toBeNull();
  });
});
