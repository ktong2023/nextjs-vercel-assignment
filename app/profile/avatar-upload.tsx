"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type AvatarUploadProps = {
    userId: string;
    currentAvatarUrl: string | null;
};

export default function AvatarUpload({
                                         userId,
                                         currentAvatarUrl,
                                     }: AvatarUploadProps) {
    const router = useRouter();

    const [avatarUrl, setAvatarUrl] =
        useState(currentAvatarUrl);

    const [message, setMessage] = useState("");
    const [uploading, setUploading] = useState(false);

    async function uploadAvatar(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setMessage("The image must be smaller than 2 MB.");
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
        ];

        if (!allowedTypes.includes(file.type)) {
            setMessage("Please select a JPEG, PNG, or WebP image.");
            return;
        }

        setUploading(true);
        setMessage("");

        const supabase = createClient();
        const extension = file.name.split(".").pop() ?? "jpg";
        const filePath = `${userId}/avatar.${extension}`;

        const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, file, {
                upsert: true,
                contentType: file.type,
            });

        if (uploadError) {
            setMessage(`Upload failed: ${uploadError.message}`);
            setUploading(false);
            return;
        }

        const {
            data: { publicUrl },
        } = supabase.storage
            .from("avatars")
            .getPublicUrl(filePath);

        const cacheBustedUrl = `${publicUrl}?updated=${Date.now()}`;

        const { error: profileError } = await supabase
            .from("profiles")
            .update({
                avatar_url: cacheBustedUrl,
                updated_at: new Date().toISOString(),
            })
            .eq("id", userId);

        if (profileError) {
            setMessage(
                `Profile update failed: ${profileError.message}`
            );
            setUploading(false);
            return;
        }

        setAvatarUrl(cacheBustedUrl);
        setMessage("Profile photo updated.");
        setUploading(false);
        router.refresh();
    }

    return (
        <section style={{ marginTop: "24px" }}>
            {avatarUrl ? (
                <img
                    src={avatarUrl}
                    alt="Profile"
                    width={120}
                    height={120}
                    style={{
                        width: "120px",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "50%",
                        border: "3px solid #dbeafe",
                    }}
                />
            ) : (
                <div
                    style={{
                        width: "120px",
                        height: "120px",
                        display: "grid",
                        placeItems: "center",
                        borderRadius: "50%",
                        background: "#e2e8f0",
                        color: "#64748b",
                    }}
                >
                    No photo
                </div>
            )}

            <label
                htmlFor="avatar"
                style={{
                    display: "block",
                    marginTop: "16px",
                    fontWeight: 600,
                }}
            >
                Profile photo
            </label>

            <input
                id="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading}
                onChange={uploadAvatar}
                style={{ marginTop: "8px" }}
            />

            {uploading && <p>Uploading...</p>}

            {message && (
                <p
                    style={{
                        color: message.startsWith("Upload failed")
                            ? "#b42318"
                            : "#166534",
                    }}
                >
                    {message}
                </p>
            )}
        </section>
    );
}