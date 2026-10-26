import Link from "next/link";
import Organizer from "./organizer";

export default function OrganizerPage() {
  return <>
    <a className="skip-link" href="#organizer">Ir al contenido</a>
    <header className="site-header page-width">
      <Link className="wordmark" href="/">doorlist<span className="brand-dot">.</span></Link>
      <Link className="text-link" href="/">Ver evento</Link>
    </header>
    <main id="organizer" className="page-width pt-8 pb-16">
      <h1 className="text-3xl leading-tight tracking-tight sm:text-4xl">Tus eventos</h1>
      <Organizer />
    </main>
  </>;
}
