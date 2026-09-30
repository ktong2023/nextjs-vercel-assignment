import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");

    if (!code) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const supabase = await createClient();

    const { data, error } =
        await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.user) {
        console.error("OAuth callback error:", error?.message);
        return NextResponse.redirect(new URL("/login", request.url));
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", data.user.id)
        .single();

    const destination =
        profile?.first_name && profile?.last_name
            ? "/dashboard"
            : "/profile";

    return NextResponse.redirect(
        new URL(destination, request.url)
    );
}