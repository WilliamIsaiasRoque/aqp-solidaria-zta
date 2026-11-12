import { lazy, Suspense, useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider.js";
import { Catalog } from "./pages/Catalog.js";
import { AuthCallback } from "./pages/AuthCallback.js";

const ProjectDetail = lazy(() =>
  import("./pages/ProjectDetail.js").then((module) => ({ default: module.ProjectDetail })),
);
const DonationForm = lazy(() =>
  import("./pages/DonationForm.js").then((module) => ({ default: module.DonationForm })),
);
const MyDonations = lazy(() =>
  import("./pages/MyDonations.js").then((module) => ({ default: module.MyDonations })),
);
const ManageProjects = lazy(() =>
  import("./pages/ManageProjects.js").then((module) => ({ default: module.ManageProjects })),
);

function Brand() {
  return (
    <Link className="brand" to="/" aria-label="AQP Solidaria, inicio">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span>
        AQP<span className="brand-second"> solidaria</span>
        <small>AREQUIPA · PERÚ</small>
      </span>
    </Link>
  );
}

function Header() {
  const { user, groups, login, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  async function handleLogout() {
    await logout();
    navigate("/logout");
  }
  return (
    <header className="site-header">
      <div className="header-inner container">
        <Brand />
        <button
          className="menu-toggle"
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
        </button>
        <nav
          className={open ? "site-nav is-open" : "site-nav"}
          aria-label="Navegación principal"
          onClick={() => setOpen(false)}
        >
          <NavLink to="/proyectos">Proyectos</NavLink>
          <a href="/#como-funciona">Cómo funciona</a>
          {user && groups.includes("DONANTE") && (
            <NavLink to="/mis-donaciones">Mis donaciones</NavLink>
          )}
          {user && groups.includes("GESTOR") && <NavLink to="/gestionar">Gestión</NavLink>}
        </nav>
        <div className="header-action">
          {user ? (
            <button className="button button-outline button-small" onClick={handleLogout}>
              Cerrar sesión <span aria-hidden="true">↗</span>
            </button>
          ) : (
            <button className="button button-dark button-small" onClick={() => void login()}>
              Ingresar <span aria-hidden="true">↗</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" /> TECNOLOGÍA PARA EL BIEN COMÚN
          </div>
          <h1>
            Lo que hacemos <em>juntos</em> llega más lejos<span className="period">.</span>
          </h1>
          <p>
            Un espacio para descubrir proyectos comunitarios en Arequipa y explorar cómo una
            donación puede convertirse en acción colectiva.
          </p>
          <div className="hero-actions">
            <Link className="button button-coral" to="/proyectos">
              Explorar proyectos <span aria-hidden="true">↗</span>
            </Link>
            <a className="text-link" href="#como-funciona">
              Conoce la plataforma <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className="hero-proof">
            <span className="proof-icon" aria-hidden="true">
              ✳
            </span>
            <span>
              Prototipo académico · Donaciones simuladas
              <br />
              No se realizan cobros reales
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-disk">
            <span className="disk-text">
              HACER
              <br />
              EL BIEN
              <br />
              <i>nos une</i>
            </span>
            <div className="disk-shape shape-one" />
            <div className="disk-shape shape-two" />
            <div className="disk-shape shape-three" />
          </div>
          <div className="art-note">
            <span>01 / 03</span>
            <strong>
              Una comunidad
              <br />
              en movimiento
            </strong>
            <b>↗</b>
          </div>
          <div className="art-star">✳</div>
        </div>
      </div>
      <div className="hero-bottom container">
        <span>PROYECTO EDUCATIVO · AQP SOLIDARIA</span>
        <span>
          DESLIZA PARA DESCUBRIR <b>↓</b>
        </span>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="how-section" id="como-funciona">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="section-kicker">EL RECORRIDO</span>
            <h2>
              Una forma sencilla de <em>participar</em>
            </h2>
          </div>
          <p>
            Cada paso muestra lo que sucede en este laboratorio: identidad verificada, permisos por
            rol y registro auditable.
          </p>
        </div>
        <div className="steps">
          <article>
            <span className="step-number">01</span>
            <div className="step-symbol">⌕</div>
            <h3>Explora</h3>
            <p>Consulta los proyectos publicados y conoce su finalidad y meta.</p>
          </article>
          <article>
            <span className="step-number">02</span>
            <div className="step-symbol">◌</div>
            <h3>Identifícate</h3>
            <p>
              Ingresa con Cognito. Cada solicitud a la API vuelve a validar identidad y permisos.
            </p>
          </article>
          <article>
            <span className="step-number">03</span>
            <div className="step-symbol">✳</div>
            <h3>Simula tu aporte</h3>
            <p>Registra una intención en PEN y observa su resultado simulado. Sin pagos reales.</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function Home() {
  return (
    <>
      <Hero />
      <section className="catalog-section" id="proyectos">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="section-kicker">INICIATIVAS EN COMUNIDAD</span>
              <h2>
                Proyectos que merecen <em>crecer</em>
              </h2>
            </div>
            <Link className="text-link" to="/proyectos">
              Ver todos los proyectos <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <Catalog />
        </div>
      </section>
      <HowItWorks />
      <section className="closing-banner">
        <div className="container">
          <span>UN LABORATORIO CON PROPÓSITO</span>
          <h2>
            Confiar también es <em>verificar.</em>
          </h2>
          <p>
            Aplicamos principios de cero confianza en la autenticación, autorización y protección de
            cada operación.
          </p>
        </div>
      </section>
    </>
  );
}

function PageIntro({ kicker, title, copy }: { kicker: string; title: string; copy: string }) {
  return (
    <div className="page-intro">
      <span className="section-kicker">{kicker}</span>
      <h1>{title}</h1>
      <p>{copy}</p>
    </div>
  );
}

function ProjectRoute() {
  const { projectId } = useParams();
  return projectId ? (
    <div className="container inner-page">
      <Link className="back-link" to="/proyectos">
        ← Volver a proyectos
      </Link>
      <ProjectDetail projectId={projectId} />
    </div>
  ) : (
    <Navigate to="/proyectos" />
  );
}

function DonateRoute() {
  const { projectId } = useParams();
  const { user, groups, login } = useAuth();
  if (!projectId) return <Navigate to="/proyectos" />;
  return (
    <div className="container inner-page">
      <PageIntro
        kicker="TU APORTE"
        title="Participar empieza aquí"
        copy="Registra una intención de donación en esta simulación académica. No se procesa ningún pago."
      />
      {!user ? (
        <div className="notice-card">
          <h2>Ingresa para continuar</h2>
          <p>Necesitas una sesión para registrar una donación simulada.</p>
          <button className="button button-coral" onClick={() => void login()}>
            Ingresar con Cognito ↗
          </button>
        </div>
      ) : !groups.includes("DONANTE") ? (
        <p role="alert" className="notice-card">
          Esta sección es solo para donantes.
        </p>
      ) : (
        <DonationForm accessToken={user.access_token} projectId={projectId} />
      )}
    </div>
  );
}

function ProtectedPage({ type }: { type: "donations" | "management" }) {
  const { user, groups, login } = useAuth();
  const isManagement = type === "management";
  return (
    <div className="container inner-page">
      <PageIntro
        kicker={isManagement ? "ESPACIO GESTOR" : "TU HISTORIAL"}
        title={isManagement ? "Haz que las ideas avancen" : "Tus acciones, en perspectiva"}
        copy={
          isManagement
            ? "Crea iniciativas y publícalas cuando estén listas para la comunidad."
            : "Consulta las intenciones de donación registradas en esta simulación."
        }
      />
      {!user ? (
        <div className="notice-card">
          <h2>Ingresa para continuar</h2>
          <p>Esta vista necesita una sesión autenticada.</p>
          <button className="button button-coral" onClick={() => void login()}>
            Ingresar con Cognito ↗
          </button>
        </div>
      ) : isManagement ? (
        <ManageProjects accessToken={user.access_token} groups={groups} />
      ) : !groups.includes("DONANTE") ? (
        <p role="alert" className="notice-card">
          Esta sección es solo para donantes.
        </p>
      ) : (
        <MyDonations accessToken={user.access_token} />
      )}
    </div>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Brand />
          <p>Una plataforma para imaginar y verificar nuevas formas de solidaridad comunitaria.</p>
        </div>
        <div>
          <span>EXPLORA</span>
          <Link to="/proyectos">Proyectos</Link>
          <a href="/#como-funciona">Cómo funciona</a>
        </div>
        <div>
          <span>TRANSPARENCIA</span>
          <p>
            Laboratorio académico de arquitectura de cero confianza. Donaciones simuladas; no se
            realizan cobros.
          </p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© AQP Solidaria · Arequipa, Perú</span>
        <span>
          HECHO CON PROPÓSITO <b>✳</b>
        </span>
      </div>
    </footer>
  );
}

export function App() {
  return (
    <>
      <Header />
      <main>
        <Suspense
          fallback={
            <div className="container loading-state" role="status">
              Cargando vista…
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/proyectos"
              element={
                <div className="container inner-page">
                  <PageIntro
                    kicker="EXPLORA Y DESCUBRE"
                    title="Proyectos para transformar"
                    copy="Conoce las iniciativas publicadas y el progreso de sus metas simuladas."
                  />
                  <Catalog />
                </div>
              }
            />
            <Route path="/proyectos/:projectId" element={<ProjectRoute />} />
            <Route path="/proyectos/:projectId/donar" element={<DonateRoute />} />
            <Route path="/mis-donaciones" element={<ProtectedPage type="donations" />} />
            <Route path="/gestionar" element={<ProtectedPage type="management" />} />
            <Route path="/callback" element={<AuthCallback />} />
            <Route
              path="/logout"
              element={
                <div className="container inner-page">
                  <div className="notice-card">Has cerrado sesión.</div>
                </div>
              }
            />
            <Route
              path="*"
              element={
                <div className="container inner-page">
                  <PageIntro
                    kicker="404"
                    title="No encontramos esta página"
                    copy="Tal vez el enlace cambió o aún no existe."
                  />
                  <Link className="button button-dark" to="/">
                    Volver al inicio ↗
                  </Link>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
