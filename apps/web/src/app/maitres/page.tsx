import { MAITRES } from "@soufi/content";
import { countCitationsByAuthor } from "@soufi/db";
import { MaitreCard } from "@/components/maitre-card";

export const revalidate = 3600;

export default async function MaitresPage() {
  let counts: Record<string, number> = {};
  try {
    counts = await countCitationsByAuthor();
  } catch {
    // pas grave
  }

  return (
    <div>
      <header className="mb-12 text-center">
        <p className="ornament">۞</p>
        <h1 className="mt-4 font-title text-5xl italic text-navy-700">Les maîtres</h1>
        <p className="mt-3 text-sm text-navy-500">
          Les voix qui peuplent cette bibliothèque.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        {MAITRES.map((m) => (
          <MaitreCard key={m.key} maitre={m} count={counts[m.key]} />
        ))}
      </div>
    </div>
  );
}
