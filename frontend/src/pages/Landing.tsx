import { useCallback } from "react";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import StatsBar from "../components/landing/StatsBar";
import Features from "../components/landing/Features";
import Philosophy from "../components/landing/Philosophy";
import Protocol from "../components/landing/Protocol";
import CtaSection from "../components/landing/CtaSection";
import Footer from "../components/landing/Footer";

interface LandingProps {
  onEnterArena: () => void;
}

export default function Landing({ onEnterArena }: LandingProps) {
  const handleNavigate = useCallback((section: string) => {
    const sectionMap: Record<string, string> = {
      matches: "features",
      leaderboard: "features",
      "connect-ai": "how-it-works",
      "how-it-works": "how-it-works",
    };
    const targetId = sectionMap[section] || section;
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleConnectAI = useCallback(() => {
    const el = document.getElementById("how-it-works");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  return (
    <>
      {/* Global noise overlay */}
      <div className="noise-overlay" aria-hidden="true">
        <svg width="100%" height="100%">
          <filter id="noise-filter">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise-filter)" />
        </svg>
      </div>

      <Navbar onNavigate={handleNavigate} onEnterArena={onEnterArena} />
      <main>
        <Hero onEnterArena={onEnterArena} onConnectAI={handleConnectAI} />
        <StatsBar />
        <Features />
        <Philosophy />
        <Protocol />
        <CtaSection onEnterArena={onEnterArena} onConnectAI={handleConnectAI} />
      </main>
      <Footer />
    </>
  );
}
