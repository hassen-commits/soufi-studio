import Link from "next/link";
import { redirect } from "next/navigation";
import { MAITRES } from "@soufi/content";
import { THEMES } from "@/lib/themes";
import { studioCreateEpisode, studioProduceEpisode } from "@/lib/studio-api";

export const dynamic = "force-dynamic";

async function createAction(formData: FormData) {
  "use server";
  const title = String(formData.get("title") ?? "").trim();
  const themeFr = (String(formData.get("themeFr") ?? "").trim() || undefined);
  const author = (String(formData.get("author") ?? "").trim() || undefined);
  const description = String(formData.get("description") ?? "").trim() || undefined;
  const launchNow = formData.get("launch") === "on";

  if (title.length < 3) {
    redirect("/admin/produce?error=title");
  }

  const created = (await studioCreateEpisode({
    title,
    themeFr,
    author,
    description,
  })) as { episode: { id: string } };

  if (launchNow && created.episode?.id) {
    // Production en async — l'agent met 15-20 min. On ne bloque pas l'UI :
    // on lance la production en fire-and-forget côté serveur.
    studioProduceEpisode(created.episode.id).catch(() => undefined);
  }

  redirect("/admin/episodes");
}

export default function AdminProduce({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="space-y-10">
      <header className="flex items-baseline justify-between">
        <h1 className="font-title text-4xl italic text-navy-700">Produire un épisode</h1>
        <Link
          href="/admin"
          className="text-xs uppercase tracking-widest text-navy-500 hover:text-gold-dark"
        >
          ← Retour
        </Link>
      </header>

      <ErrorBanner searchParams={searchParams} />

      <form action={createAction} className="space-y-6 rounded-sm border border-gold/30 bg-parchment/30 p-8">
        <Field
          label="Titre de l'épisode *"
          name="title"
          placeholder="Le silence du cœur — Rûmî"
          required
          minLength={3}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <Field
            label="Thème (sous-titre éditorial)"
            name="themeFr"
            placeholder="Silence intérieur & contemplation"
            list="themes-list"
          />
          <datalist id="themes-list">
            {THEMES.map((t) => (
              <option key={t.slug} value={t.title} />
            ))}
          </datalist>

          <SelectField
            label="Auteur principal"
            name="author"
            options={[
              { value: "", label: "(aucun)" },
              ...MAITRES.map((m) => ({ value: m.key, label: m.name })),
            ]}
          />
        </div>

        <Textarea
          label="Description courte (optionnelle)"
          name="description"
          placeholder="Capsule méditative de 3 minutes…"
        />

        <label className="flex items-center gap-3 text-sm text-navy-600">
          <input
            type="checkbox"
            name="launch"
            defaultChecked
            className="h-4 w-4 rounded border-gold/40 text-navy-700 focus:ring-gold"
          />
          <span>
            Lancer la production immédiatement après création (durée ~15-20 min,
            ne bloque pas cette page)
          </span>
        </label>

        <div className="flex items-center justify-end gap-4 border-t border-gold/20 pt-6">
          <Link
            href="/admin/episodes"
            className="text-xs uppercase tracking-widest text-navy-500 hover:text-gold-dark"
          >
            Annuler
          </Link>
          <button
            type="submit"
            className="rounded-sm bg-navy-700 px-6 py-3 text-sm uppercase tracking-widest text-parchment transition hover:bg-navy-500"
          >
            Créer
          </button>
        </div>
      </form>

      <p className="text-xs text-navy-400">
        L'épisode sera créé en statut <code>planned</code>. Si tu coches "Lancer
        la production", l'agent commence le script + audio + render dans la
        foulée. La vidéo finale sera uploadée sur YouTube en <strong>unlisted</strong>{" "}
        — tu valideras visuellement avant de la basculer en public.
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
  minLength,
  list,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  list?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs uppercase tracking-widest text-navy-500">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="text"
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        list={list}
        className="mt-2 w-full rounded-sm border border-gold/30 bg-white px-4 py-2 text-sm text-navy-700 outline-none focus:border-gold"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs uppercase tracking-widest text-navy-500">
        {label}
      </label>
      <select
        id={name}
        name={name}
        className="mt-2 w-full rounded-sm border border-gold/30 bg-white px-4 py-2 text-sm text-navy-700 outline-none focus:border-gold"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Textarea({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs uppercase tracking-widest text-navy-500">
        {label}
      </label>
      <textarea
        id={name}
        name={name}
        placeholder={placeholder}
        rows={3}
        className="mt-2 w-full rounded-sm border border-gold/30 bg-white px-4 py-2 text-sm text-navy-700 outline-none focus:border-gold"
      />
    </div>
  );
}

async function ErrorBanner({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  if (!sp.error) return null;
  const messages: Record<string, string> = {
    title: "Le titre est obligatoire (min. 3 caractères).",
  };
  return (
    <div className="rounded-sm border border-red-300 bg-red-50 p-4 text-sm text-red-700">
      {messages[sp.error] ?? "Erreur inconnue"}
    </div>
  );
}
