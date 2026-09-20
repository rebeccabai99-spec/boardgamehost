import { useState, useRef, useEffect } from "react";

type Screen =
  | "mode-select"
  | "mode-pick"
  | "game-select"
  | "room"
  | "turn"
  | "quick-qa"
  | "library"
  | "community"
  | "profile"
  | "upload";

type Mode = "play-along" | "quick-qa";

interface Game {
  id: string;
  name: string;
  players: string;
  duration: string;
  type: "official" | "community";
  emoji: string;
  category: string;
  blurb?: string;
}

interface ChatMessage {
  role: "user" | "ai";
  text: string;
  citation?: string;
}

const GAMES: Game[] = [
  { id: "catan",     name: "Catan",                        players: "3–4",  duration: "60–120 min", type: "official",  emoji: "🏝️", category: "Strategy",  blurb: "Trade resources, build settlements, and race to 10 victory points on a randomly generated island." },
  { id: "codenames", name: "Codenames",                    players: "4–8",  duration: "15–30 min",  type: "official",  emoji: "🕵️", category: "Party",     blurb: "Two rival spymasters give one-word clues to lead their team to secret agents — without hitting the assassin." },
  { id: "ticket",    name: "Ticket to Ride",               players: "2–5",  duration: "45–90 min",  type: "official",  emoji: "🚂", category: "Strategy",  blurb: "Claim railway routes across the map to complete destination tickets before your opponents cut you off." },
  { id: "pandemic",  name: "Pandemic",                     players: "2–4",  duration: "45–60 min",  type: "official",  emoji: "🦠", category: "Co-op",     blurb: "Work together as disease-fighting specialists to cure four deadly outbreaks before they overrun the world." },
  { id: "uno",       name: "UNO",                          players: "2–10", duration: "15–30 min",  type: "community", emoji: "🃏", category: "Party",     blurb: "Match colors and numbers, play action cards to trip up opponents, and be first to shout UNO!" },
  { id: "betrayal",  name: "Betrayal at House on the Hill",players: "3–6",  duration: "60–90 min",  type: "community", emoji: "👻", category: "Adventure", blurb: "Explore a haunted mansion tile by tile — until one player turns traitor and the real horror begins." },
  { id: "chess",     name: "Chess",                        players: "2",    duration: "Unlimited",  type: "community", emoji: "♟️", category: "Classic",   blurb: "The timeless strategy duel — outmaneuver your opponent and force their king into checkmate." },
  { id: "sushi",     name: "Sushi Go!",                    players: "2–5",  duration: "15 min",     type: "official",  emoji: "🍣", category: "Party",     blurb: "Draft the best combination of sushi dishes as cards pass around the table in this quick card-drafting game." },
  { id: "gloomhaven",name: "Gloomhaven",                   players: "1–4",  duration: "60–120 min", type: "official",  emoji: "⚔️", category: "Adventure", blurb: "A persistent dungeon-crawl campaign where every decision shapes the story and the world changes around you." },
  { id: "splendor",  name: "Splendor",                     players: "2–4",  duration: "30 min",     type: "community", emoji: "💎", category: "Strategy",  blurb: "Collect gem tokens, buy development cards, and attract nobles in this elegant engine-building gem of a game." },
];

const PLAY_ALONG_MOCK_RESPONSES: Record<string, { text: string; citation: string }> = {
  default: {
    text: "Great question! When a 7 is rolled, the active player must move the robber to any other hex tile. They can then steal one resource card at random from any player with a settlement or city adjacent to that hex.",
    citation: "Catan Rulebook — p. 9, \"The Robber\"",
  },
  trade: {
    text: "On your turn, you can trade resources with other players at any ratio you both agree on. You can also trade with the bank at 4:1. Coastal harbors let you trade 3:1 or even 2:1 for specific resources!",
    citation: "Catan Rulebook — p. 11, \"Trading\"",
  },
  setup: {
    text: "Your FIRST settlement collects nothing. Your SECOND settlement (placed during the reverse phase) earns you 1 resource card for each terrain hex it touches. That's your starting hand!",
    citation: "Catan Rulebook — p. 7, \"Starting Setup\"",
  },
  build: {
    text: "Road: 1 Brick + 1 Lumber. Settlement: 1 Brick + 1 Lumber + 1 Wool + 1 Grain. City: 2 Grain + 3 Ore (upgrades a settlement). Dev Card: 1 Ore + 1 Wool + 1 Grain.",
    citation: "Catan Rulebook — p. 12, \"Building Costs\"",
  },
};

const MOCK_PLAYERS = ["Alex", "Jordan", "Sam", "You"];
const PLAYER_COLORS = ["bg-coral", "bg-green-game", "bg-amber-warm", "bg-plum"];
const PLAYER_AVATARS = ["😄", "🤓", "😎", "😊"];

function getPlayAlongMockResponse(text: string) {
  const l = text.toLowerCase();
  if (l.includes("trade") || l.includes("bank") || l.includes("harbor")) return PLAY_ALONG_MOCK_RESPONSES.trade;
  if (l.includes("start") || l.includes("setup") || l.includes("resource")) return PLAY_ALONG_MOCK_RESPONSES.setup;
  if (l.includes("build") || l.includes("cost") || l.includes("road") || l.includes("settlement")) return PLAY_ALONG_MOCK_RESPONSES.build;
  return PLAY_ALONG_MOCK_RESPONSES.default;
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Badge({ type }: { type: "official" | "community" }) {
  return type === "official" ? (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-light text-green-game border border-green-game/20">
      ✓ Official
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-light text-amber-warm border border-amber-warm/20">
      👥 Community
    </span>
  );
}

function AIChatPanel({
  game,
  messages,
  input,
  isTyping,
  chatEndRef,
  onInputChange,
  onSend,
  compact = false,
}: {
  game: Game;
  messages: ChatMessage[];
  input: string;
  isTyping: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  onInputChange: (v: string) => void;
  onSend: () => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className={`flex-1 overflow-y-auto scrollbar-hide px-4 space-y-3 ${compact ? "py-3" : "py-4"}`}>
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-plum flex items-center justify-center text-sm flex-none">🎙️</div>
              <div className="chat-bubble-ai px-4 py-3 max-w-[80%]">
                <p className="text-sm leading-relaxed">
                  Hey! Ask me anything about <strong>{game.name}</strong> — rules, costs, scoring, anything!
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pl-10">
              {["How does trading work?", "What happens on a 7?", "Building costs?"].map((q) => (
                <button
                  key={q}
                  onClick={() => onInputChange(q)}
                  className="text-xs bg-plum-light text-plum font-semibold px-3 py-1.5 rounded-full border border-plum/20 active:scale-95 transition-transform"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {msg.role === "ai" && (
              <div className="w-8 h-8 rounded-full bg-plum flex items-center justify-center text-sm flex-none">🎙️</div>
            )}
            <div className={`max-w-[78%] px-4 py-3 ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}>
              <p className="text-sm leading-relaxed">{msg.text}</p>
              {msg.citation && (
                <p className="text-xs mt-2 opacity-60 font-semibold border-t border-current/10 pt-1.5">
                  📖 {msg.citation}
                </p>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-end gap-2.5">
            <div className="w-8 h-8 rounded-full bg-plum flex items-center justify-center text-sm flex-none">🎙️</div>
            <div className="chat-bubble-ai px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-ink-muted animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      {/* Input */}
      <div className="flex-none px-4 pb-4 pt-2 border-t border-border">
        <div className="flex items-center gap-2 bg-card rounded-2xl border border-border px-3 py-2">
          <button className="text-lg text-ink-muted active:scale-90 transition-transform">🎤</button>
          <input
            type="text"
            placeholder="Ask a rules question…"
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isTyping && onSend()}
            className="flex-1 text-sm text-ink placeholder-ink-muted/50 bg-transparent focus:outline-none"
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || isTyping}
            className="w-8 h-8 rounded-xl bg-plum text-white flex items-center justify-center text-sm active:scale-90 transition-transform disabled:opacity-40"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("mode-select");
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  // Game select filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  // Room state
  const [roomTab, setRoomTab] = useState<"create" | "join">("create");
  const [generatedCode] = useState("MAPLE7");
  const [joinCode, setJoinCode] = useState("");
  const [roomJoined, setRoomJoined] = useState(false);

  // Turn state
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [showPrivateAI, setShowPrivateAI] = useState(false);
  const [privateMessages, setPrivateMessages] = useState<ChatMessage[]>([]);
  const [privateInput, setPrivateInput] = useState("");
  const [privateTyping, setPrivateTyping] = useState(false);
  const privateChatEndRef = useRef<HTMLDivElement>(null);

  // Quick QA state
  const [qaMessages, setQaMessages] = useState<ChatMessage[]>([]);
  const [qaInput, setQaInput] = useState("");
  const [qaTyping, setQaTyping] = useState(false);
  const qaChatEndRef = useRef<HTMLDivElement>(null);

  const categories = ["All", "Strategy", "Party", "Co-op", "Adventure", "Classic"];
  const filteredGames = GAMES.filter((g) => {
    const matchSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = activeCategory === "All" || g.category === activeCategory;
    return matchSearch && matchCat;
  });

  const YOU_INDEX = 3;
  const isYourTurn = currentTurnIndex === YOU_INDEX;

  function pickMode(mode: Mode) {
    setSelectedMode(mode);
    setScreen("game-select");
  }

  function pickGame(game: Game) {
    setSelectedGame(game);
    setSearchQuery("");
    setActiveCategory("All");
    if (selectedMode === "play-along") {
      setRoomTab("create");
      setJoinCode("");
      setRoomJoined(false);
      setCurrentTurnIndex(0);
      setPrivateMessages([]);
      setScreen("room");
    } else {
      setQaMessages([]);
      setScreen("quick-qa");
    }
  }

  function sendPrivateMessage() {
    if (!privateInput.trim()) return;
    const text = privateInput.trim();
    setPrivateMessages((prev) => [...prev, { role: "user", text }]);
    setPrivateInput("");
    setPrivateTyping(true);
    setTimeout(() => {
      const resp = getPlayAlongMockResponse(text);
      setPrivateMessages((prev) => [...prev, { role: "ai", text: resp.text, citation: resp.citation }]);
      setPrivateTyping(false);
    }, 1200);
  }

  async function sendQaMessage() {
    if (!qaInput.trim() || qaTyping || !selectedGame) return;
    const text = qaInput.trim();
    const history = qaMessages;
    setQaMessages((prev) => [...prev, { role: "user", text }]);
    setQaInput("");
    setQaTyping(true);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: selectedGame.id, message: text, history }),
        signal: controller.signal,
      });
      const result = (await response.json()) as { text?: string; citation?: string; error?: string };
      if (!response.ok || !result.text) throw new Error(result.error || "The AI did not return an answer.");

      setQaMessages((prev) => [
        ...prev,
        { role: "ai", text: result.text as string, citation: result.citation },
      ]);
    } catch (error) {
      const text =
        error instanceof DOMException && error.name === "AbortError"
          ? "The rules assistant took too long to respond. Please try again."
          : error instanceof Error
            ? error.message
            : "The rules assistant is temporarily unavailable. Please try again.";
      setQaMessages((prev) => [...prev, { role: "ai", text }]);
    } finally {
      window.clearTimeout(timeout);
      setQaTyping(false);
    }
  }

  useEffect(() => {
    privateChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [privateMessages, privateTyping]);

  useEffect(() => {
    qaChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [qaMessages, qaTyping]);

  const isGamesTab = !["community", "profile", "library", "upload"].includes(screen);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div
        className="relative w-full max-w-[420px] bg-cream rounded-[40px] overflow-hidden shadow-2xl border border-border flex flex-col"
        style={{ fontFamily: "'Outfit', sans-serif", height: "812px" }}
      >
        {/* Status bar */}
        <div className="flex-none flex items-center justify-between px-7 pt-4 pb-1">
          <span className="text-xs font-semibold text-ink-muted">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-3.5 h-2 border border-ink-muted rounded-sm relative">
              <div className="absolute inset-[1.5px] left-[1.5px] w-[55%] bg-ink-muted rounded-sm" />
            </div>
          </div>
        </div>

        {/* Screen content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0">

          {screen === "mode-select" && (
            <ModeSelectScreen
              onPickMode={pickMode}
              onProfile={() => setScreen("profile")}
              onPickFeaturedGame={(game) => {
                setSelectedGame(game);
                setScreen("mode-pick");
              }}
            />
          )}

          {screen === "game-select" && selectedMode && (
            <GameSelectScreen
              mode={selectedMode}
              games={filteredGames}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              categories={categories}
              onPickGame={pickGame}
              onBack={() => setScreen("mode-select")}
              onUploadRulebook={() => setScreen("upload")}
            />
          )}

          {screen === "room" && selectedGame && (
            <RoomScreen
              game={selectedGame}
              tab={roomTab}
              setTab={setRoomTab}
              generatedCode={generatedCode}
              joinCode={joinCode}
              setJoinCode={setJoinCode}
              roomJoined={roomJoined}
              onStart={() => setScreen("turn")}
              onJoin={() => { setRoomJoined(true); setScreen("turn"); }}
              onBack={() => setScreen("game-select")}
            />
          )}

          {screen === "turn" && selectedGame && (
            <TurnScreen
              game={selectedGame}
              players={MOCK_PLAYERS}
              playerColors={PLAYER_COLORS}
              playerAvatars={PLAYER_AVATARS}
              currentTurnIndex={currentTurnIndex}
              youIndex={YOU_INDEX}
              isYourTurn={isYourTurn}
              showPrivateAI={showPrivateAI}
              privateMessages={privateMessages}
              privateInput={privateInput}
              privateTyping={privateTyping}
              privateChatEndRef={privateChatEndRef}
              onEndTurn={() => {
                setCurrentTurnIndex((i) => (i + 1) % MOCK_PLAYERS.length);
                setShowPrivateAI(false);
              }}
              onTogglePrivateAI={() => setShowPrivateAI((v) => !v)}
              onPrivateInputChange={setPrivateInput}
              onPrivateSend={sendPrivateMessage}
              onBack={() => setScreen("room")}
            />
          )}

          {screen === "quick-qa" && selectedGame && (
            <QuickQAScreen
              game={selectedGame}
              messages={qaMessages}
              chatInput={qaInput}
              isTyping={qaTyping}
              chatEndRef={qaChatEndRef}
              onBack={() => setScreen("game-select")}
              onInputChange={setQaInput}
              onSend={sendQaMessage}
            />
          )}

          {screen === "mode-pick" && selectedGame && (
            <ModePickScreen
              game={selectedGame}
              onBack={() => setScreen("mode-select")}
              onPickMode={(mode) => {
                setSelectedMode(mode);
                if (mode === "play-along") {
                  setRoomTab("create");
                  setJoinCode("");
                  setRoomJoined(false);
                  setCurrentTurnIndex(0);
                  setPrivateMessages([]);
                  setScreen("room");
                } else {
                  setQaMessages([]);
                  setScreen("quick-qa");
                }
              }}
            />
          )}

          {screen === "upload" && (
            <UploadRulebookScreen
              prefillName={searchQuery}
              onBack={() => setScreen("game-select")}
            />
          )}

          {screen === "library" && (
            <LibraryScreen onPickGame={(game) => { setSelectedGame(game); setScreen("mode-pick"); }} />
          )}

          {screen === "community" && (
            <CommunityScreen />
          )}

          {screen === "profile" && (
            <ProfileScreen />
          )}
        </div>

        {/* Bottom nav — always pinned */}
        <div className="flex-none border-t border-border bg-card px-6 py-3 flex items-center justify-around">
          <button
            onClick={() => setScreen("mode-select")}
            className={`flex flex-col items-center gap-0.5 text-xs font-semibold transition-colors ${isGamesTab ? "text-plum" : "text-ink-muted"}`}
          >
            <span className="text-xl">🎲</span>
            Games
          </button>
          <button
            onClick={() => setScreen("library")}
            className={`flex flex-col items-center gap-0.5 text-xs font-semibold transition-colors ${screen === "library" ? "text-plum" : "text-ink-muted"}`}
          >
            <span className="text-xl">📚</span>
            Library
          </button>
          <button
            onClick={() => setScreen("community")}
            className={`flex flex-col items-center gap-0.5 text-xs font-semibold transition-colors ${screen === "community" ? "text-plum" : "text-ink-muted"}`}
          >
            <span className="text-xl">🌐</span>
            Community
          </button>
          <button
            onClick={() => setScreen("profile")}
            className={`flex flex-col items-center gap-0.5 text-xs font-semibold transition-colors ${screen === "profile" ? "text-plum" : "text-ink-muted"}`}
          >
            <span className="text-xl">👤</span>
            Profile
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mode Select Screen (first screen) ─────────────────────────────────────────
const FEATURED_IDS = ["catan", "codenames", "pandemic", "uno", "sushi", "gloomhaven", "betrayal"];
const FEATURED_GAMES: Game[] = FEATURED_IDS.map((id) => GAMES.find((g) => g.id === id)!);

function ModeSelectScreen({
  onPickMode,
  onProfile,
  onPickFeaturedGame,
}: {
  onPickMode: (m: Mode) => void;
  onProfile: () => void;
  onPickFeaturedGame: (g: Game) => void;
}) {
  return (
    <div className="pb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-3 mb-4">
        <div>
          <h1 className="text-2xl font-black text-ink leading-tight" style={{ fontFamily: "Nunito" }}>
            TableMaster 🎲
          </h1>
          <p className="text-xs text-ink-muted font-medium mt-0.5">Skip the rulebook, start the fun.</p>
        </div>
        <button
          onClick={onProfile}
          className="flex items-center gap-1.5 bg-amber-light text-amber-warm font-bold text-sm px-3 py-1.5 rounded-full border border-amber-warm/30 active:scale-95 transition-transform"
        >
          <span>⭐</span> 42
        </button>
      </div>

      {/* ── Top picks carousel ── */}
      <div className="mb-5">
        <p className="text-xs font-bold text-ink-muted uppercase tracking-wider px-5 mb-2.5">
          🔥 This week's top picks
        </p>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide px-5 pb-1">
          {FEATURED_GAMES.map((game) => (
            <button
              key={game.id}
              onClick={() => onPickFeaturedGame(game)}
              className="flex-none w-28 bg-card border border-border rounded-2xl p-3 text-left active:scale-[0.96] transition-transform hover:border-plum/30 hover:shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-cream border border-border flex items-center justify-center text-xl mb-2 mx-auto">
                {game.emoji}
              </div>
              <p className="text-xs font-bold text-ink text-center leading-snug mb-1.5 line-clamp-2" style={{ fontFamily: "Nunito" }}>
                {game.name}
              </p>
              <div className="flex justify-center">
                <Badge type={game.type} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Mode cards ── */}
      <div className="px-5">
        <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">Choose your mode</p>

        {/* Play Along */}
        <button
          onClick={() => onPickMode("play-along")}
          className="w-full text-left rounded-3xl bg-gradient-to-br from-plum to-[#4A2880] p-5 mb-3 active:scale-[0.98] transition-transform shadow-lg"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">🎙️</div>
            <span className="text-white/50 text-xl">›</span>
          </div>
          <h3 className="text-white font-black text-lg mb-1" style={{ fontFamily: "Nunito" }}>Play Along</h3>
          <p className="text-white/75 text-sm leading-relaxed">
            AI hosts the whole session. Create a room, invite your group, and let TableMaster run the show turn by turn.
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            {["Multiplayer room", "Turn tracker", "Private AI help"].map((tag) => (
              <span key={tag} className="text-xs bg-white/15 text-white/90 px-2.5 py-1 rounded-full font-medium">
                {tag}
              </span>
            ))}
          </div>
        </button>

        {/* Ask Quick Questions */}
        <button
          onClick={() => onPickMode("quick-qa")}
          className="w-full text-left rounded-3xl bg-card border-2 border-border p-5 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-light flex items-center justify-center text-2xl">⚡</div>
            <span className="text-ink-muted/40 text-xl">›</span>
          </div>
          <h3 className="text-ink font-black text-lg mb-1" style={{ fontFamily: "Nunito" }}>Ask Quick Questions</h3>
          <p className="text-ink-muted text-sm leading-relaxed">
            Skip the guided flow. Jump straight to asking a specific rule question with instant rulebook citations.
          </p>
          <div className="mt-3 flex gap-2">
            {["Instant answers", "Cited sources", "Single player"].map((tag) => (
              <span key={tag} className="text-xs bg-amber-light text-amber-warm px-2.5 py-1 rounded-full font-semibold">
                {tag}
              </span>
            ))}
          </div>
        </button>
      </div>
    </div>
  );
}

// ── Mode Pick Screen (featured game → mode choice) ─────────────────────────────
function ModePickScreen({
  game,
  onBack,
  onPickMode,
}: {
  game: Game;
  onBack: () => void;
  onPickMode: (m: Mode) => void;
}) {
  return (
    <div className="px-5 pt-3 pb-8">
      <button onClick={onBack} className="text-sm text-plum font-semibold mb-5 active:opacity-70">
        ← Back
      </button>

      {/* Game identity */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-14 h-14 rounded-2xl bg-cream border border-border flex items-center justify-center text-3xl flex-none">
          {game.emoji}
        </div>
        <div>
          <h2 className="font-black text-xl text-ink leading-tight" style={{ fontFamily: "Nunito" }}>{game.name}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge type={game.type} />
            <span className="text-xs text-ink-muted">{game.players} players · {game.duration}</span>
          </div>
        </div>
      </div>
      {game.blurb && (
        <p className="text-sm text-ink-muted leading-relaxed mb-5">{game.blurb}</p>
      )}

      <p className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-3">How do you want to play?</p>

      {/* Play Along */}
      <button
        onClick={() => onPickMode("play-along")}
        className="w-full text-left rounded-3xl bg-gradient-to-br from-plum to-[#4A2880] p-5 mb-3 active:scale-[0.98] transition-transform shadow-lg"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">🎙️</div>
          <span className="text-white/50 text-xl">›</span>
        </div>
        <h3 className="text-white font-black text-lg mb-1" style={{ fontFamily: "Nunito" }}>Play Along</h3>
        <p className="text-white/75 text-sm leading-relaxed">
          AI hosts the whole session — create a room and let TableMaster guide everyone turn by turn.
        </p>
        <div className="mt-3 flex gap-2 flex-wrap">
          {["Multiplayer room", "Turn tracker", "Private AI help"].map((tag) => (
            <span key={tag} className="text-xs bg-white/15 text-white/90 px-2.5 py-1 rounded-full font-medium">{tag}</span>
          ))}
        </div>
      </button>

      {/* Ask Quick Questions */}
      <button
        onClick={() => onPickMode("quick-qa")}
        className="w-full text-left rounded-3xl bg-card border-2 border-border p-5 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-light flex items-center justify-center text-2xl">⚡</div>
          <span className="text-ink-muted/40 text-xl">›</span>
        </div>
        <h3 className="text-ink font-black text-lg mb-1" style={{ fontFamily: "Nunito" }}>Ask Quick Questions</h3>
        <p className="text-ink-muted text-sm leading-relaxed">
          Jump straight to asking any rule question and get an instant answer with rulebook citations.
        </p>
        <div className="mt-3 flex gap-2">
          {["Instant answers", "Cited sources", "Single player"].map((tag) => (
            <span key={tag} className="text-xs bg-amber-light text-amber-warm px-2.5 py-1 rounded-full font-semibold">{tag}</span>
          ))}
        </div>
      </button>

      <p className="text-center text-xs text-ink-muted/50 mt-4">You can switch modes anytime mid-session.</p>
    </div>
  );
}

// ── Game Select Screen ────────────────────────────────────────────────────────
function GameSelectScreen({
  mode,
  games,
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  categories,
  onPickGame,
  onBack,
  onUploadRulebook,
}: {
  mode: Mode;
  games: Game[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeCategory: string;
  setActiveCategory: (c: string) => void;
  categories: string[];
  onPickGame: (g: Game) => void;
  onBack: () => void;
  onUploadRulebook: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* ── Sticky header ── */}
      <div className="flex-none px-5 pt-3 pb-3 bg-cream border-b border-border">
        {/* Back + mode label */}
        <button onClick={onBack} className="text-sm text-plum font-semibold mb-3 active:opacity-70">
          ← Back
        </button>
        <div className="flex items-center gap-2.5 mb-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-none ${mode === "play-along" ? "bg-plum" : "bg-amber-light"}`}>
            {mode === "play-along" ? "🎙️" : "⚡"}
          </div>
          <div>
            <h2 className="font-black text-base text-ink" style={{ fontFamily: "Nunito" }}>
              {mode === "play-along" ? "Play Along" : "Ask Quick Questions"}
            </h2>
            <p className="text-xs text-ink-muted">Pick a game to get started</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-2.5">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search games…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-card border border-border text-sm text-ink placeholder-ink-muted/60 focus:outline-none focus:border-plum/40 focus:ring-2 focus:ring-plum/10 transition"
          />
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-none text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-all ${
                activeCategory === cat ? "bg-plum text-white border-plum" : "bg-card text-ink-muted border-border"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable game list ── */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pt-3 pb-4">
        {/* Badge legend */}
        <div className="flex gap-3 mb-3">
          <div className="flex items-center gap-1 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-light text-green-game">✓ Official</span>
            <span>publisher-verified</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-ink-muted">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-light text-amber-warm">👥 Community</span>
            <span>user-uploaded</span>
          </div>
        </div>

        <div className="space-y-2.5">
          {games.length === 0 && (
            <div className="rounded-3xl bg-card border border-border p-6 text-center">
              <p className="text-4xl mb-3">📖</p>
              <p className="font-black text-base text-ink mb-1" style={{ fontFamily: "Nunito" }}>
                Can't find your game?
              </p>
              <p className="text-xs text-ink-muted leading-relaxed mb-4">
                Upload its rulebook and help grow the community library. Once reviewed, everyone can use it.
              </p>
              <button
                onClick={onUploadRulebook}
                className="w-full py-3 rounded-2xl text-white font-bold text-sm active:scale-[0.98] transition-transform"
                style={{ background: "linear-gradient(135deg, #6B3F9E, #4A2880)" }}
              >
                Upload a rulebook →
              </button>
              <p className="text-xs text-ink-muted/60 mt-2">Earn +25 credits when it's approved</p>
            </div>
          )}
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => onPickGame(game)}
              className="w-full text-left flex items-center gap-3.5 bg-card rounded-2xl px-4 py-3.5 border border-border active:scale-[0.98] transition-transform hover:border-plum/30 hover:shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-cream flex items-center justify-center text-2xl flex-none border border-border">
                {game.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-sm text-ink truncate" style={{ fontFamily: "Nunito" }}>
                    {game.name}
                  </span>
                  <Badge type={game.type} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-ink-muted">{game.players} players</span>
                  <span className="text-ink-muted/40">·</span>
                  <span className="text-xs text-ink-muted">{game.duration}</span>
                </div>
              </div>
              <span className="text-ink-muted/40 text-sm flex-none">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Room Screen ───────────────────────────────────────────────────────────────
function RoomScreen({
  game,
  tab,
  setTab,
  generatedCode,
  joinCode,
  setJoinCode,
  roomJoined,
  onStart,
  onJoin,
  onBack,
}: {
  game: Game;
  tab: "create" | "join";
  setTab: (t: "create" | "join") => void;
  generatedCode: string;
  joinCode: string;
  setJoinCode: (v: string) => void;
  roomJoined: boolean;
  onStart: () => void;
  onJoin: () => void;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyCode() {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="px-5 pt-3 pb-6">
      <button onClick={onBack} className="text-sm text-plum font-semibold mb-4 active:opacity-70">
        ← Back
      </button>

      {/* Game badge */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-14 h-14 rounded-2xl bg-cream flex items-center justify-center text-3xl border border-border flex-none">
          {game.emoji}
        </div>
        <div>
          <h2 className="font-black text-lg text-ink" style={{ fontFamily: "Nunito" }}>{game.name}</h2>
          <p className="text-xs text-ink-muted">Set up your multiplayer room</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-border/30 rounded-2xl p-1 mb-5">
        {(["create", "join"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              tab === t ? "bg-white text-ink shadow-sm" : "text-ink-muted"
            }`}
          >
            {t === "create" ? "Create Room" : "Join Room"}
          </button>
        ))}
      </div>

      {tab === "create" && (
        <div>
          <p className="text-xs text-ink-muted mb-3 leading-relaxed">
            Share this code with your friends — they'll enter it to join your session from their own phones.
          </p>

          {/* Code display */}
          <div className="rounded-3xl bg-gradient-to-br from-plum to-[#4A2880] p-6 mb-4 text-center relative">
            <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Room Code</p>
            <p className="text-white font-black text-5xl tracking-[0.2em] mb-3" style={{ fontFamily: "Nunito" }}>
              {generatedCode}
            </p>
            <button
              onClick={copyCode}
              className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-bold px-4 py-2 rounded-full active:scale-95 transition-transform"
            >
              {copied ? "✓ Copied!" : "📋 Copy code"}
            </button>
          </div>

          {/* Waiting for players */}
          <div className="bg-card rounded-2xl border border-border p-4 mb-4">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-3">Waiting for players…</p>
            <div className="space-y-2.5">
              {[
                { name: "You", color: "bg-plum", emoji: "😊", joined: true },
                { name: "Alex", color: "bg-coral", emoji: "😄", joined: true },
                { name: "Jordan", color: "bg-green-game", emoji: "🤓", joined: false },
                { name: "Sam", color: "bg-amber-warm", emoji: "😎", joined: false },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${p.joined ? p.color : "bg-border"} flex items-center justify-center text-sm`}>
                    {p.joined ? p.emoji : "?"}
                  </div>
                  <span className={`text-sm font-semibold ${p.joined ? "text-ink" : "text-ink-muted/50"}`}>{p.name}</span>
                  {p.joined && (
                    <span className="ml-auto text-xs bg-green-light text-green-game font-semibold px-2 py-0.5 rounded-full">Joined</span>
                  )}
                  {!p.joined && (
                    <span className="ml-auto text-xs text-ink-muted/40 font-medium">Waiting…</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onStart}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-base active:scale-[0.98] transition-transform"
            style={{ background: "linear-gradient(135deg, #6B3F9E, #4A2880)" }}
          >
            Start Game →
          </button>
          <p className="text-center text-xs text-ink-muted/60 mt-2">You can start with 2+ players</p>
        </div>
      )}

      {tab === "join" && (
        <div>
          <p className="text-xs text-ink-muted mb-4 leading-relaxed">
            Enter the room code your host shared with you to join their session.
          </p>

          <div className="mb-4">
            <label className="text-xs font-bold text-ink-muted uppercase tracking-wide block mb-2">Room Code</label>
            <input
              type="text"
              placeholder="e.g. MAPLE7"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              className="w-full text-center text-3xl font-black tracking-[0.3em] py-4 rounded-2xl bg-card border-2 border-border text-ink placeholder-ink-muted/30 focus:outline-none focus:border-plum/60 focus:ring-2 focus:ring-plum/10 transition"
              style={{ fontFamily: "Nunito" }}
            />
          </div>

          <button
            onClick={onJoin}
            disabled={joinCode.length < 4}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-base active:scale-[0.98] transition-transform disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #6B3F9E, #4A2880)" }}
          >
            Join Room →
          </button>
          <p className="text-center text-xs text-ink-muted/60 mt-2">Ask your host for the 6-letter code</p>
        </div>
      )}
    </div>
  );
}

// ── Turn Screen ───────────────────────────────────────────────────────────────
function TurnScreen({
  game,
  players,
  playerColors,
  playerAvatars,
  currentTurnIndex,
  youIndex,
  isYourTurn,
  showPrivateAI,
  privateMessages,
  privateInput,
  privateTyping,
  privateChatEndRef,
  onEndTurn,
  onTogglePrivateAI,
  onPrivateInputChange,
  onPrivateSend,
  onBack,
}: {
  game: Game;
  players: string[];
  playerColors: string[];
  playerAvatars: string[];
  currentTurnIndex: number;
  youIndex: number;
  isYourTurn: boolean;
  showPrivateAI: boolean;
  privateMessages: ChatMessage[];
  privateInput: string;
  privateTyping: boolean;
  privateChatEndRef: React.RefObject<HTMLDivElement | null>;
  onEndTurn: () => void;
  onTogglePrivateAI: () => void;
  onPrivateInputChange: (v: string) => void;
  onPrivateSend: () => void;
  onBack: () => void;
}) {
  const activeName = players[currentTurnIndex];

  return (
    <div className="flex flex-col h-full relative">
      {/* Top bar */}
      <div className="flex-none px-5 pt-3 pb-2 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-plum font-semibold active:opacity-70">← Exit</button>
        <span className="text-xs font-semibold text-ink-muted">{game.emoji} {game.name}</span>
      </div>

      {/* Player row */}
      <div className="flex-none px-5 pb-3">
        <div className="flex items-center justify-between gap-2">
          {players.map((name, i) => {
            const isActive = i === currentTurnIndex;
            const isYou = i === youIndex;
            return (
              <div key={name} className="flex flex-col items-center gap-1 flex-1">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                  isActive ? `${playerColors[i]} border-transparent shadow-lg scale-110` : "bg-cream border-border"
                }`}>
                  {playerAvatars[i]}
                </div>
                <span className={`text-xs font-bold truncate max-w-full text-center ${isActive ? "text-ink" : "text-ink-muted/60"}`}>
                  {isYou ? "You" : name}
                </span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-amber-warm" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Turn banner */}
      <div className={`flex-none mx-5 rounded-3xl p-5 mb-3 text-center ${isYourTurn ? "bg-gradient-to-br from-amber-warm to-[#D4600A]" : "bg-gradient-to-br from-plum to-[#4A2880]"}`}>
        {isYourTurn ? (
          <>
            <p className="text-white/75 text-xs font-semibold uppercase tracking-wider mb-1">It's your turn!</p>
            <p className="text-white font-black text-2xl" style={{ fontFamily: "Nunito" }}>Your Turn 🎉</p>
            <p className="text-white/70 text-xs mt-2">Roll the dice and make your move.</p>
          </>
        ) : (
          <>
            <p className="text-white/75 text-xs font-semibold uppercase tracking-wider mb-1">Now playing</p>
            <p className="text-white font-black text-2xl" style={{ fontFamily: "Nunito" }}>It's {activeName}'s Turn</p>
            <p className="text-white/70 text-xs mt-2">Sit tight — your turn is coming up.</p>
          </>
        )}
      </div>

      {/* Phase hint card */}
      {!showPrivateAI && (
        <div className="flex-1 px-5 overflow-y-auto scrollbar-hide pb-2">
          <div className="bg-card rounded-2xl border border-border p-4 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-plum/10 flex items-center justify-center text-xs">🎙️</div>
              <span className="text-xs font-semibold text-plum uppercase tracking-wide">AI Host</span>
            </div>
            <p className="text-xs text-ink-muted font-semibold uppercase tracking-wide mb-1">Roll Phase</p>
            <p className="text-sm text-ink leading-relaxed">
              {isYourTurn
                ? "Roll both dice! Everyone with a settlement on the number that comes up collects matching resources from the bank."
                : `${activeName} is rolling the dice. Keep an eye on your hexes — you collect resources too if your number comes up!`}
            </p>
            <div className="mt-3 rounded-xl bg-amber-light/50 border border-amber-warm/20 px-3 py-2">
              <p className="text-xs text-amber-warm font-bold">💡 Tip</p>
              <p className="text-xs text-ink mt-0.5">If a 7 is rolled, the active player moves the robber and may steal a card.</p>
            </div>
          </div>

          {/* Turn log */}
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">Recent turns</p>
            <div className="space-y-2">
              {[
                { name: "Sam", action: "Built a settlement on ore port", emoji: "🏠" },
                { name: "Jordan", action: "Rolled 8 · Collected 2 wheat", emoji: "🌾" },
                { name: "Alex", action: "Traded 4 brick for 1 ore", emoji: "🔄" },
              ].map((entry, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="text-base">{entry.emoji}</span>
                  <p className="text-xs text-ink-muted leading-snug">
                    <span className="font-semibold text-ink">{entry.name}</span> — {entry.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Private AI panel (inline, replaces content) */}
      {showPrivateAI && (
        <div className="flex-1 flex flex-col min-h-0 mx-5 mb-2 bg-card rounded-2xl border border-plum/20 overflow-hidden">
          <div className="flex-none px-4 py-2.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🤫</span>
              <p className="text-xs font-bold text-plum">Private AI — only you see this</p>
            </div>
            <button onClick={onTogglePrivateAI} className="text-ink-muted text-sm active:scale-90">✕</button>
          </div>
          <AIChatPanel
            game={{ id: "", name: game.name, players: "", duration: "", type: "official", emoji: "", category: "" }}
            messages={privateMessages}
            input={privateInput}
            isTyping={privateTyping}
            chatEndRef={privateChatEndRef}
            onInputChange={onPrivateInputChange}
            onSend={onPrivateSend}
            compact
          />
        </div>
      )}

      {/* Bottom actions */}
      <div className="flex-none px-5 pb-5 pt-1 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={onTogglePrivateAI}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl border text-sm font-semibold transition-all active:scale-[0.98] ${
              showPrivateAI
                ? "bg-plum-light border-plum/30 text-plum"
                : "bg-card border-border text-ink-muted"
            }`}
          >
            <span>🤫</span> Ask AI privately
          </button>
          <button
            onClick={onEndTurn}
            disabled={!isYourTurn}
            className="flex-1 py-2.5 rounded-2xl text-white font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-35"
            style={{ background: isYourTurn ? "linear-gradient(135deg, #E8810A, #D4600A)" : "#9CA3AF" }}
          >
            End Turn →
          </button>
        </div>
        {!isYourTurn && (
          <p className="text-center text-xs text-ink-muted/50">End Turn is only active on your own turn</p>
        )}
      </div>
    </div>
  );
}

// ── Quick QA Screen ───────────────────────────────────────────────────────────
function QuickQAScreen({
  game,
  messages,
  chatInput,
  isTyping,
  chatEndRef,
  onBack,
  onInputChange,
  onSend,
}: {
  game: Game;
  messages: ChatMessage[];
  chatInput: string;
  isTyping: boolean;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onInputChange: (v: string) => void;
  onSend: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-none px-5 pt-3 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-sm text-plum font-semibold active:opacity-70">← Back</button>
          <div className="text-center">
            <p className="text-xs font-black text-ink" style={{ fontFamily: "Nunito" }}>Ask Quick Questions</p>
            <p className="text-xs text-ink-muted">{game.emoji} {game.name}</p>
          </div>
          <div className="w-10" />
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <AIChatPanel
          game={game}
          messages={messages}
          input={chatInput}
          isTyping={isTyping}
          chatEndRef={chatEndRef}
          onInputChange={onInputChange}
          onSend={onSend}
        />
      </div>
    </div>
  );
}

// ── Upload Rulebook Screen ────────────────────────────────────────────────────
function UploadRulebookScreen({ prefillName, onBack }: { prefillName: string; onBack: () => void }) {
  const [gameName, setGameName] = useState(prefillName);
  const [playerCount, setPlayerCount] = useState("");
  const [fileAttached, setFileAttached] = useState<"none" | "pdf" | "photo">("none");
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 text-center">
        <p className="text-5xl mb-4">🎉</p>
        <h2 className="font-black text-xl text-ink mb-2" style={{ fontFamily: "Nunito" }}>Rulebook submitted!</h2>
        <p className="text-sm text-ink-muted leading-relaxed mb-6">
          Thanks for contributing! Our team will review <strong>{gameName || "your rulebook"}</strong> within 24–48 hours. You'll earn <span className="text-plum font-bold">+25 credits</span> once it's approved.
        </p>
        <button
          onClick={onBack}
          className="w-full py-3.5 rounded-2xl text-white font-bold text-sm active:scale-[0.98] transition-transform"
          style={{ background: "linear-gradient(135deg, #6B3F9E, #4A2880)" }}
        >
          Back to game search
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 pt-3 pb-8 overflow-y-auto scrollbar-hide">
      <button onClick={onBack} className="text-sm text-plum font-semibold mb-4 active:opacity-70">
        ← Back
      </button>

      <h2 className="font-black text-xl text-ink mb-1" style={{ fontFamily: "Nunito" }}>Upload a Rulebook 📖</h2>
      <p className="text-xs text-ink-muted mb-5 leading-relaxed">
        Can't find your game? Add it to the community library. Upload a PDF or photos of the rulebook pages.
      </p>

      {/* Earn callout */}
      <div className="rounded-2xl bg-amber-light/70 border border-amber-warm/25 px-4 py-3 mb-5 flex items-center gap-3">
        <span className="text-2xl">⭐</span>
        <div>
          <p className="text-sm font-bold text-amber-warm">Earn +25 credits on approval</p>
          <p className="text-xs text-ink-muted">Reviewed within 24–48 hours by the TableMaster team.</p>
        </div>
      </div>

      {/* Game name */}
      <div className="mb-4">
        <label className="text-xs font-bold text-ink-muted uppercase tracking-wide block mb-1.5">Game name *</label>
        <input
          type="text"
          placeholder="e.g. Wingspan"
          value={gameName}
          onChange={(e) => setGameName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-2xl bg-card border border-border text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:border-plum/50 focus:ring-2 focus:ring-plum/10 transition"
        />
      </div>

      {/* Player count */}
      <div className="mb-5">
        <label className="text-xs font-bold text-ink-muted uppercase tracking-wide block mb-1.5">Player count</label>
        <input
          type="text"
          placeholder="e.g. 2–5"
          value={playerCount}
          onChange={(e) => setPlayerCount(e.target.value)}
          className="w-full px-4 py-2.5 rounded-2xl bg-card border border-border text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:border-plum/50 focus:ring-2 focus:ring-plum/10 transition"
        />
      </div>

      {/* File upload area */}
      <div className="mb-5">
        <label className="text-xs font-bold text-ink-muted uppercase tracking-wide block mb-1.5">Rulebook file *</label>

        {fileAttached === "none" ? (
          <div className="rounded-3xl border-2 border-dashed border-border bg-card p-6 text-center">
            <p className="text-3xl mb-2">📎</p>
            <p className="text-sm font-semibold text-ink mb-0.5">Attach your rulebook</p>
            <p className="text-xs text-ink-muted mb-4">PDF or photos of each page (JPG, PNG)</p>
            <div className="flex gap-2">
              <button
                onClick={() => setFileAttached("pdf")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-plum-light text-plum text-xs font-bold border border-plum/20 active:scale-95 transition-transform"
              >
                📄 Upload PDF
              </button>
              <button
                onClick={() => setFileAttached("photo")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-light text-amber-warm text-xs font-bold border border-amber-warm/20 active:scale-95 transition-transform"
              >
                📷 Take photos
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden" />
          </div>
        ) : (
          <div className="rounded-2xl border border-green-game/30 bg-green-light/30 px-4 py-3.5 flex items-center gap-3">
            <span className="text-2xl">{fileAttached === "pdf" ? "📄" : "📷"}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink">
                {fileAttached === "pdf" ? "rulebook.pdf" : "12 photos attached"}
              </p>
              <p className="text-xs text-green-game font-semibold">Ready to submit</p>
            </div>
            <button
              onClick={() => setFileAttached("none")}
              className="text-xs text-ink-muted font-semibold active:scale-90"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="text-xs font-bold text-ink-muted uppercase tracking-wide block mb-1.5">Notes <span className="normal-case font-normal">(optional)</span></label>
        <textarea
          placeholder="Edition year, language, any quirks reviewers should know…"
          className="w-full px-4 py-2.5 rounded-2xl bg-card border border-border text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:border-plum/50 focus:ring-2 focus:ring-plum/10 transition resize-none"
          rows={3}
        />
      </div>

      <button
        onClick={() => { if (gameName.trim() && fileAttached !== "none") setSubmitted(true); }}
        disabled={!gameName.trim() || fileAttached === "none"}
        className="w-full py-3.5 rounded-2xl text-white font-bold text-base active:scale-[0.98] transition-transform disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, #6B3F9E, #4A2880)" }}
      >
        Submit for review →
      </button>
      <p className="text-xs text-ink-muted/60 text-center mt-2">
        By submitting you confirm you own or have rights to share this rulebook.
      </p>
    </div>
  );
}

// ── Library Screen ────────────────────────────────────────────────────────────
const SAVED_GAMES = [
  { id: "catan", name: "Catan", emoji: "🏝️", type: "official" as const, players: "3–4", duration: "60–120 min", category: "Strategy" },
  { id: "codenames", name: "Codenames", emoji: "🕵️", type: "official" as const, players: "4–8", duration: "15–30 min", category: "Party" },
  { id: "pandemic", name: "Pandemic", emoji: "🦠", type: "official" as const, players: "2–4", duration: "45–60 min", category: "Co-op" },
];

const HISTORY = [
  { id: "h1", gameId: "catan", name: "Catan", emoji: "🏝️", type: "official" as const, players: "3–4", duration: "60–120 min", category: "Strategy", date: "Today, 8:14 PM", mode: "play-along" as const, playerNames: ["You", "Alex", "Jordan"], result: "Alex won 🏆" },
  { id: "h2", gameId: "codenames", name: "Codenames", emoji: "🕵️", type: "official" as const, players: "4–8", duration: "15–30 min", category: "Party", date: "Yesterday, 7:30 PM", mode: "quick-qa" as const, playerNames: ["You", "Sam"], result: "2 questions asked" },
  { id: "h3", gameId: "uno", name: "UNO", emoji: "🃏", type: "community" as const, players: "2–10", duration: "15–30 min", category: "Party", date: "Sat, Sep 12", mode: "play-along" as const, playerNames: ["You", "Alex", "Jordan", "Sam"], result: "You won 🏆" },
  { id: "h4", gameId: "ticket", name: "Ticket to Ride", emoji: "🚂", type: "official" as const, players: "2–5", duration: "45–90 min", category: "Strategy", date: "Fri, Sep 11", mode: "play-along" as const, playerNames: ["You", "Jordan"], result: "Jordan won 🏆" },
  { id: "h5", gameId: "pandemic", name: "Pandemic", emoji: "🦠", type: "official" as const, players: "2–4", duration: "45–60 min", category: "Co-op", date: "Wed, Sep 9", mode: "quick-qa" as const, playerNames: ["You", "Alex", "Sam"], result: "5 questions asked" },
];

function LibraryScreen({ onPickGame }: { onPickGame: (g: Game) => void }) {
  const [activeTab, setActiveTab] = useState<"saved" | "history">("saved");
  const [saved, setSaved] = useState<Set<string>>(new Set(SAVED_GAMES.map((g) => g.id)));

  function toggleSave(id: string) {
    setSaved((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const savedList = SAVED_GAMES.filter((g) => saved.has(g.id));

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none px-5 pt-4 pb-3">
        <h1 className="text-xl font-black text-ink" style={{ fontFamily: "Nunito" }}>My Library 📚</h1>
        <p className="text-xs text-ink-muted mt-0.5">Saved games and past sessions</p>
      </div>

      {/* Tab switcher */}
      <div className="flex-none px-5 mb-3">
        <div className="flex gap-1 bg-border/30 rounded-2xl p-1">
          {(["saved", "history"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === t ? "bg-white text-ink shadow-sm" : "text-ink-muted"
              }`}
            >
              {t === "saved" ? "⭐ Saved Games" : "🕐 History"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-4">

        {activeTab === "saved" && (
          <div>
            {savedList.length === 0 && (
              <div className="text-center py-16 text-ink-muted">
                <p className="text-4xl mb-3">⭐</p>
                <p className="text-sm font-semibold text-ink">No saved games yet</p>
                <p className="text-xs mt-1">Tap the star on any game in the Games tab to save it here.</p>
              </div>
            )}
            <div className="space-y-2.5">
              {savedList.map((game) => (
                <div key={game.id} className="flex items-center gap-3.5 bg-card rounded-2xl px-4 py-3.5 border border-border">
                  <div className="w-12 h-12 rounded-xl bg-cream flex items-center justify-center text-2xl flex-none border border-border">
                    {game.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-sm text-ink truncate" style={{ fontFamily: "Nunito" }}>{game.name}</span>
                      <Badge type={game.type} />
                    </div>
                    <p className="text-xs text-ink-muted">{game.players} players · {game.duration}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-none">
                    <button
                      onClick={() => toggleSave(game.id)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-amber-warm bg-amber-light border border-amber-warm/20 active:scale-90 transition-transform"
                      title="Unsave"
                    >
                      ★
                    </button>
                    <button
                      onClick={() => onPickGame(game)}
                      className="w-8 h-8 rounded-xl bg-plum text-white flex items-center justify-center text-sm font-bold active:scale-90 transition-transform"
                    >
                      ›
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {savedList.length > 0 && (
              <p className="text-xs text-ink-muted/60 text-center mt-4">
                Tap › to play · tap ★ to unsave
              </p>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div>
            <p className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-3">{HISTORY.length} sessions</p>
            <div className="space-y-3">
              {HISTORY.map((entry) => (
                <div key={entry.id} className="bg-card rounded-2xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-cream flex items-center justify-center text-xl flex-none border border-border">
                      {entry.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm text-ink" style={{ fontFamily: "Nunito" }}>{entry.name}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          entry.mode === "play-along" ? "bg-plum-light text-plum" : "bg-amber-light text-amber-warm"
                        }`}>
                          {entry.mode === "play-along" ? "🎙️ Play Along" : "⚡ Quick Q&A"}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted mb-1.5">{entry.date}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex -space-x-1.5">
                          {entry.playerNames.slice(0, 4).map((name, i) => (
                            <div
                              key={i}
                              className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white ${
                                ["bg-plum", "bg-coral", "bg-green-game", "bg-amber-warm"][i % 4]
                              }`}
                              title={name}
                            >
                              {name[0]}
                            </div>
                          ))}
                          {entry.playerNames.length > 4 && (
                            <div className="w-6 h-6 rounded-full border-2 border-white bg-border flex items-center justify-center text-xs text-ink-muted font-bold">
                              +{entry.playerNames.length - 4}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-ink-muted">{entry.result}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onPickGame(entry)}
                    className="mt-3 w-full py-2 rounded-xl border border-border text-xs font-semibold text-plum bg-plum-light active:scale-[0.98] transition-transform"
                  >
                    Play again →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Community Screen ──────────────────────────────────────────────────────────

interface CommunityQuestion {
  id: number;
  user: string;
  avatar: string;
  question: string;
  answers: number;
  age: string;
}

interface CommunityRulebook {
  id: number;
  submitter: string;
  submitted: string;
  pages: number;
  status: "Needs review" | "In review";
}

interface Channel {
  id: string;
  name: string;
  emoji: string;
  type: "game" | "general";
  questions: CommunityQuestion[];
  rulebook?: CommunityRulebook;
  lastActivity: string;
  unread: number;
}

const CHANNELS: Channel[] = [
  {
    id: "general",
    name: "chit-chat",
    emoji: "💬",
    type: "general",
    lastActivity: "2 min ago",
    unread: 3,
    questions: [
      { id: 101, user: "Priya S.", avatar: "😄", question: "Anyone else play board games every Friday? Looking for people in Austin to join our group!", answers: 5, age: "2 min ago" },
      { id: 102, user: "Leo K.", avatar: "🎮", question: "What's everyone's go-to game for a group of 6 that includes first-timers?", answers: 8, age: "14 min ago" },
      { id: 103, user: "Bea R.", avatar: "🙂", question: "Does TableMaster work offline or does it need internet?", answers: 2, age: "1 hr ago" },
    ],
  },
  {
    id: "catan",
    name: "catan",
    emoji: "🏝️",
    type: "game",
    lastActivity: "5 min ago",
    unread: 2,
    questions: [
      { id: 1, user: "Riley M.", avatar: "🙋", question: "Can I build a city on my first turn if I somehow have enough ore and grain?", answers: 2, age: "5 min ago" },
      { id: 6, user: "Omar T.", avatar: "🤨", question: "Does the robber block a harbor? Like if I place it on a coastal hex, does that affect trading?", answers: 0, age: "22 min ago" },
      { id: 7, user: "Dana W.", avatar: "😅", question: "Can you trade development cards with other players, or only resource cards?", answers: 1, age: "55 min ago" },
    ],
    rulebook: { id: 10, submitter: "Marcus F.", submitted: "3 hours ago", pages: 18, status: "Needs review" },
  },
  {
    id: "codenames",
    name: "codenames",
    emoji: "🕵️",
    type: "game",
    lastActivity: "12 min ago",
    unread: 1,
    questions: [
      { id: 2, user: "Drew K.", avatar: "🤔", question: "What happens if the spymaster accidentally touches a card while giving a clue?", answers: 0, age: "12 min ago" },
      { id: 8, user: "Yuki P.", avatar: "🤓", question: "Can a clue word be a proper noun, like a city name or a person's name?", answers: 3, age: "2 hrs ago" },
    ],
  },
  {
    id: "pandemic",
    name: "pandemic",
    emoji: "🦠",
    type: "game",
    lastActivity: "28 min ago",
    unread: 0,
    questions: [
      { id: 3, user: "Sam T.", avatar: "😰", question: "Do Epidemic cards reshuffle the discard pile before or after drawing the top card?", answers: 1, age: "28 min ago" },
      { id: 9, user: "Fiona B.", avatar: "🧐", question: "Can the Medic clear disease cubes from cities she's just passing through on the same turn?", answers: 4, age: "3 hrs ago" },
    ],
  },
  {
    id: "ticket",
    name: "ticket-to-ride",
    emoji: "🚂",
    type: "game",
    lastActivity: "41 min ago",
    unread: 0,
    questions: [
      { id: 4, user: "Casey L.", avatar: "🧐", question: "Can two players share the same route in a 3-player game on the Europe map?", answers: 3, age: "41 min ago" },
    ],
  },
  {
    id: "betrayal",
    name: "betrayal",
    emoji: "👻",
    type: "game",
    lastActivity: "1 hr ago",
    unread: 1,
    questions: [
      { id: 5, user: "Jordan P.", avatar: "😱", question: "If the haunt begins mid-exploration, does the traitor finish their move first?", answers: 0, age: "1 hr ago" },
      { id: 11, user: "Chris A.", avatar: "😬", question: "Are event cards reshuffled into the item deck or removed from the game after use?", answers: 2, age: "4 hrs ago" },
    ],
    rulebook: { id: 11, submitter: "Jordan P.", submitted: "Yesterday", pages: 24, status: "In review" },
  },
  {
    id: "azul",
    name: "azul",
    emoji: "🟦",
    type: "game",
    lastActivity: "2 hrs ago",
    unread: 0,
    questions: [
      { id: 12, user: "Nova B.", avatar: "🎨", question: "If I complete a row but have leftover tiles, do they all go to the floor line?", answers: 1, age: "2 hrs ago" },
    ],
    rulebook: { id: 12, submitter: "Nova B.", submitted: "2 hours ago", pages: 12, status: "Needs review" },
  },
  {
    id: "7wonders",
    name: "7-wonders",
    emoji: "🏛️",
    type: "game",
    lastActivity: "Yesterday",
    unread: 0,
    questions: [
      { id: 13, user: "Felix O.", avatar: "🏺", question: "Can I build a Wonder stage using a card I'm discarding, or does it have to be played normally?", answers: 2, age: "Yesterday" },
    ],
    rulebook: { id: 13, submitter: "Felix O.", submitted: "Yesterday", pages: 8, status: "In review" },
  },
  {
    id: "wingspan",
    name: "wingspan",
    emoji: "🦅",
    type: "game",
    lastActivity: "2 days ago",
    unread: 0,
    questions: [
      { id: 14, user: "Mia C.", avatar: "🦜", question: "If a bird's power says 'when another player plays a bird,' does that include all players or just the one to my left?", answers: 0, age: "2 days ago" },
    ],
    rulebook: { id: 14, submitter: "Mia C.", submitted: "2 days ago", pages: 20, status: "Needs review" },
  },
];

function ChannelFeed({
  channel,
  onBack,
}: {
  channel: Channel;
  onBack: () => void;
}) {
  const [answered, setAnswered] = useState<Record<number, boolean>>({});
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<number | null>(null);
  const [approved, setApproved] = useState(false);

  const isGeneral = channel.type === "general";

  return (
    <div className="flex flex-col h-full">
      {/* Channel header */}
      <div className="flex-none px-4 pt-3 pb-3 border-b border-border">
        <button onClick={onBack} className="text-xs text-plum font-semibold mb-2 active:opacity-70">
          ← All channels
        </button>
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-none ${isGeneral ? "bg-plum-light" : "bg-cream border border-border"}`}>
            {channel.emoji}
          </div>
          <div>
            <h2 className="font-black text-base text-ink leading-none" style={{ fontFamily: "Nunito" }}>
              #{channel.name}
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              {channel.questions.length} {channel.questions.length === 1 ? "post" : "posts"}
              {channel.rulebook ? " · 1 rulebook pending" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3 space-y-3">
        {/* Rulebook card (game channels only) */}
        {channel.rulebook && !approved && (
          <div className="bg-amber-light/40 rounded-2xl border border-amber-warm/25 p-3.5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-amber-warm uppercase tracking-wide">📖 Rulebook pending review</span>
              <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${channel.rulebook.status === "In review" ? "bg-amber-light text-amber-warm" : "bg-border text-ink-muted"}`}>
                {channel.rulebook.status}
              </span>
            </div>
            <p className="text-xs text-ink-muted mb-2.5">
              Uploaded by <span className="font-semibold text-ink">{channel.rulebook.submitter}</span> · {channel.rulebook.submitted} · {channel.rulebook.pages} pages
            </p>
            <div className="flex gap-2">
              <button className="flex-1 text-xs font-semibold text-plum bg-white border border-plum/20 py-1.5 rounded-xl active:scale-95 transition-transform">
                Preview PDF
              </button>
              <button
                onClick={() => setApproved(true)}
                className="flex-1 text-xs font-semibold text-green-game bg-green-light py-1.5 rounded-xl active:scale-95 transition-transform"
              >
                Approve ✓
              </button>
            </div>
          </div>
        )}
        {channel.rulebook && approved && (
          <div className="bg-green-light/40 rounded-2xl border border-green-game/25 px-4 py-3 text-center">
            <p className="text-xs font-bold text-green-game">✓ Rulebook approved — added to the library!</p>
          </div>
        )}

        {/* Questions */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-ink-muted uppercase tracking-wide">
            {isGeneral ? "Discussion" : "Open questions"}
          </p>
          {!isGeneral && (
            <span className="text-xs bg-green-light text-green-game font-bold px-2 py-0.5 rounded-full">+5 ⭐ each</span>
          )}
        </div>

        {channel.questions.map((q) => {
          const isExpanded = expanded === q.id;
          const isDone = answered[q.id];
          return (
            <div
              key={q.id}
              className={`bg-card rounded-2xl border transition-all ${isDone ? "border-green-game/30 bg-green-light/10" : "border-border"}`}
            >
              <button
                onClick={() => !isDone && setExpanded(isExpanded ? null : q.id)}
                className="w-full text-left p-3.5"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-cream border border-border flex items-center justify-center text-sm flex-none">
                    {q.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-semibold text-ink">{q.user}</span>
                      <span className="ml-auto text-xs text-ink-muted/50 flex-none">{q.age}</span>
                    </div>
                    <p className="text-sm text-ink leading-snug">{q.question}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-ink-muted">{q.answers} {q.answers === 1 ? "reply" : "replies"}</span>
                      {isDone
                        ? <span className="text-xs text-green-game font-bold">✓ Answered · +5 credits pending</span>
                        : <span className="text-xs text-plum font-semibold">{isExpanded ? "Close ↑" : isGeneral ? "Reply →" : "Answer →"}</span>
                      }
                    </div>
                  </div>
                </div>
              </button>
              {isExpanded && !isDone && (
                <div className="px-3.5 pb-3.5 border-t border-border pt-3">
                  <textarea
                    placeholder={isGeneral ? "Write a reply…" : "Type your answer — cite the rulebook page if you can…"}
                    value={drafts[q.id] ?? ""}
                    onChange={(e) => setDrafts((p) => ({ ...p, [q.id]: e.target.value }))}
                    className="w-full text-sm text-ink placeholder-ink-muted/50 bg-cream border border-border rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-plum/50 leading-relaxed"
                    rows={3}
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setExpanded(null)} className="flex-none text-xs text-ink-muted px-3 py-2 rounded-xl border border-border bg-card">
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (drafts[q.id]?.trim()) {
                          setAnswered((p) => ({ ...p, [q.id]: true }));
                          setExpanded(null);
                        }
                      }}
                      disabled={!drafts[q.id]?.trim()}
                      className="flex-1 text-xs font-bold py-2 rounded-xl bg-green-game text-white active:scale-95 transition-transform disabled:opacity-40"
                    >
                      {isGeneral ? "Post reply" : "Submit answer · +5 ⭐"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CommunityScreen() {
  const [channelSearch, setChannelSearch] = useState("");
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);

  const filteredChannels = CHANNELS.filter((ch) =>
    ch.name.toLowerCase().includes(channelSearch.toLowerCase())
  );

  const generalChannel = filteredChannels.find((ch) => ch.type === "general");
  const gameChannels = filteredChannels.filter((ch) => ch.type === "game");
  const totalUnread = CHANNELS.reduce((n, ch) => n + ch.unread, 0);

  if (activeChannel) {
    return <ChannelFeed channel={activeChannel} onBack={() => setActiveChannel(null)} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none px-5 pt-4 pb-2">
        <div className="flex items-center justify-between mb-0.5">
          <h1 className="text-xl font-black text-ink" style={{ fontFamily: "Nunito" }}>Community 🌐</h1>
          {totalUnread > 0 && (
            <span className="text-xs bg-coral text-white font-bold px-2 py-0.5 rounded-full">{totalUnread} new</span>
          )}
        </div>
        <p className="text-xs text-ink-muted">Browse channels · answer questions · earn credits</p>
      </div>

      {/* Search bar */}
      <div className="flex-none px-5 py-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted text-xs">🔍</span>
          <input
            type="text"
            placeholder="Filter channels…"
            value={channelSearch}
            onChange={(e) => setChannelSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-card border border-border text-sm text-ink placeholder-ink-muted/50 focus:outline-none focus:border-plum/40 focus:ring-2 focus:ring-plum/10 transition"
          />
        </div>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-4">

        {/* General section */}
        {generalChannel && (
          <div className="mb-1">
            <p className="text-xs font-bold text-ink-muted/70 uppercase tracking-widest px-1 mb-1.5">General</p>
            <ChannelRow channel={generalChannel} onTap={() => setActiveChannel(generalChannel)} />
          </div>
        )}

        {/* Game channels section */}
        {gameChannels.length > 0 && (
          <div>
            <p className="text-xs font-bold text-ink-muted/70 uppercase tracking-widest px-1 mb-1.5 mt-3">Games</p>
            <div className="space-y-1">
              {gameChannels.map((ch) => (
                <ChannelRow key={ch.id} channel={ch} onTap={() => setActiveChannel(ch)} />
              ))}
            </div>
          </div>
        )}

        {filteredChannels.length === 0 && (
          <div className="text-center py-10 text-ink-muted">
            <p className="text-2xl mb-2">🔍</p>
            <p className="text-sm font-medium">No channels match "{channelSearch}"</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ChannelRow({ channel, onTap }: { channel: Channel; onTap: () => void }) {
  const openQuestions = channel.questions.length;
  const hasRulebook = !!channel.rulebook;

  return (
    <button
      onClick={onTap}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-card border border-transparent hover:border-border transition-all active:scale-[0.98] text-left"
    >
      {/* Icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-none ${
        channel.type === "general" ? "bg-plum text-white" : "bg-cream border border-border"
      }`}>
        {channel.emoji}
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-ink">#{channel.name}</span>
          {hasRulebook && (
            <span className="text-xs bg-amber-light text-amber-warm px-1.5 py-0.5 rounded-full font-semibold leading-none">📖</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-ink-muted/70">{openQuestions} {openQuestions === 1 ? "post" : "posts"}</span>
          <span className="text-ink-muted/30 text-xs">·</span>
          <span className="text-xs text-ink-muted/70">{channel.lastActivity}</span>
        </div>
      </div>

      {/* Unread badge */}
      <div className="flex-none flex items-center gap-1.5">
        {channel.unread > 0 && (
          <span className="w-5 h-5 rounded-full bg-plum text-white text-xs font-bold flex items-center justify-center">
            {channel.unread}
          </span>
        )}
        <span className="text-ink-muted/30 text-sm">›</span>
      </div>
    </button>
  );
}

// ── Profile Screen ────────────────────────────────────────────────────────────
function ProfileScreen() {
  const [claimed, setClaimed] = useState<Record<string, boolean>>({});

  const earnOptions = [
    { key: "ad", icon: "📺", title: "Watch a short ad", desc: "30-second ad — instant reward", reward: "+3 credits", bg: "bg-amber-light", color: "text-amber-warm", cta: "Watch now", instant: true },
    { key: "upload", icon: "📖", title: "Upload a rulebook", desc: "Submit a new game's rules for review", reward: "+25 credits", bg: "bg-plum-light", color: "text-plum", cta: "Upload PDF", instant: false },
    { key: "answer", icon: "💬", title: "Answer a community question", desc: "Help another player with a rules dispute", reward: "+5 credits", bg: "bg-green-light", color: "text-green-game", cta: "Go to Community", instant: false },
    { key: "invite", icon: "🎉", title: "Invite a friend", desc: "They join TableMaster, you both earn", reward: "+10 credits", bg: "bg-coral/10", color: "text-coral", cta: "Share invite", instant: true },
  ];

  return (
    <div className="px-5 pt-4 pb-8 overflow-y-auto scrollbar-hide">
      {/* Profile header */}
      <div className="flex items-center gap-3.5 mb-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-plum to-[#4A2880] flex items-center justify-center text-2xl flex-none">
          😊
        </div>
        <div>
          <h2 className="font-black text-lg text-ink" style={{ fontFamily: "Nunito" }}>Alex Chen</h2>
          <p className="text-xs text-ink-muted">Member since Sept 2026 · 14 sessions</p>
        </div>
      </div>

      {/* Credit balance */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-warm to-[#D4600A] p-5 mb-5 shadow-md">
        <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Credit Balance</p>
        <div className="flex items-end gap-3">
          <span className="text-white font-black text-5xl" style={{ fontFamily: "Nunito" }}>42</span>
          <span className="text-white/70 text-sm font-medium pb-1">credits</span>
        </div>
        <div className="mt-3 flex gap-2">
          <div className="bg-white/20 rounded-xl px-3 py-1.5 text-center">
            <p className="text-white font-bold text-xs">1 credit</p>
            <p className="text-white/65 text-xs">= 1 AI session</p>
          </div>
          <div className="bg-white/20 rounded-xl px-3 py-1.5 text-center">
            <p className="text-white font-bold text-xs">3 credits</p>
            <p className="text-white/65 text-xs">= unlimited Q&A</p>
          </div>
        </div>
      </div>

      {/* Earn more */}
      <h3 className="font-black text-base text-ink mb-1" style={{ fontFamily: "Nunito" }}>Earn more credits</h3>
      <p className="text-xs text-ink-muted mb-3">Help the community or watch a quick ad.</p>

      <div className="space-y-2.5 mb-5">
        {earnOptions.map((opt) => (
          <div key={opt.key} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl ${opt.bg} flex items-center justify-center text-lg flex-none`}>{opt.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="font-bold text-sm text-ink" style={{ fontFamily: "Nunito" }}>{opt.title}</p>
                {!opt.instant && <span className="text-xs bg-border text-ink-muted px-1.5 py-0.5 rounded-full font-medium">pending</span>}
              </div>
              <p className="text-xs text-ink-muted leading-snug">{opt.desc}</p>
              <p className={`text-xs font-bold mt-0.5 ${opt.color}`}>{opt.reward}</p>
            </div>
            <button
              onClick={() => opt.instant && setClaimed((p) => ({ ...p, [opt.key]: true }))}
              disabled={claimed[opt.key]}
              className={`flex-none text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-95 whitespace-nowrap ${claimed[opt.key] ? "bg-border text-ink-muted cursor-default" : `${opt.bg} ${opt.color}`}`}
            >
              {claimed[opt.key] ? "Done ✓" : opt.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Stats */}
      <h3 className="font-black text-base text-ink mb-3" style={{ fontFamily: "Nunito" }}>Your activity</h3>
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {[
          { label: "Sessions played", value: "14", icon: "🎲" },
          { label: "Questions answered", value: "7", icon: "💬" },
          { label: "Credits earned", value: "138", icon: "⭐" },
          { label: "Rulebooks uploaded", value: "1", icon: "📖" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-2xl border border-border p-3.5 text-center">
            <p className="text-2xl mb-1">{stat.icon}</p>
            <p className="font-black text-lg text-ink" style={{ fontFamily: "Nunito" }}>{stat.value}</p>
            <p className="text-xs text-ink-muted leading-tight">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="rounded-2xl bg-border/40 px-4 py-3">
        <p className="text-xs text-ink-muted text-center leading-relaxed">
          Uploaded rulebooks and community answers are reviewed within 24–48 hours before credits are awarded.
        </p>
      </div>
    </div>
  );
}
