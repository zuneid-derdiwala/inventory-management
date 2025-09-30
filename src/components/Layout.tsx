"use client";

import React from "react";
import Navbar from "./Navbar";
import { MadeWithDyad } from "./made-with-dyad";
import { useData } from "@/context/DataContext";
import { Loader2 } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isLoadingData } = useData();

  return (
    <div className="flex w-full flex-col min-h-screen">
      <Navbar />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {isLoadingData ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="sr-only">Loading...</span>
          </div>
        ) : (
          children
        )}
      </main>
      <MadeWithDyad />
    </div>
  );
};

export default Layout;