import type { SupabaseClient } from "@supabase/supabase-js";

// Map of pairing id -> the signed-in user's vote. RLS only returns the
// caller's own votes, but we filter by user anyway for clarity.
export async function getUserVotes(
    supabase: SupabaseClient,
    userId: string | null,
    pairingIds: string[]
) {
    const votes = new Map<string, 1 | -1>();

    if (!userId || pairingIds.length === 0) {
        return votes;
    }

    const { data } = await supabase
        .from("votes")
        .select("pairing_id, value")
        .eq("user_id", userId)
        .in("pairing_id", pairingIds);

    data?.forEach((vote) => votes.set(vote.pairing_id, vote.value));

    return votes;
}
