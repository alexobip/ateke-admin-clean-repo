// AdminPanel.jsx
import React, { useState } from "react";
import {
  UsersIcon,
  ClockIcon,
  LayoutDashboardIcon,
  FolderIcon,
  CalendarCheckIcon,
  MenuIcon,
  ChevronsLeftIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import UsersPanel from "./UsersPanel";
import ProjectsPanel from "./ProjectsPanel"; // ✅ Add this line

const navItems = [
  { key: "who", label: "Who's Working", icon: <LayoutDashboardIcon className="w-4 h-4 mr-2" /> },
  { key: "shifts", label: "Time Entries", icon: <ClockIcon className="w-4 h-4 mr-2" /> },
  { key: "users", label: "Users", icon: <UsersIcon className="w-4 h-4 mr-2" /> },
  { key: "projects", label: "Projects", icon: <FolderIcon className="w-4 h-4 mr-2" /> },
  { key: "timeoff", label: "Time Off", icon: <CalendarCheckIcon className="w-4 h-4 mr-2" /> },
];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState("who");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-muted">
      <aside className={`bg-gray-800 text-white flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-64"}`}>
        <div className="flex items-center justify-between p-4">
          {!collapsed && <h1 className="text-xl font-bold">Time Admin</h1>}
          <button onClick={() => setCollapsed(!collapsed)} className="text-white">
            {collapsed ? <MenuIcon className="w-5 h-5" /> : <ChevronsLeftIcon className="w-5 h-5" />}
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex items-center w-full px-3 py-2 text-left rounded hover:bg-gray-700 transition ${activeTab === item.key ? "bg-gray-700 font-semibold" : ""}`}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        {activeTab === "users" && <UsersPanel />}
        {activeTab === "projects" && <ProjectsPanel />} {/* ✅ Add this line */}
        {/* Add other panels here */}
      </main>
    </div>
  );
}
