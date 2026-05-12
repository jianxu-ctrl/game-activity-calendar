import { Outlet, useLocation } from "react-router-dom";

const Layout = () => {
  const location = useLocation();
  const isPreviewPage = location.pathname.startsWith("/preview");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className={`flex-1 w-full ${isPreviewPage ? "max-w-none p-0" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"}`}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
