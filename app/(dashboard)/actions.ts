"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { setActiveFilters } from "@/lib/filters";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const name = String(formData.get("name") ?? "").trim();

  await db
    .update(users)
    .set({ name: name || null })
    .where(eq(users.id, session.user.id));

  revalidatePath("/profile");
}

export async function setFilters(status: string, range: string) {
  await setActiveFilters(status, range);
  revalidatePath("/");
  revalidatePath("/calls");
  revalidatePath("/analytics");
}
