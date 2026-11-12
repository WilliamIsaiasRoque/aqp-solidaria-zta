import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";

export function AuthCallback() {
  const { finishLogin } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void finishLogin()
      .then(() => navigate("/proyectos", { replace: true }))
      .catch(() => setError(true));
  }, [finishLogin, navigate]);

  return (
    <div className="container inner-page">
      <div className="notice-card" role={error ? "alert" : "status"}>
        {error
          ? "No se pudo completar el ingreso. Vuelve a intentarlo."
          : "Verificando tu identidad…"}
      </div>
    </div>
  );
}
