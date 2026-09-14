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
import StaleSessionSignOut from "@/components/StaleSessionSignOut";
import { signOut } from "@/auth";

import { getUserSettings } from "@/actions/userSettings.actions";
import { UserSettingsProvider } from "@/context/UserSettingsContext";

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
  const userSettingsResult = await getUserSettings();

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/signin" });
  };

  // The session outlived the database it was minted against: middleware still
  // passes the signed cookie, but the user row is gone and every scoped query
  // would read as empty rather than unauthorized.
  if (!user) {
    return <StaleSessionSignOut signOutAction={signOutAction} />;
  }

  return (
    <UserSettingsProvider initialSettings={userSettingsResult?.data?.settings}>
      <ActivityProvider>
        <SidebarProvider initialExpanded={initialExpanded}>
          <RightRailProvider>
            <AgentChatProvider initialMessages={conversation.data ?? []}>
            <div className="flex min-h-screen w-full flex-col bg-muted/40">
              <Sidebar user={user} signOutAction={signOutAction} />
              <SidebarInset>
                <Header />
                <GlobalActivityBanner />
                {/* Container, not viewport, queries: the docked chat panel
                    shrinks this box without changing the viewport width. */}
                <main className="@container/main flex-1 p-4 sm:px-4 sm:py-0">
                  <div className="items-start gap-4 md:gap-4 @3xl/main:grid @3xl/main:grid-cols-3">
                    {children}
                  </div>
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
    </UserSettingsProvider>
  );
}
