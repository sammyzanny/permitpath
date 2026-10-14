"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-slate-600">{error.message || "An unexpected error occurred."}</p>
      {error.digest ? <p className="mt-1 text-xs text-slate-400">Ref: {error.digest}</p> : null}
      <button onClick={reset} className="btn-primary mt-6">Try again</button>
    </div>
  );
}
