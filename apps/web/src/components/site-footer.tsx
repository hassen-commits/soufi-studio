export function SiteFooter() {
  return (
    <footer className="border-t border-gold/20 py-10">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <p className="ornament">۞ ۞ ۞</p>
        <p className="mt-4 font-title text-sm italic text-navy-500">
          Le patrimoine spirituel de la tradition soufie, transmis en français.
        </p>
        <p className="mt-2 text-xs text-navy-400">
          © {new Date().getFullYear()} Soufi Studio · Passion_Coran · IAVANCE
        </p>
      </div>
    </footer>
  );
}
