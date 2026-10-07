import Link from "next/link";

export default function SiteHeader({ signedIn }: { signedIn: boolean }) {
    return (
        <header className="border-b border-stone-200 bg-white">
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
                <Link href="/" className="text-xl font-bold text-stone-900">
                    🍽️ Plate Mate
                </Link>

                <nav className="flex items-center gap-4 text-sm font-medium">
                    {signedIn ? (
                        <>
                            <Link href="/dashboard" className="rounded-full bg-orange-500 px-4 py-2 text-white hover:bg-orange-600">
                                Get pairings
                            </Link>
                            <Link href="/profile" className="text-stone-600 hover:text-stone-900">
                                Profile
                            </Link>
                        </>
                    ) : (
                        <Link href="/login" className="rounded-full bg-orange-500 px-4 py-2 text-white hover:bg-orange-600">
                            Sign in
                        </Link>
                    )}
                </nav>
            </div>
        </header>
    );
}
