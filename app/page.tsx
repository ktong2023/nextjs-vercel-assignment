import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTodaysTheme } from "@/lib/themes";
import { getUserVotes } from "@/lib/votes";
import PairingCard, { type Pairing } from "@/components/pairing-card";
import SiteHeader from "@/components/site-header";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: PageProps<"/">) {
    const { sort } = await searchParams;
    const sortByNew = sort === "new";

    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub ?? null;

    let query = supabase
        .from("pairings")
        .select("id, category, title, reason, score, meal_id, meals(dish_name, image_url)")
        .limit(30);

    query = sortByNew
        ? query.order("created_at", { ascending: false })
        : query
              .order("score", { ascending: false })
              .order("created_at", { ascending: false });

    const { data, error } = await query;
    const pairings = (data ?? []) as unknown as Pairing[];
    const votes = await getUserVotes(supabase, userId, pairings.map((p) => p.id));
    const theme = getTodaysTheme();

    const tabClass = (active: boolean) =>
        `rounded-full px-4 py-1.5 text-sm font-medium ${
            active ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-200"
        }`;

    return (
        <div className="min-h-screen bg-stone-50 text-stone-900">
            <SiteHeader signedIn={Boolean(userId)} />

            <main className="mx-auto max-w-3xl px-4 py-8">
                <section className="rounded-2xl bg-gradient-to-br from-orange-500 to-rose-500 p-6 text-white">
                    <p className="text-sm font-semibold uppercase tracking-wide text-orange-100">
                        Today&apos;s theme
                    </p>
                    <h1 className="mt-1 text-3xl font-bold">{theme.name}</h1>
                    <p className="mt-2 text-orange-50">{theme.blurb}</p>
                    <Link
                        href={userId ? "/dashboard" : "/login"}
                        className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-50"
                    >
                        📸 Snap your plate, get pairings
                    </Link>
                </section>

                <div className="mt-8 flex items-center justify-between gap-4">
                    <h2 className="text-xl font-bold">
                        {sortByNew ? "Fresh pairings" : "Top-rated pairings"}
                    </h2>
                    <nav className="flex gap-1">
                        <Link href="/" className={tabClass(!sortByNew)}>Top</Link>
                        <Link href="/?sort=new" className={tabClass(sortByNew)}>New</Link>
                    </nav>
                </div>

                {error && (
                    <p className="mt-6 text-red-600">Could not load pairings: {error.message}</p>
                )}

                {!error && pairings.length === 0 && (
                    <p className="mt-6 text-stone-600">
                        No pairings yet — be the first to upload a plate!
                    </p>
                )}

                <div className="mt-4 flex flex-col gap-3">
                    {pairings.map((pairing) => (
                        <PairingCard
                            key={pairing.id}
                            pairing={pairing}
                            userVote={votes.get(pairing.id) ?? 0}
                            signedIn={Boolean(userId)}
                        />
                    ))}
                </div>
            </main>
        </div>
    );
}
