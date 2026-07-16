import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-shell grid min-h-[650px] place-items-center py-20 text-center">
      <div>
        <span className="eyebrow">404</span>
        <h1 className="page-title">Diese Straße endet hier.</h1>
        <p className="body-large">Die angeforderte Seite wurde nicht gefunden.</p>
        <Link href="/" className="button button-primary mt-8">Zur Startseite</Link>
      </div>
    </section>
  );
}
