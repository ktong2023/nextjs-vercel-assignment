import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "./actions";
import AvatarUpload from "./avatar-upload";

export default async function ProfilePage() {
    const supabase = await createClient();

    const claimsResult = await supabase.auth.getClaims();

    if (claimsResult.error || !claimsResult.data) {
        redirect("/login");
    }

    const claims = claimsResult.data.claims;

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("id", claims.sub)
        .single();

    if (profileError) {
        throw new Error(`Could not load profile: ${profileError.message}`);
    }

    const profileIncomplete =
        !profile.first_name || !profile.last_name;

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
                    maxWidth: "600px",
                    margin: "0 auto",
                    padding: "32px",
                    background: "white",
                    border: "1px solid #dfe5ee",
                    borderRadius: "16px",
                }}
            >
                <p style={{ color: "#2563eb", fontWeight: 700 }}>
                    Profile
                </p>

                <h1>
                    {profileIncomplete
                        ? "Complete your profile"
                        : "Edit your profile"}
                </h1>

                {profileIncomplete && (
                    <p
                        style={{
                            padding: "12px",
                            background: "#fff7ed",
                            border: "1px solid #fed7aa",
                            borderRadius: "8px",
                        }}
                    >
                        Please enter your first and last name to continue.
                    </p>
                )}

                <p style={{ color: "#667085" }}>
                    Signed in as {String(claims.email ?? "")}
                </p>

                <AvatarUpload
                    userId={claims.sub}
                    currentAvatarUrl={profile.avatar_url}
                />

                <form action={updateProfile}>
                    <label
                        htmlFor="first_name"
                        style={{ display: "block", marginTop: "20px" }}
                    >
                        First name
                    </label>

                    <input
                        id="first_name"
                        name="first_name"
                        type="text"
                        required
                        defaultValue={profile.first_name ?? ""}
                        style={{
                            width: "100%",
                            padding: "10px",
                            marginTop: "6px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                        }}
                    />

                    <label
                        htmlFor="last_name"
                        style={{ display: "block", marginTop: "20px" }}
                    >
                        Last name
                    </label>

                    <input
                        id="last_name"
                        name="last_name"
                        type="text"
                        required
                        defaultValue={profile.last_name ?? ""}
                        style={{
                            width: "100%",
                            padding: "10px",
                            marginTop: "6px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                        }}
                    />

                    <button
                        type="submit"
                        style={{
                            marginTop: "24px",
                            padding: "11px 18px",
                            border: "none",
                            borderRadius: "8px",
                            background: "#2563eb",
                            color: "white",
                            cursor: "pointer",
                        }}
                    >
                        Save profile
                    </button>
                </form>

                <div style={{ marginTop: "24px" }}>
                    <Link href="/dashboard">Return to dashboard</Link>
                </div>
            </section>
        </main>
    );
}