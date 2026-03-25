import { useState } from "react";

export const useActiveTab = () => {
  const [activeTab, setActiveTab] = useState("home");

  return {
    activeTab,
    setActiveTab,
  };
};