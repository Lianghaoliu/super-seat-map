import React, { useState } from "react";
import SeatingChart from "./components/SeatingChart";

export default function App() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("superseatmap-theme") || "dark"; } catch { return "dark"; }
  });
  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem("superseatmap-theme", next); } catch {}
      return next;
    });
  };
  return <SeatingChart lang="zh" theme={theme} fullScreen={true} onToggleTheme={toggleTheme} />;
}
