"use client";

export function RagPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-sm border border-gold bg-gold px-6 py-3 text-xs uppercase tracking-widest text-navy-700 transition hover:bg-gold-dark hover:text-parchment"
    >
      Imprimer / Sauvegarder en PDF
    </button>
  );
}
