import { Outlet } from "react-router-dom";
import { useAppInfo } from "@lark-apaas/client-toolkit/hooks/useAppInfo";
import { Calendar } from "lucide-react";

const Layout = () => {
  const { appName } = useAppInfo();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header - 极简顶部导航 */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
              <Calendar className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {appName || "游戏活动日历"}
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
