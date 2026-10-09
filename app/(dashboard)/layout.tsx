import { Nav } from "@/components/nav";
import { auth } from "@/lib/auth";
import { getReviewCount } from "@/lib/queries";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, reviewCount] = await Promise.all([auth(), getReviewCount()]);

  return (
    <div className="min-h-screen bg-[#080C18]">
      <Nav reviewCount={reviewCount} email={session?.user?.email} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
