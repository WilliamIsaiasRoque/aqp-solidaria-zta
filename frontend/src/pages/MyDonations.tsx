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
    return <p>Cargando historial…</p>;
  }

  if (isError) {
    return <p role="alert">No se pudo cargar tu historial de donaciones.</p>;
  }

  const donations = data ?? [];

  if (donations.length === 0) {
    return <p data-testid="empty-donations">Todavía no registraste ninguna donación.</p>;
  }

  return (
    <ul aria-label="Mis donaciones">
      {donations.map((donation) => (
        <li key={donation.donationId}>
          <p>Fecha: {new Date(donation.createdAt).toLocaleDateString()}</p>
          <p>Proyecto: {donation.projectId}</p>
          <p>Importe: S/ {(donation.amountCents / 100).toFixed(2)}</p>
          <p>Estado: {donation.status}</p>
        </li>
      ))}
    </ul>
  );
}
