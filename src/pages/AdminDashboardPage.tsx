import { DashboardContent } from "@/components/admin/DashboardContent";
import { SideNav } from "@/components/admin/SideNav";
import { TopNav } from "@/components/admin/TopNav";


export default function AdminDashboard() {
  return (
    <div className="flex h-screen bg-background">
      <SideNav />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto">
          <DashboardContent />
        </main>
      </div>
    </div>
  );
}
