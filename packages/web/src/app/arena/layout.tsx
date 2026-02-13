export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Space+Grotesk:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif",
        background: "#0a0a14",
        color: "#e8e8f0",
        minHeight: "100vh",
        overflow: "hidden",
      }}>
        {children}
      </div>
    </>
  );
}
