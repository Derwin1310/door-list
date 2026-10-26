import Link from "next/link";
import Organizer from "./organizer";
import "./organizer.css";

export default function OrganizerPage() {
  return <>
    <a className="skip-link" href="#organizer">Ir al contenido</a>
    <header className="site-header page-width">
      <Link className="wordmark" href="/">doorlist<span className="brand-dot">.</span></Link>
      <Link className="text-link" href="/">Ver evento</Link>
    </header>
    <main id="organizer" className="organizer page-width">
      <p className="eyebrow">ESPACIO DEL ORGANIZADOR</p>
      <h1>Tus próximos encuentros.</h1>
      <Organizer />
    </main>
  </>;
}
