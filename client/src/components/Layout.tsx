import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAppInfo } from "@lark-apaas/client-toolkit/hooks/useAppInfo";
import { Calendar, Eye, LayoutGrid } from "lucide-react";

const navItems = [
  { to: "/", label: "Tools", icon: LayoutGrid, end: true },
  { to: "/calendar", label: "Calendar", icon: Calendar },
  { to: "/preview", label: "Preview", icon: Eye },
];

const Layout = () => {
  const { appName } = useAppInfo();
  const location = useLocation();
  const isPreviewPage = location.pathname.startsWith("/preview");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
              <Calendar className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              {appName || "Game Tools Center"}
            </h1>
          </div>
          <nav className="flex flex-wrap items-center gap-2" aria-label="Tool navigation">
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </header>

      <main className={`flex-1 w-full ${isPreviewPage ? "max-w-none p-0" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
