import { CalendarDays, Eye, Home } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";

const Layout = () => {
  const location = useLocation();
  const isAdminCalendar = new URLSearchParams(location.search).get("admin") === "1";
  const isCalendarPage =
    location.pathname.startsWith("/calendar") ||
    (location.pathname === "/" && isAdminCalendar);
  const isPreviewPage = location.pathname.startsWith("/preview");
  const showToolSwitcher = location.pathname !== "/" || isAdminCalendar;
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
    <div className="min-h-screen bg-background flex flex-col">
      {showToolSwitcher && (
        <div className="w-full border-b border-border bg-card/80 backdrop-blur-md">
          <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 sm:px-6 lg:px-8" aria-label="Tool switcher">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.id);

              return (
                <Link
                  key={item.id}
                  to={item.href}
                  className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
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
      )}
      <main className={`flex-1 w-full ${isPreviewPage ? "max-w-none p-0" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
