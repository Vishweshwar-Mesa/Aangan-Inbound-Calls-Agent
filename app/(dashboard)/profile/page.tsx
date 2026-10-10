import { eq } from "drizzle-orm";

import { signOutAction, updateProfile } from "@/app/(dashboard)/actions";
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
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export default async function ProfilePage() {
  const session = await auth();
  const [user] = session?.user?.id
    ? await db.select().from(users).where(eq(users.id, session.user.id))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight text-[#111111]">PROFILE</h1>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription>
            Signed in as <strong>{session?.user?.email}</strong>. Email is tied to
            your login and can&apos;t be changed here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={user?.name ?? ""}
                placeholder="e.g. Priya Shah"
              />
            </div>
            <Button type="submit" className="w-fit">
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Sign out of Aangan Leads on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
