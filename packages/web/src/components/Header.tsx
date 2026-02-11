"use client";

import type { WorldSyncState } from "@battle-royale/shared";

interface HeaderProps {
  world: WorldSyncState | null;
  connected: boolean;
  aliveCount: number;
}

export function Header({ world, connected, aliveCount }: HeaderProps) {
  const round = world ? `Round ${Math.floor(world.tick / 30) + 1}/${20}` : "---";
  const ticksRemaining = world ? Math.max(0, 600 - world.tick) : 0;
  const minutes = Math.floor(ticksRemaining / 60);
  const seconds = ticksRemaining % 60;
  const timeStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")} remaining`;

  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 24px",
      background: "#0e0e1a",
      borderBottom: "1px solid #1a1a2e",
      minHeight: 56,
    }}>
      {/* Left: Logo + LIVE badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <h1 style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: -0.5,
          color: "#e8e8f0",
        }}>
          <span style={{ color: "#ffaa22" }}>AI</span> Battle Royale
        </h1>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: connected ? "rgba(34,204,136,0.12)" : "rgba(255,68,68,0.12)",
          border: `1px solid ${connected ? "#22cc88" : "#ff4444"}`,
          borderRadius: 4,
          padding: "3px 10px",
          fontSize: 11,
          fontWeight: 700,
          color: connected ? "#22cc88" : "#ff4444",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: connected ? "#22cc88" : "#ff4444",
            boxShadow: connected ? "0 0 6px #22cc88" : "0 0 6px #ff4444",
          }} />
          LIVE
        </div>
      </div>

      {/* Center: Round + Time + Players */}
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#e8e8f0", fontWeight: 600 }}>{round}</span>
          <span style={{ fontSize: 12, color: "#555566" }}>{timeStr}</span>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "#888899",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888899" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span style={{ fontWeight: 600, color: "#e8e8f0" }}>{aliveCount}</span>
          Players Alive
        </div>
      </div>

      {/* Right: Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 14px",
          background: "transparent",
          border: "1px solid #1a1a2e",
          borderRadius: 6,
          color: "#888899",
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share
        </button>
        <button style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 14px",
          background: "linear-gradient(135deg, #8844ff, #6622cc)",
          border: "none",
          borderRadius: 6,
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          Premium View
        </button>
      </div>
    </header>
  );
}
