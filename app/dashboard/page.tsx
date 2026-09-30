import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

export default async function DashboardPage() {
    const supabase = await createClient();

    const { data: claimsData, error } =
        await supabase.auth.getClaims();

    const claims = claimsData?.claims;

    if (error || !claims) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("id", claims.sub)
        .single();

    const displayName =
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        "New user";

    return (
        <main
            style={{
                minHeight: "100vh",
                padding: "64px 24px",
                background: "#f4f7fb",
                color: "#172033",
            }}
        >
            <section
                style={{
                    maxWidth: "700px",
                    margin: "0 auto",
                    padding: "32px",
                    background: "white",
                    border: "1px solid #dfe5ee",
                    borderRadius: "16px",
                }}
            >
                <p style={{ color: "#2563eb", fontWeight: 700 }}>
                    Protected Route
                </p>

                <h1>Welcome, {displayName}</h1>

                <p>
                    This dashboard is only visible to authenticated users.
                </p>

                {!profile?.first_name || !profile?.last_name ? (
                    <div
                        style={{
                            marginTop: "24px",
                            padding: "16px",
                            background: "#fff7ed",
                            border: "1px solid #fed7aa",
                            borderRadius: "8px",
                        }}
                    >
                        <strong>Your profile is incomplete.</strong>
                        <p style={{ marginBottom: 0 }}>
                            Please add your first and last name in the Profile section.
                        </p>
                    </div>
                ) : null}

                <nav
                    style={{
                        display: "flex",
                        gap: "12px",
                        marginTop: "28px",
                    }}
                >
                    <Link href="/resources">View health resources</Link>
                    <Link href="/profile">Edit profile</Link>
                </nav>
                <LogoutButton />
            </section>
        </main>
    );
}