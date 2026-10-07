"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generatePairings } from "@/app/actions";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export default function UploadForm({ userId }: { userId: string }) {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [note, setNote] = useState("");
    const [status, setStatus] = useState<"idle" | "uploading" | "thinking">("idle");
    const [error, setError] = useState("");

    function selectFile(selected: File | undefined) {
        setError("");

        if (!selected) {
            return;
        }

        if (!ALLOWED_TYPES.includes(selected.type)) {
            setError("Please choose a JPEG, PNG, or WebP photo.");
            return;
        }

        if (selected.size > MAX_BYTES) {
            setError("The photo must be smaller than 5 MB.");
            return;
        }

        setFile(selected);
        setPreviewUrl(URL.createObjectURL(selected));
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();

        if (!file) {
            setError("Add a photo of your plate first.");
            return;
        }

        setError("");
        setStatus("uploading");

        const supabase = createClient();
        const extension = file.type.split("/")[1];
        const imagePath = `${userId}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
            .from("meal-photos")
            .upload(imagePath, file, { contentType: file.type });

        if (uploadError) {
            setError(`Upload failed: ${uploadError.message}`);
            setStatus("idle");
            return;
        }

        setStatus("thinking");

        const result = await generatePairings({ imagePath, note });

        if (!result.ok) {
            setError(result.error);
            setStatus("idle");
            return;
        }

        router.push(`/meals/${result.data.mealId}`);
    }

    const busy = status !== "idle";

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label
                htmlFor="photo"
                className="flex min-h-48 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 text-stone-500 hover:border-orange-400"
            >
                {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previewUrl} alt="Your plate" className="max-h-80 w-full object-cover" />
                ) : (
                    <>
                        <span className="text-4xl">📸</span>
                        <span className="mt-2 font-medium">Tap to add a photo of your plate</span>
                        <span className="text-xs">JPEG, PNG, or WebP, up to 5 MB</span>
                    </>
                )}
            </label>
            <input
                id="photo"
                type="file"
                accept={ALLOWED_TYPES.join(",")}
                capture="environment"
                disabled={busy}
                onChange={(event) => selectFile(event.target.files?.[0])}
                className="sr-only"
            />

            <div>
                <label htmlFor="note" className="text-sm font-medium text-stone-700">
                    Anything we should know? <span className="text-stone-400">(optional)</span>
                </label>
                <input
                    id="note"
                    type="text"
                    maxLength={200}
                    value={note}
                    disabled={busy}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="e.g. homemade chicken curry, no alcohol please"
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                />
            </div>

            <button
                type="submit"
                disabled={busy}
                className="rounded-full bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
            >
                {status === "uploading"
                    ? "Uploading photo…"
                    : status === "thinking"
                      ? "Chef is thinking…"
                      : "Get pairings"}
            </button>

            {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
    );
}
