import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-bold">Not authorized</h1>
      <p className="text-gray-500">
        Your account doesn&apos;t have access to this page. If you think this is a
        mistake, contact a league admin.
      </p>
      <Link href="/" className="text-blue-600 hover:underline">
        Back to home
      </Link>
    </main>
  );
}
