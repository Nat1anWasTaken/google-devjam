"use client";

import { BottomNavigation, TabType } from "@/components/bottom-navigation";
import News from "@/components/tabs/news";
import { UserProfile } from "@/components/tabs/user-profile";
import { Vocabulary } from "@/components/tabs/vocabulary";
import useAuth from "@/hooks/use-auth";
import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("vocabulary");
  const { user } = useAuth();

  return (
    <>
      {activeTab === "vocabulary" && <Vocabulary />}
      {activeTab === "news" && <News />}
      {activeTab === "user" && <UserProfile />}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={(tab: TabType) => {
          setActiveTab(tab);
        }}
      />
    </>
  );
}
