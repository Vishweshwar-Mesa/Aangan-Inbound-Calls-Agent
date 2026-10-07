import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";

import { db } from "./db";
import { accounts, sessions, users, verificationTokens } from "./db/schema";

// Update this once the studio has a verified sending domain in Resend.
const EMAIL_FROM = "Aangan Leads <onboarding@resend.dev>";

function getAllowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: EMAIL_FROM,
    }),
  ],
  session: { strategy: "database" },
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      return getAllowedEmails().includes(user.email.toLowerCase());
    },
  },
});
