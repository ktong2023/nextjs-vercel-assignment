import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserVotes } from "@/lib/votes";
import PairingCard, { type Pairing } from "@/components/pairing-card";
import SiteHeader from "@/components/site-header";

export default async function MealPage({ params }: PageProps<"/meals/[id]">) {
    const { id } = await params;

    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub ?? null;

    const { data: meal } = await supabase
        .from("meals")
        .select("id, dish_name, image_url, note, created_at, pairings(id, category, title, reason, score, meal_id)")
        .eq("id", id)
        .maybeSingle();

    if (!meal) {
        notFound();
    }

    const pairings = [...(meal.pairings as Pairing[])].sort((a, b) => b.score - a.score);
    const votes = await getUserVotes(supabase, userId, pairings.map((p) => p.id));

    return (
        <div className="min-h-screen bg-stone-50 text-stone-900">
            <SiteHeader signedIn={Boolean(userId)} />

            <main className="mx-auto max-w-3xl px-4 py-8">
                <Link href="/" className="text-sm text-stone-600 hover:underline">
                    ← Back to top pairings
                </Link>

                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={meal.image_url}
                    alt={meal.dish_name}
                    className="mt-4 max-h-96 w-full rounded-2xl object-cover"
                />

                <h1 className="mt-6 text-3xl font-bold">{meal.dish_name}</h1>
                {meal.note && <p className="mt-2 text-stone-600">“{meal.note}”</p>}

                <h2 className="mt-8 text-xl font-bold">Pairings</h2>
                <p className="text-sm text-stone-500">
                    Vote for the suggestions you&apos;d actually make.
                </p>

                <div className="mt-4 flex flex-col gap-3">
                    {pairings.map((pairing) => (
                        <PairingCard
                            key={pairing.id}
                            pairing={pairing}
                            userVote={votes.get(pairing.id) ?? 0}
                            signedIn={Boolean(userId)}
                            showMeal={false}
                        />
                    ))}
                </div>
            </main>
        </div>
    );
}
