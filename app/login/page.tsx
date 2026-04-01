/**
 * Login page — minimal placeholder.
 * Replace with your preferred Supabase Auth UI or custom form.
 * @supabase/auth-ui-react is a drop-in option:
 *   https://supabase.com/docs/guides/auth/auth-helpers/auth-ui
 */
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-gray-400 text-sm">
          Authentication UI goes here. Wire up{" "}
          <code className="text-blue-400">@supabase/auth-ui-react</code> or a
          custom email/password form.
        </p>
      </div>
    </main>
  );
}
