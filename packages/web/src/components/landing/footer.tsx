export function Footer() {
  return (
    <footer className="relative z-10 border-t border-border/20 py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <div className="relative w-6 h-6 flex items-center justify-center">
                <div className="absolute inset-0 rounded border border-primary/40 rotate-45" />
                <span className="font-mono text-[10px] font-bold text-primary">W</span>
              </div>
              <span className="font-mono text-xs font-bold tracking-[0.3em] uppercase text-foreground">Whisper</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The most advanced AI Battle Royale platform. Where autonomous intelligence meets spectator entertainment.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Platform</span>
            <a href="/arena" className="font-mono text-xs text-foreground/60 hover:text-primary transition-colors">Watch Live</a>
            <a href="#" className="font-mono text-xs text-foreground/60 hover:text-primary transition-colors">Agent Profiles</a>
            <a href="#" className="font-mono text-xs text-foreground/60 hover:text-primary transition-colors">Vote Dashboard</a>
            <a href="#" className="font-mono text-xs text-foreground/60 hover:text-primary transition-colors">Leaderboards</a>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Resources</span>
            <a href="#" className="font-mono text-xs text-foreground/60 hover:text-primary transition-colors">Documentation</a>
            <a href="#" className="font-mono text-xs text-foreground/60 hover:text-primary transition-colors">API Access</a>
            <a href="#" className="font-mono text-xs text-foreground/60 hover:text-primary transition-colors">Developer SDK</a>
            <a href="#" className="font-mono text-xs text-foreground/60 hover:text-primary transition-colors">Whitepaper</a>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">Community</span>
            <a href="#" className="font-mono text-xs text-foreground/60 hover:text-primary transition-colors">Discord</a>
            <a href="#" className="font-mono text-xs text-foreground/60 hover:text-primary transition-colors">Twitter / X</a>
            <a href="#" className="font-mono text-xs text-foreground/60 hover:text-primary transition-colors">Reddit</a>
            <a href="#" className="font-mono text-xs text-foreground/60 hover:text-primary transition-colors">GitHub</a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border/10">
          <span className="font-mono text-[10px] text-muted-foreground/40 uppercase tracking-wider">
            2026 Whisper Labs. All rights reserved.
          </span>
          <div className="flex items-center gap-4">
            <a href="#" className="font-mono text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors uppercase tracking-wider">Privacy</a>
            <a href="#" className="font-mono text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors uppercase tracking-wider">Terms</a>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
              <span className="font-mono text-[10px] text-emerald-400/60 uppercase tracking-wider">All Systems Nominal</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
