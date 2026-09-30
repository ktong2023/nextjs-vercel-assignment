import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default function LogoutButton() {
    async function signOut() {
        "use server";

        const supabase = await createClient();
        await supabase.auth.signOut();

        redirect("/login");
    }

    return (
        <form action={signOut} style={{ marginTop: "24px" }}>
            <button
                type="submit"
                style={{
                    padding: "10px 16px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#172033",
                    color: "white",
                    cursor: "pointer",
                }}
            >
                Sign out
            </button>
        </form>
    );
}