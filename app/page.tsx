import type { ReactNode } from "react";
import Link from "next/link";

function Icon({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function Arrow() {
  return <Icon><path d="M5 12h14M13 6l6 6-6 6" /></Icon>;
}

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <header className="site-header page-width">
        <Link className="wordmark" href="/" aria-label="Doorlist, inicio">
          <svg width="28" height="34" viewBox="0 0 28 34" fill="none" aria-hidden="true">
            <path d="M3 31V14a11 11 0 0 1 22 0v17H3Z" stroke="currentColor" strokeWidth="3" />
            <path d="M13 31V11l12-5v25H13Z" fill="currentColor" />
          </svg>
          doorlist<span className="brand-dot">.</span>
        </Link>
        <nav aria-label="Navegación principal">
          <a className="nav-link" href="#evento">El evento</a>
          <a className="nav-action" href="#registro">Quiero ir <Arrow /></a>
        </nav>
      </header>

      <main id="contenido" className="page-width">
        <div className="welcome">
          <p>¡Te damos la bienvenida a Doorlist!</p>
          <p>Tu próximo plan empieza aquí.</p>
        </div>

        <article id="evento" className="event-layout" aria-labelledby="event-title">
          <div className="event-poster" aria-hidden="true">
            <div className="poster-top"><span>DOORLIST PRESENTA</span><span>BOGOTÁ, CO</span></div>
            <p className="poster-title">Nos vemos<br />adentro<span>.</span></p>
            <div className="portal-art">
              <div className="portal portal-outer" />
              <div className="portal portal-middle" />
              <div className="portal portal-inner" />
              <div className="portal portal-opening" />
              <div className="portal-door"><span /></div>
              <svg className="poster-spark" viewBox="0 0 80 80" fill="none"><path d="M40 0v80M0 40h80M12 12l56 56M12 68l56-56" stroke="currentColor" strokeWidth="5" /></svg>
            </div>
            <div className="poster-bottom"><span>21 NOV<br />2026</span><span>DOORLIST<br />SESSIONS</span></div>
          </div>

          <div className="event-content">
            <h1 id="event-title">Doorlist<br />{" "}<span>Sessions</span></h1>
            <p className="event-description">Descubre tu próximo evento y reserva tu lugar.</p>
            <div className="event-tags" aria-label="Modalidad y ciudad"><span>Presencial</span><span>Bogotá</span></div>

            <dl className="event-facts">
              <div className="event-fact">
                <Icon><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4M17 3v4M3 11h18M8 15h2M14 15h2" /></Icon>
                <div><dt>Guarda la fecha</dt><dd><time dateTime="2026-11-21T19:00:00-05:00">Sábado, 21 de noviembre de 2026</time><span>7:00 p. m. · Hora de Colombia</span></dd></div>
              </div>
              <div className="event-fact">
                <Icon><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></Icon>
                <div><dt>Nos encontramos en</dt><dd>Teatro ABC<span>Bogotá, Colombia</span></dd></div>
              </div>
            </dl>

            <div className="registration" id="registro">
              <details>
                <summary className="button button-primary">Regístrame <Arrow /></summary>
                <div className="registration-notice">
                  <p><strong>El registro aún no está disponible.</strong></p>
                  <p>Puedes guardar la fecha en tu calendario mientras habilitamos las inscripciones.</p>
                  <a className="text-link" href="/events/doorlist-sessions.ics" download>Guardar en mi calendario <Arrow /></a>
                </div>
              </details>
              <p className="registration-caption">Un buen plan empieza por dar el primer paso.</p>
            </div>
          </div>
        </article>

        <section className="event-note" aria-labelledby="event-note-title">
          <h2 id="event-note-title">Hazle espacio<br />a tu próximo plan.</h2>
          <div><p>Una fecha para marcar. Un lugar para encontrarnos.</p><p>Ten a mano los detalles de Doorlist Sessions y vuelve para consultar el registro.</p>
            <a className="text-link" href="/events/doorlist-sessions.ics" download>Agregar al calendario <Arrow /></a>
          </div>
        </section>
      </main>

      <footer className="site-footer page-width"><Link className="footer-brand" href="/">doorlist.</Link><Link className="text-link" href="/organizador">Organizadores</Link><p>Los buenos planes se viven.</p><span>Bogotá, Colombia</span></footer>
    </>
  );
}
