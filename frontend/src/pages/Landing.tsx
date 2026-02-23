import { useCallback } from "react";
import StatusBar from "../components/landing/StatusBar";
import Ticker from "../components/landing/Ticker";
import HeroZone from "../components/landing/HeroZone";
import Protocol from "../components/landing/Protocol";
import Leaderboard from "../components/landing/Leaderboard";
import McpBridge from "../components/landing/McpBridge";
import CtaStrip from "../components/landing/CtaStrip";
import SystemFooter from "../components/landing/SystemFooter";

export default function Landing() {
  const handleNavigate = useCallback((section: string) => {
    const map: Record<string, string> = {
      matches: "hero-zone",
      leaderboard: "leaderboard",
      predictions: "protocol",
      "connect-ai": "connect-ai",
    };
    const el = document.getElementById(map[section] || section);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleConnectAI = useCallback(() => {
    const el = document.getElementById("connect-ai");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleExplore = useCallback(() => {
    const el = document.getElementById("leaderboard");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <>
      {/* Noise overlay */}
      <div className="noise-overlay" aria-hidden="true">
        <svg width="100%" height="100%">
          <filter id="noise-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise-filter)" />
        </svg>
      </div>

      <StatusBar onNavigate={handleNavigate} onExplore={handleExplore} />
      <Ticker />

      <main>
        <HeroZone onExplore={handleExplore} onConnectAI={handleConnectAI} />
        <Protocol />
        <Leaderboard />
        <McpBridge />
        <CtaStrip onExplore={handleExplore} onConnectAI={handleConnectAI} />
      </main>

      <SystemFooter />
    </>
  );
}
