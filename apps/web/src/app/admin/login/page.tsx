import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin · Connexion",
  robots: { index: false, follow: false },
};

async function loginAction(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    throw new Error("ADMIN_TOKEN manquant côté serveur");
  }
  if (password !== expected) {
    redirect("/admin/login?error=1");
  }
  const jar = await cookies();
  jar.set("admin_session", expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 60 * 24 * 7, // 7 jours
  });
  redirect("/admin");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; from?: string }>;
}) {
  const sp = await searchParams;
  const hasError = sp.error === "1";

  return (
    <div className="mx-auto mt-32 max-w-md rounded-sm border border-gold/30 bg-white p-10 shadow-sm">
      <h1 className="text-center font-title text-3xl italic text-navy-700">
        Admin Soufi Studio
      </h1>
      <p className="mt-2 text-center text-xs uppercase tracking-widest text-gold-dark">
        Zone restreinte
      </p>

      <form action={loginAction} className="mt-10 space-y-4">
        <div>
          <label
            htmlFor="password"
            className="block text-xs uppercase tracking-widest text-navy-500"
          >
            Token
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            className="mt-2 w-full rounded-sm border border-gold/30 bg-parchment/40 px-4 py-3 font-mono text-sm text-navy-700 outline-none focus:border-gold"
          />
        </div>

        {hasError ? (
          <p className="rounded-sm border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
            Token invalide.
          </p>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-sm bg-navy-700 px-4 py-3 text-sm uppercase tracking-widest text-parchment transition hover:bg-navy-500"
        >
          Entrer
        </button>
      </form>
    </div>
  );
}
