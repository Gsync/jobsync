import Header from "@/components/Header";

export default function Dashboard() {
  const loggedIn = { name: "JobSync" };
  return (
    <section className="dashboard">
      <div className="dashboard-content">
        <header className="dashboard-header">
          <Header
            type="greeting"
            title="Welcome"
            user={loggedIn.name || "Guest"}
            subtext="Manage your Job Search efficiently!"
          />
        </header>
      </div>
    </section>
  );
}
