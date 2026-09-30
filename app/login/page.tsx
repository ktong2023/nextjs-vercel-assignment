"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
    const [errorMessage, setErrorMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    async function signInWithGoogle() {
        setIsLoading(true);
        setErrorMessage("");

        const supabase = createClient();

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setErrorMessage(error.message);
            setIsLoading(false);
        }
    }

    return (
        <main
            style={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                padding: "24px",
                background: "#f4f7fb",
            }}
        >
            <section
                style={{
                    width: "100%",
                    maxWidth: "420px",
                    padding: "32px",
                    background: "white",
                    border: "1px solid #dfe5ee",
                    borderRadius: "16px",
                    textAlign: "center",
                }}
            >
                <h1>Sign in</h1>

                <p style={{ color: "#667085", marginBottom: "24px" }}>
                    Sign in to access your profile and protected pages.
                </p>

                <button
                    type="button"
                    onClick={signInWithGoogle}
                    disabled={isLoading}
                    style={{
                        width: "100%",
                        padding: "12px 16px",
                        border: "none",
                        borderRadius: "8px",
                        background: "#2563eb",
                        color: "white",
                        fontSize: "16px",
                        cursor: isLoading ? "not-allowed" : "pointer",
                    }}
                >
                    {isLoading ? "Redirecting..." : "Continue with Google"}
                </button>

                {errorMessage && (
                    <p style={{ marginTop: "16px", color: "#b42318" }}>
                        {errorMessage}
                    </p>
                )}
            </section>
        </main>
    );
}