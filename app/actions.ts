"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
    GEMINI_MODEL,
    buildPairingPrompt,
    generatePairingsFromImage,
} from "@/lib/gemini";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function requireUser() {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();

    if (error || !data?.claims) {
        return { supabase, userId: null };
    }

    return { supabase, userId: data.claims.sub };
}

export async function generatePairings(input: {
    imagePath: string;
    note: string;
}): Promise<ActionResult<{ mealId: string }>> {
    const { supabase, userId } = await requireUser();

    if (!userId) {
        return { ok: false, error: "Please sign in to get pairings." };
    }

    // The photo must live in the caller's own folder (storage RLS enforces
    // the same on upload).
    if (!input.imagePath.startsWith(`${userId}/`)) {
        return { ok: false, error: "Invalid image." };
    }

    const note = input.note.trim().slice(0, 200) || null;

    const {
        data: { publicUrl },
    } = supabase.storage.from("meal-photos").getPublicUrl(input.imagePath);

    const imageResponse = await fetch(publicUrl);

    if (!imageResponse.ok) {
        return { ok: false, error: "Could not read the uploaded photo." };
    }

    const mimeType = imageResponse.headers.get("content-type") ?? "image/jpeg";
    const base64 = Buffer.from(await imageResponse.arrayBuffer()).toString("base64");

    const prompt = buildPairingPrompt(note);

    let generated;

    try {
        generated = await generatePairingsFromImage({ base64, mimeType }, prompt);
    } catch (error) {
        console.error(error);
        return { ok: false, error: "The chef is busy — please try again in a moment." };
    }

    if (!generated.result.is_food || generated.result.pairings.length === 0) {
        await supabase.storage.from("meal-photos").remove([input.imagePath]);
        return { ok: false, error: "That doesn't look like food. Try another photo!" };
    }

    const { data: meal, error: mealError } = await supabase
        .from("meals")
        .insert({
            user_id: userId,
            image_path: input.imagePath,
            image_url: publicUrl,
            note,
            dish_name: generated.result.dish_name,
            prompt,
            model: GEMINI_MODEL,
            raw_response: generated.raw,
        })
        .select("id")
        .single();

    if (mealError || !meal) {
        console.error(mealError);
        return { ok: false, error: "Could not save your meal." };
    }

    const { error: pairingsError } = await supabase.from("pairings").insert(
        generated.result.pairings.map((pairing) => ({
            ...pairing,
            meal_id: meal.id,
            user_id: userId,
        }))
    );

    if (pairingsError) {
        console.error(pairingsError);
        return { ok: false, error: "Could not save the pairings." };
    }

    revalidatePath("/");
    revalidatePath("/dashboard");

    return { ok: true, data: { mealId: meal.id } };
}

// Clicking the same arrow again removes the vote; clicking the other arrow
// switches it.
export async function castVote(
    pairingId: string,
    value: 1 | -1
): Promise<ActionResult<{ vote: 1 | -1 | 0; score: number }>> {
    const { supabase, userId } = await requireUser();

    if (!userId) {
        return { ok: false, error: "Please sign in to vote." };
    }

    if (value !== 1 && value !== -1) {
        return { ok: false, error: "Invalid vote." };
    }

    const { data: existing } = await supabase
        .from("votes")
        .select("id, value")
        .eq("pairing_id", pairingId)
        .eq("user_id", userId)
        .maybeSingle();

    let vote: 1 | -1 | 0 = value;
    let error;

    if (!existing) {
        ({ error } = await supabase
            .from("votes")
            .insert({ pairing_id: pairingId, user_id: userId, value }));
    } else if (existing.value === value) {
        vote = 0;
        ({ error } = await supabase.from("votes").delete().eq("id", existing.id));
    } else {
        ({ error } = await supabase
            .from("votes")
            .update({ value, updated_at: new Date().toISOString() })
            .eq("id", existing.id));
    }

    if (error) {
        console.error(error);
        return { ok: false, error: "Could not save your vote." };
    }

    const { data: pairing } = await supabase
        .from("pairings")
        .select("score")
        .eq("id", pairingId)
        .single();

    revalidatePath("/");

    return { ok: true, data: { vote, score: pairing?.score ?? 0 } };
}
