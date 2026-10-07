"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { castVote } from "@/app/actions";

type VoteButtonsProps = {
    pairingId: string;
    initialScore: number;
    initialVote: 1 | -1 | 0;
    signedIn: boolean;
};

export default function VoteButtons({
    pairingId,
    initialScore,
    initialVote,
    signedIn,
}: VoteButtonsProps) {
    const [score, setScore] = useState(initialScore);
    const [vote, setVote] = useState(initialVote);
    const [error, setError] = useState("");
    const [isPending, startTransition] = useTransition();

    function handleVote(value: 1 | -1) {
        const previous = { score, vote };
        const nextVote = vote === value ? 0 : value;

        // Optimistic update; reconciled with the server's score below.
        setVote(nextVote);
        setScore(score - vote + nextVote);
        setError("");

        startTransition(async () => {
            const result = await castVote(pairingId, value);

            if (result.ok) {
                setVote(result.data.vote);
                setScore(result.data.score);
            } else {
                setVote(previous.vote);
                setScore(previous.score);
                setError(result.error);
            }
        });
    }

    const buttonBase =
        "grid h-8 w-8 place-items-center rounded-full text-lg transition disabled:opacity-50";

    if (!signedIn) {
        return (
            <div className="flex flex-col items-center gap-1 text-stone-500">
                <span className="text-lg font-semibold text-stone-800">{score}</span>
                <Link href="/login" className="text-xs underline">
                    Sign in to vote
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-1">
            <button
                type="button"
                aria-label="Upvote"
                aria-pressed={vote === 1}
                disabled={isPending}
                onClick={() => handleVote(1)}
                className={`${buttonBase} ${
                    vote === 1
                        ? "bg-orange-500 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-orange-100"
                }`}
            >
                ▲
            </button>
            <span className="text-lg font-semibold text-stone-800">{score}</span>
            <button
                type="button"
                aria-label="Downvote"
                aria-pressed={vote === -1}
                disabled={isPending}
                onClick={() => handleVote(-1)}
                className={`${buttonBase} ${
                    vote === -1
                        ? "bg-sky-600 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-sky-100"
                }`}
            >
                ▼
            </button>
            {error && <p className="max-w-24 text-center text-xs text-red-600">{error}</p>}
        </div>
    );
}
