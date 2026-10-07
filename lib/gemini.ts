import "server-only";

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-flash-lite";

export const PAIRING_CATEGORIES = ["drink", "side", "sauce", "upgrade"] as const;
export type PairingCategory = (typeof PAIRING_CATEGORIES)[number];

export type GeneratedPairings = {
    is_food: boolean;
    dish_name: string;
    pairings: { category: PairingCategory; title: string; reason: string }[];
};

export function buildPairingPrompt(note: string | null) {
    return [
        "You are a friendly chef helping a home cook elevate their meal.",
        "Look at the photo of the dish and suggest exactly four pairings:",
        "one drink, one side, one sauce or condiment, and one simple upgrade",
        "(a garnish, technique, or finishing touch that takes under 5 minutes).",
        "Favor ingredients a home cook can find at a regular grocery store.",
        "Each title should be short (under 8 words). Each reason should be one",
        "sentence explaining why it works with this dish's flavors or textures.",
        "If the photo does not show food, set is_food to false and return no pairings.",
        note ? `The cook added this note about the dish: "${note}"` : "",
    ]
        .filter(Boolean)
        .join("\n");
}

const responseSchema = {
    type: "OBJECT",
    properties: {
        is_food: { type: "BOOLEAN" },
        dish_name: { type: "STRING" },
        pairings: {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    category: { type: "STRING", enum: [...PAIRING_CATEGORIES] },
                    title: { type: "STRING" },
                    reason: { type: "STRING" },
                },
                required: ["category", "title", "reason"],
            },
        },
    },
    required: ["is_food", "dish_name", "pairings"],
};

export async function generatePairingsFromImage(
    image: { base64: string; mimeType: string },
    prompt: string
): Promise<{ result: GeneratedPairings; raw: unknown }> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not set.");
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { inline_data: { mime_type: image.mimeType, data: image.base64 } },
                            { text: prompt },
                        ],
                    },
                ],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema,
                },
            }),
        }
    );

    const raw = await response.json();

    if (!response.ok) {
        throw new Error(`Gemini request failed: ${raw?.error?.message ?? response.status}`);
    }

    const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof text !== "string") {
        throw new Error("Gemini returned an empty response.");
    }

    const parsed = JSON.parse(text) as GeneratedPairings;

    const pairings = (parsed.pairings ?? [])
        .filter((p) => PAIRING_CATEGORIES.includes(p.category))
        .map((p) => ({
            category: p.category,
            title: String(p.title).slice(0, 120),
            reason: String(p.reason).slice(0, 400),
        }));

    return {
        result: {
            is_food: Boolean(parsed.is_food),
            dish_name: String(parsed.dish_name ?? "Mystery dish").slice(0, 120),
            pairings,
        },
        raw,
    };
}
