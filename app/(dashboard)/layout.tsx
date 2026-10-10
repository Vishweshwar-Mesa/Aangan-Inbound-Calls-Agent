import { CornerMarks, RulerStrip } from "@/components/drafting-marks";
import { Nav } from "@/components/nav";
import { SheetFooter } from "@/components/sheet-footer";
import { auth } from "@/lib/auth";
import { getReviewCount } from "@/lib/queries";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [session, reviewCount] = await Promise.all([auth(), getReviewCount()]);

  return (
    <div className="flex min-h-screen flex-col bg-[#E7E4DD]">
      <CornerMarks />
      <RulerStrip />
      <Nav reviewCount={reviewCount} email={session?.user?.email} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-10">{children}</main>
      <SheetFooter />
    </div>
  );
}
