import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight">Elfelejtett jelszó</h1>
          <p className="text-sm text-muted-foreground">
            Add meg az email címed, és küldünk egy linket az új jelszó beállításához.
          </p>
        </div>
        <ForgotPasswordForm />
        <Link
          href="/login"
          className="block text-center text-sm text-muted-foreground hover:text-foreground"
        >
          ← Vissza a belépéshez
        </Link>
      </div>
    </div>
  );
}
