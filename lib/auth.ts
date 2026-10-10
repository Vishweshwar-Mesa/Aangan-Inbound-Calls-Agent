import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth, { type DefaultSession } from "next-auth";
import Resend from "next-auth/providers/resend";

import { db } from "./db";
import { accounts, sessions, users, verificationTokens } from "./db/schema";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

// Update this once the studio has a verified sending domain in Resend.
const EMAIL_FROM = "Aangan Leads <onboarding@resend.dev>";

function getAllowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

// Test mode: an empty ALLOWED_EMAILS lets any email sign in, so the app can
// be tried before real access control is decided. The login page shows a
// visible warning whenever this is true — see DECISIONS.md D17. Set
// ALLOWED_EMAILS to turn this off.
export function isTestMode(): boolean {
  return getAllowedEmails().length === 0;
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
      if (isTestMode()) return true;
      return getAllowedEmails().includes(user.email.toLowerCase());
    },
    async session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
