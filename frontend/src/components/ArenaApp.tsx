import { useState, useCallback } from "react";
import { useGameSocket } from "../hooks/useGameSocket";
import { ChessBoard } from "./ChessBoard";
import { GameControls } from "./GameControls";
import { GameInfo } from "./GameInfo";
import { BettingPanel } from "./BettingPanel";
import { Leaderboard } from "./Leaderboard";
import { MatchHistory } from "./MatchHistory";
import { ReplayViewer } from "./ReplayViewer";
import { TournamentPanel } from "./TournamentPanel";
import { Wallet } from "./Wallet";

interface ArenaAppProps {
  onBack: () => void;
}

export default function ArenaApp({ onBack }: ArenaAppProps) {
  const [activeTab, setActiveTab] = useState<string>("live");
  const [gameId, setGameId] = useState<string | null>(null);
  const [replayGameId, setReplayGameId] = useState<string | null>(null);
  const { events, currentFen, isConnected, isGameOver, lastMove } = useGameSocket(gameId);

  const handleGameStart = useCallback((id: string) => {
    setGameId(id);
  }, []);

  const handleSelectReplay = useCallback((id: string) => {
    setReplayGameId(id);
  }, []);

  const handleBackFromReplay = useCallback(() => {
    setReplayGameId(null);
  }, []);

  return (
    <div className="app-container">
      {/* Arena Header */}
      <div className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={onBack}
            className="btn btn-sm btn-secondary"
            style={{ padding: "4px 12px", fontSize: "0.72rem" }}
          >
            &larr; Back
          </button>
          <h1>
            Chess<span>Arena</span>
          </h1>
        </div>
        <div className="app-header-status">
          <div className={`status-dot ${isConnected ? "" : "disconnected"}`} />
          <span>{isConnected ? "Connected" : "Disconnected"}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav" style={{ marginBottom: "20px" }}>
        {["live", "leaderboard", "history", "tournament"].map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "live" && (
        <div className="main-grid">
          <div className="board-column">
            <ChessBoard
              fen={currentFen || "start"}
              lastMove={lastMove}
            />
            <GameControls
              onGameStart={handleGameStart}
              isPlaying={!!gameId && !isGameOver}
            />
          </div>
          <div className="sidebar-column">
            <GameInfo events={events} isGameOver={isGameOver} />
            {gameId && (
              <BettingPanel gameId={gameId} isGameOver={isGameOver} />
            )}
          </div>
        </div>
      )}

      {activeTab === "leaderboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "800px" }}>
          <Leaderboard />
          <Wallet />
        </div>
      )}

      {activeTab === "history" && (
        <>
          {replayGameId ? (
            <ReplayViewer gameId={replayGameId} onBack={handleBackFromReplay} />
          ) : (
            <MatchHistory onSelectGame={handleSelectReplay} />
          )}
        </>
      )}

      {activeTab === "tournament" && <TournamentPanel />}
    </div>
  );
}
