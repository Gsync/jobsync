import { cookies } from "next/headers";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/toaster";
import { ActivityProvider } from "@/context/ActivityContext";
import { GlobalActivityBanner } from "@/components/activities/GlobalActivityBanner";
import { SidebarProvider } from "@/context/SidebarContext";
import SidebarInset from "@/components/SidebarInset";
import { APP_CONSTANTS } from "@/lib/constants";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get(APP_CONSTANTS.SIDEBAR_STORAGE_KEY);
  const initialExpanded = sidebarCookie ? sidebarCookie.value === "true" : true;

  return (
    <ActivityProvider>
      <SidebarProvider initialExpanded={initialExpanded}>
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
          <Sidebar />
          <SidebarInset>
            <Header />
            <GlobalActivityBanner />
            <main className="flex-1 md:block lg:grid items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-4 lg:grid-cols-3 xl:grid-cols-3">
              {children}
            </main>
            <Toaster />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </ActivityProvider>
  );
}
