import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTodaysTheme } from "@/lib/themes";
import SiteHeader from "@/components/site-header";
import LogoutButton from "./logout-button";
import UploadForm from "./upload-form";

export default async function DashboardPage() {
    const supabase = await createClient();

    const { data: claimsData, error } =
        await supabase.auth.getClaims();

    const claims = claimsData?.claims;

    if (error || !claims) {
        redirect("/login");
    }

    const [{ data: profile }, { data: meals }] = await Promise.all([
        supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", claims.sub)
            .single(),
        supabase
            .from("meals")
            .select("id, dish_name, image_url, created_at")
            .eq("user_id", claims.sub)
            .order("created_at", { ascending: false }),
    ]);

    const theme = getTodaysTheme();

    return (
        <div className="min-h-screen bg-stone-50 text-stone-900">
            <SiteHeader signedIn />

            <main className="mx-auto max-w-3xl px-4 py-8">
                <h1 className="text-3xl font-bold">
                    {profile?.first_name ? `What's cooking, ${profile.first_name}?` : "What's cooking?"}
                </h1>
                <p className="mt-1 text-stone-600">
                    Upload a photo of your meal and we&apos;ll suggest a drink, a side, a sauce,
                    and one easy upgrade. Today&apos;s theme: <strong>{theme.name}</strong>.
                </p>

                {(!profile?.first_name || !profile?.last_name) && (
                    <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                        Your profile is incomplete.{" "}
                        <Link href="/profile" className="font-medium underline">
                            Add your name
                        </Link>
                        .
                    </p>
                )}

                <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                    <UploadForm userId={claims.sub} />
                </section>

                <section className="mt-10">
                    <h2 className="text-xl font-bold">Your plates</h2>

                    {meals?.length ? (
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {meals.map((meal) => (
                                <Link
                                    key={meal.id}
                                    href={`/meals/${meal.id}`}
                                    className="overflow-hidden rounded-xl border border-stone-200 bg-white hover:shadow-md"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={meal.image_url}
                                        alt={meal.dish_name}
                                        className="aspect-square w-full object-cover"
                                    />
                                    <p className="truncate p-2 text-sm font-medium">{meal.dish_name}</p>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="mt-2 text-stone-600">No plates yet. Your first one is a photo away.</p>
                    )}
                </section>

                <LogoutButton />
            </main>
        </div>
    );
}
