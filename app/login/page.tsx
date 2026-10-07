import { signIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const { sent } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Aangan Leads</CardTitle>
          <CardDescription>
            {sent
              ? "Check your inbox for a sign-in link."
              : "Sign in with your studio email."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData: FormData) => {
              "use server";
              await signIn("resend", {
                email: formData.get("email"),
                redirectTo: "/",
              });
            }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@aanganstudio.in"
                required
              />
            </div>
            <Button type="submit">Send magic link</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
