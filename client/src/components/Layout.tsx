import { CalendarDays, Eye, Home, LayoutGrid } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";

const Layout = () => {
  const location = useLocation();
  const isAdminCalendar = new URLSearchParams(location.search).get("admin") === "1";
  const isCalendarPage =
    location.pathname.startsWith("/calendar") ||
    (location.pathname === "/" && isAdminCalendar);
  const isPreviewPage = location.pathname.startsWith("/preview");
  const calendarHref = isAdminCalendar ? "/calendar?admin=1" : "/calendar";
  const navItems = [
    { id: "home", label: "Tools Center", href: "/", icon: Home },
    { id: "calendar", label: "Event Pop-Up Calendar", href: calendarHref, icon: CalendarDays },
    { id: "preview", label: "Event Calendar Preview", href: "/preview", icon: Eye },
  ];

  const isActive = (id: string) => {
    if (id === "calendar") return isCalendarPage;
    if (id === "preview") return isPreviewPage;
    return location.pathname === "/" && !isAdminCalendar;
  };

  return (
    <div className="min-h-screen bg-background lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card/95 lg:flex lg:min-h-screen lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <LayoutGrid className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-base font-bold text-foreground">Game Tools Center</div>
            <div className="truncate text-xs text-muted-foreground">Operations workspace</div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Tool navigation">
          <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tools
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.id);

            return (
              <Link
                key={item.id}
                to={item.href}
                className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="w-full border-b border-border bg-card/90 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <LayoutGrid className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-base font-bold text-foreground">Game Tools Center</div>
              <div className="truncate text-xs text-muted-foreground">Operations workspace</div>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3" aria-label="Tool navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.id);

              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={`inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <main className={`min-w-0 flex-1 w-full ${isPreviewPage ? "max-w-none p-0" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"}`}>
        <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
