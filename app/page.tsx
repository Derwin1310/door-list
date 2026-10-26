export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <article className="w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-8 shadow-sm sm:p-12">
        <h1 className="text-4xl font-semibold tracking-tight text-stone-950 sm:text-5xl">
          Doorlist Sessions
        </h1>
        <time dateTime="2026-11-21T19:00:00-05:00" className="mt-8 block text-lg text-stone-700">
          21 de noviembre de 2026 · 7:00 p. m.
        </time>
        <p className="mt-2 text-lg text-stone-700">
          Teatro ABC · Bogotá
        </p>
        <button
          type="button"
          className="mt-10 min-h-12 w-full cursor-pointer rounded-xl bg-violet-700 px-6 py-3 font-semibold text-white transition-colors hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-700"
        >
          Regístrame
        </button>
      </article>
    </main>
  );
}
