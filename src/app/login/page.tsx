import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Artbridge OS</h1>
          <p className="text-sm text-muted-foreground">
            Belépés email címmel — jelszó nem kell.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
