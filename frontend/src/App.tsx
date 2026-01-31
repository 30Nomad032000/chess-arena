import { useState, useCallback } from "react";
import Landing from "./pages/Landing";
import ArenaApp from "./components/ArenaApp";

export default function App() {
  const [view, setView] = useState<"landing" | "arena">("landing");

  const handleEnterArena = useCallback(() => {
    setView("arena");
    window.scrollTo(0, 0);
  }, []);

  const handleBackToLanding = useCallback(() => {
    setView("landing");
    window.scrollTo(0, 0);
  }, []);

  if (view === "arena") {
    return <ArenaApp onBack={handleBackToLanding} />;
  }

  return <Landing onEnterArena={handleEnterArena} />;
}
