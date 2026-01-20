import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <Sidebar />
      <div className="flex flex-1 flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <Header />
        <main className="flex-1 md:block lg:grid items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-4 lg:grid-cols-3 xl:grid-cols-3">
          {children}
        </main>
        <Toaster />
      </div>
    </div>
  );
}
