type SearchParams = { [key: string]: string | string[] | undefined };

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const message = typeof sp.message === "string" ? sp.message : "Authentication error";
  return (
    <main className="mx-auto max-w-md px-4 pt-12">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in error</h1>
      <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>
      <a href="/login" className="mt-6 inline-block underline text-sm">Back to sign in</a>
    </main>
  );
}

