import Sidebar from "@/components/Sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loggedIn: User = { $id: "23", name: "JobSync", email: "test@test.com" };
  return (
    <main className="flex h-screen">
      <Sidebar user={loggedIn} />
      {children}
    </main>
  );
}
