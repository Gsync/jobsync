import YourOrders from "@/components/JobsAppliedCard";
import NumberCard from "@/components/NumberCard";
import RecentJobsCard from "@/components/RecentJobsCard";

export default function Dashboard() {
  return (
    <>
      <div className="grid auto-rows-max items-start gap-2 md:gap-2 lg:col-span-2">
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4">
          <YourOrders />
          <NumberCard label="This Week" num={14} desc="+35%" progress={45} />
          <NumberCard label="This Month" num={54} desc="+20%" progress={25} />
        </div>
        <div className="flex justify-center">Bar Chart here</div>
      </div>
      <div>
        <RecentJobsCard />
      </div>
    </>
  );
}
