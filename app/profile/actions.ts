"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
    const supabase = await createClient();

    const claimsResult = await supabase.auth.getClaims();

    if (claimsResult.error || !claimsResult.data) {
        redirect("/login");
    }

    const claims = claimsResult.data.claims;

    const firstName = String(formData.get("first_name") ?? "").trim();
    const lastName = String(formData.get("last_name") ?? "").trim();

    if (!firstName || !lastName) {
        throw new Error("First name and last name are required.");
    }

    const { error } = await supabase
        .from("profiles")
        .update({
            first_name: firstName,
            last_name: lastName,
            updated_at: new Date().toISOString(),
        })
        .eq("id", claims.sub);

    if (error) {
        throw new Error(`Could not update profile: ${error.message}`);
    }

    revalidatePath("/profile");
    revalidatePath("/dashboard");

    redirect("/dashboard");
}