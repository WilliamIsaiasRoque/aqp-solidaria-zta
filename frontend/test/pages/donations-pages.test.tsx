// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DonationForm } from "../../src/pages/DonationForm.js";
import { MyDonations } from "../../src/pages/MyDonations.js";
import * as api from "../../src/services/api.js";

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("DonationForm — HU-05", () => {
  it("registra la donación con un amountCents válido y muestra la confirmación (CA-05.1)", async () => {
    const createSpy = vi
      .spyOn(api, "createDonation")
      .mockResolvedValue({
        donationId: "d-1",
        projectId: "p-1",
        donorSub: "donor-1",
        amountCents: 1000,
        currency: "PEN",
        status: "PENDIENTE_SIMULACION",
        createdAt: new Date().toISOString(),
      });

    renderWithQuery(<DonationForm accessToken="token" projectId="p-1" />);

    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /donar/i }));

    expect(await screen.findByText(/pendiente_simulacion/i)).toBeTruthy();
    expect(createSpy).toHaveBeenCalledWith("token", { projectId: "p-1", amountCents: 1000 });
  });

  it("rechaza un monto inválido sin llamar a createDonation (CA-05.2)", async () => {
    const createSpy = vi.spyOn(api, "createDonation");

    renderWithQuery(<DonationForm accessToken="token" projectId="p-1" />);

    fireEvent.change(screen.getByLabelText(/monto/i), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /donar/i }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it("nunca solicita datos de tarjeta, CVV o cuenta bancaria (CA-05.5)", () => {
    renderWithQuery(<DonationForm accessToken="token" projectId="p-1" />);

    expect(screen.queryByLabelText(/tarjeta|cvv|cuenta bancaria|dni/i)).toBeNull();
  });
});

describe("MyDonations — HU-07", () => {
  it("muestra solo el historial propio con fecha, importe, proyecto y estado (CA-07.1)", async () => {
    vi.spyOn(api, "fetchMyDonations").mockResolvedValue([
      {
        donationId: "d-1",
        projectId: "p-1",
        donorSub: "donor-1",
        amountCents: 1000,
        currency: "PEN",
        status: "PENDIENTE_SIMULACION",
        createdAt: "2026-11-09T00:00:00.000Z",
      },
    ]);

    renderWithQuery(<MyDonations accessToken="token" />);

    expect(await screen.findByText(/p-1/)).toBeTruthy();
    expect(screen.getByText(/10\.00/)).toBeTruthy();
    expect(screen.getByText(/PENDIENTE_SIMULACION/)).toBeTruthy();
  });

  it("muestra un estado vacío cuando el donante no tiene donaciones", async () => {
    vi.spyOn(api, "fetchMyDonations").mockResolvedValue([]);

    renderWithQuery(<MyDonations accessToken="token" />);

    expect(await screen.findByTestId("empty-donations")).toBeTruthy();
  });
});
