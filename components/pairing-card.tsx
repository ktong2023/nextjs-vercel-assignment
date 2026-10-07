import Link from "next/link";
import VoteButtons from "./vote-buttons";

export type Pairing = {
    id: string;
    category: string;
    title: string;
    reason: string;
    score: number;
    meal_id: string;
    meals?: { dish_name: string; image_url: string } | null;
};

const CATEGORY_STYLES: Record<string, { label: string; className: string }> = {
    drink: { label: "🥤 Drink", className: "bg-sky-100 text-sky-800" },
    side: { label: "🥗 Side", className: "bg-green-100 text-green-800" },
    sauce: { label: "🫙 Sauce", className: "bg-amber-100 text-amber-800" },
    upgrade: { label: "✨ Upgrade", className: "bg-fuchsia-100 text-fuchsia-800" },
};

export default function PairingCard({
    pairing,
    userVote,
    signedIn,
    showMeal = true,
}: {
    pairing: Pairing;
    userVote: 1 | -1 | 0;
    signedIn: boolean;
    showMeal?: boolean;
}) {
    const category = CATEGORY_STYLES[pairing.category] ?? {
        label: pairing.category,
        className: "bg-stone-100 text-stone-700",
    };

    return (
        <article className="flex gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <VoteButtons
                pairingId={pairing.id}
                initialScore={pairing.score}
                initialVote={userVote}
                signedIn={signedIn}
            />

            <div className="min-w-0 flex-1">
                <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${category.className}`}
                >
                    {category.label}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-stone-900">{pairing.title}</h3>
                <p className="mt-1 text-sm text-stone-600">{pairing.reason}</p>

                {showMeal && pairing.meals && (
                    <Link
                        href={`/meals/${pairing.meal_id}`}
                        className="mt-3 inline-block text-sm font-medium text-orange-700 hover:underline"
                    >
                        with {pairing.meals.dish_name} →
                    </Link>
                )}
            </div>

            {showMeal && pairing.meals && (
                <Link href={`/meals/${pairing.meal_id}`} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={pairing.meals.image_url}
                        alt={pairing.meals.dish_name}
                        className="h-20 w-20 rounded-xl object-cover sm:h-24 sm:w-24"
                    />
                </Link>
            )}
        </article>
    );
}
