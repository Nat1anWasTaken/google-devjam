"use client";

import { BottomNavigation, TabType } from "@/components/bottom-navigation";
import useAuth from "@/hooks/use-auth";
import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("vocabulary");
  const { user } = useAuth();

  return (
    <>
      <div className="h-full w-full flex flex-col justify-center items-center">
        <h1 className="text-2xl font-bold">Welcome to the Home Page</h1>
        <p className="mt-4">Please navigate to the login or register page.</p>
      </div>
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={(tab: TabType) => {
          setActiveTab(tab);
        }}
      />
    </>
  );
}
