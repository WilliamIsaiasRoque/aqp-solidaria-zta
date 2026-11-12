import { useQuery } from "@tanstack/react-query";
import { fetchMyDonations } from "../services/api.js";

/**
 * HU-07 — Ver historial propio (MVP). CA-07.1: solo las donaciones del `sub` autenticado (el
 * backend ya filtra por propietario; aquí solo se muestran), con fecha, importe, proyecto y
 * estado.
 */
export function MyDonations({ accessToken }: { accessToken: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["my-donations"],
    queryFn: () => fetchMyDonations(accessToken),
  });

  if (isLoading) {
    return (
      <p className="loading-state" role="status">
        Cargando historial…
      </p>
    );
  }

  if (isError) {
    return (
      <p className="notice-card" role="alert">
        No se pudo cargar tu historial de donaciones.
      </p>
    );
  }

  const donations = data ?? [];

  if (donations.length === 0) {
    return (
      <div className="empty-panel" data-testid="empty-donations">
        <div className="empty-icon" aria-hidden="true">
          ✳
        </div>
        <h3>Tu historia empieza aquí</h3>
        <p>Todavía no registraste ninguna donación.</p>
      </div>
    );
  }

  return (
    <ul className="donation-list" aria-label="Mis donaciones">
      {donations.map((donation) => (
        <li key={donation.donationId}>
          <p>Fecha: {new Date(donation.createdAt).toLocaleDateString()}</p>
          <p>Proyecto: {donation.projectId}</p>
          <p>Importe: S/ {(donation.amountCents / 100).toFixed(2)}</p>
          <p>Estado: {donation.status}</p>
          {donation.status !== "PENDIENTE_SIMULACION" && (
            <p className="simulation-note">
              «Simulación académica: no se ha realizado ningún cobro».
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
