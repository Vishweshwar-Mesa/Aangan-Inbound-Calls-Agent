import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-start gap-4 p-10">
      <h1 className="text-2xl font-semibold">Aangan Leads</h1>
      <p className="text-muted-foreground">
        Signed in as {session?.user?.email}. The dashboard arrives in Phase 4.
      </p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  );
}
