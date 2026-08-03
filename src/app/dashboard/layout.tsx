import { cookies } from "next/headers";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { ActivityProvider } from "@/context/ActivityContext";
import { GlobalActivityBanner } from "@/components/activities/GlobalActivityBanner";
import { SidebarProvider } from "@/context/SidebarContext";
import SidebarInset from "@/components/SidebarInset";
import { RightRailProvider } from "@/context/RightRailContext";
import { AgentChatProvider } from "@/components/agent/AgentChatProvider";
import { AgentChatPanel } from "@/components/agent/AgentChatPanel";
import { getChatConversation } from "@/actions/agentChat.actions";
import { APP_CONSTANTS } from "@/lib/constants";
import { getCurrentUser } from "@/utils/user.utils";
import { signOut } from "@/auth";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const sidebarCookie = cookieStore.get(APP_CONSTANTS.SIDEBAR_STORAGE_KEY);
  const initialExpanded = sidebarCookie ? sidebarCookie.value === "true" : true;
  // Loaded here rather than in the client: avoids an empty-panel flash on
  // every load, and the race where a message sent before hydration completes
  // is merged against an empty transcript and then persisted.
  const conversation = await getChatConversation();
  const user = await getCurrentUser();

  return (
    <ActivityProvider>
      <SidebarProvider initialExpanded={initialExpanded}>
        <RightRailProvider>
          <AgentChatProvider initialMessages={conversation.data ?? []}>
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
              <Sidebar
                user={user}
                signOutAction={async () => {
                  "use server";
                  await signOut({ redirectTo: "/signin" });
                }}
              />
              <SidebarInset>
                <Header />
                <GlobalActivityBanner />
                <main className="flex-1 md:block lg:grid items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-4 lg:grid-cols-3 xl:grid-cols-3">
                  {children}
                </main>
              </SidebarInset>
              {/* Portaled, so it sits outside the 3-column grid and needs no
                  col-span-3 wrapper. */}
              <AgentChatPanel />
            </div>
          </AgentChatProvider>
        </RightRailProvider>
      </SidebarProvider>
    </ActivityProvider>
  );
}
