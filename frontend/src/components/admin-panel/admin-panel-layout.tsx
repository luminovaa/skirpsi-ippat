/* eslint-disable react-hooks/rules-of-hooks */
"use client";

import { Footer } from "@/components/admin-panel/footer";
import { Sidebar } from "@/components/admin-panel/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useStore } from "@/hooks/use-store";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react"; // Import useEffect

export default function AdminPanelLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const sidebar = useStore(useSidebar, (x) => x);
  // Use a ref to track whether we've already disabled the sidebar
  const hasDisabledSidebar = useRef(false);
  
  // Only run this effect once when sidebar is available
  useEffect(() => {
    if (sidebar && !hasDisabledSidebar.current) {
      sidebar.setSettings({ ...sidebar.settings, disabled: true });
      hasDisabledSidebar.current = true; // Mark as disabled to prevent further updates
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebar]); // Only re-run when sidebar changes
  return (
    <>
      <Sidebar />
      <main
        className={cn(
          "min-h-[calc(100vh_-_56px)] bg-zinc-50 dark:bg-zinc-900 transition-[margin-left] ease-in-out duration-300",
          // Karena sidebar selalu disabled, margin-left tidak perlu diubah
          "lg:ml-0" // Atau nilai default yang Anda inginkan
        )}
      >
        {children}
      </main>
      <footer
        className={cn(
          "transition-[margin-left] ease-in-out duration-300",
          // Karena sidebar selalu disabled, margin-left tidak perlu diubah
          "lg:ml-0" // Atau nilai default yang Anda inginkan
        )}
      >
        <Footer />
      </footer>
    </>
  );
}