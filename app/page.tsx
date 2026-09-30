import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
    const supabase = await createClient();

    const { data: resources, error } = await supabase
        .from("health_resources")
        .select("*")
        .order("id", { ascending: true });

    const { data: claimsData } =
        await supabase.auth.getClaims();

    const claims = claimsData?.claims ?? null;

    if (error) {
        console.error("Supabase error:", error);

        return (
            <main className={styles.main}>
                <h1>Health Resources</h1>
                <p className={styles.error}>
                    Could not load resources: {error.message}
                </p>
            </main>
        );
    }

    return (
        <main className={styles.main}>
            <header className={styles.header}>
                <p className={styles.eyebrow}>NYC Healthcare Directory</p>
                <h1>Health Resources</h1>

                <p>
                    Healthcare and public-health organizations in New York City.
                </p>

                <div style={{ marginTop: "20px" }}>
                    {claims ? (
                        <Link href="/dashboard">Open private dashboard</Link>
                    ) : (
                        <Link href="/login">Sign in with Google</Link>
                    )}
                </div>
            </header>

            {resources?.length === 0 ? (
                <p>No resources found.</p>
            ) : (
                <section className={styles.grid}>
                    {resources?.map((resource) => (
                        <article className={styles.card} key={resource.id}>
              <span className={styles.category}>
                {resource.category}
              </span>

                            <h2>{resource.name}</h2>

                            <p className={styles.location}>
                                {resource.location}
                            </p>
                        </article>
                    ))}
                </section>
            )}
        </main>
    );
}