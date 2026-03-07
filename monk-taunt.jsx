import { useState } from "react";

const SYSTEM_PROMPT = `Ти си летящ монах в DnD битка — пиян мъдрец, който се носи из бойното поле, хвърля дартове и дразни враговете да стрелят по него вместо по танка. Имаш способността Deflect Missiles и я обичаш. Говориш на български с груб, саркастичен тон и пиянска мъдрост. 

Генерирай САМО ЕДНА кратка бойна реплика (1-2 изречения максимум). Репликата трябва да:
- Предизвиква врага да те атакува тебе
- Е саркастична, присмехулна, с нотка на пиянска философия
- Намеква за дартовете или полета ти
- Понякога да споменава Deflect Missiles по абсурден начин
- Да звучи като нещо което реален DnD играч би извикал на масата

Отговаряй САМО с репликата, без кавички, без обяснения.`;

export default function MonkTaunt() {
  const [taunt, setTaunt] = useState("");
  const [loading, setLoading] = useState(false);
  const [dartCount, setDartCount] = useState(0);

  const generateTaunt = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: "Дай ми реплика за тази атака." }],
        }),
      });
      const data = await response.json();
      const text = data.content?.find(b => b.type === "text")?.text || "...";
      setTaunt(text);
      setDartCount(c => c + 1);
    } catch (e) {
      setTaunt("Дори API-то ме избягва. Разумно.");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0d0a07",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Palatino Linotype', 'Book Antiqua', serif",
      padding: "2rem",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background texture */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(139,69,19,0.15) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 20%, rgba(184,134,11,0.1) 0%, transparent 50%)`,
        pointerEvents: "none",
      }} />

      {/* Floating darts decoration */}
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          fontSize: "1.2rem",
          opacity: 0.15,
          transform: `rotate(${-30 + i * 25}deg)`,
          top: `${10 + i * 14}%`,
          left: i % 2 === 0 ? `${5 + i * 3}%` : `${75 + i * 3}%`,
          animation: `float${i} ${3 + i * 0.5}s ease-in-out infinite alternate`,
        }}>🎯</div>
      ))}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes appear { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .taunt-text { animation: appear 0.4s ease-out; }
        .dart-btn:hover { transform: translateY(-2px); box-shadow: 0 0 30px rgba(184,134,11,0.5) !important; }
        .dart-btn:active { transform: translateY(0px) scale(0.98); }
        .dart-btn { transition: all 0.2s ease; }
      `}</style>

      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <div style={{ fontSize: "2.8rem", marginBottom: "0.3rem" }}>🍺⚡🎯</div>
        <h1 style={{
          color: "#d4a853",
          fontSize: "1.8rem",
          fontWeight: "bold",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          margin: 0,
          textShadow: "0 0 20px rgba(212,168,83,0.4)",
        }}>Летящият Монах</h1>
        <p style={{
          color: "#8b6914",
          fontSize: "0.85rem",
          letterSpacing: "0.2em",
          marginTop: "0.4rem",
          textTransform: "uppercase",
        }}>Battle Taunt Generator — Ниво 5</p>
      </div>

      {/* Taunt Display */}
      <div style={{
        width: "100%",
        maxWidth: "520px",
        minHeight: "130px",
        background: "rgba(20,12,4,0.8)",
        border: "1px solid rgba(184,134,11,0.3)",
        borderRadius: "4px",
        padding: "2rem",
        marginBottom: "2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        boxShadow: "inset 0 0 40px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.5)",
      }}>
        {/* Corner decorations */}
        {["top:0;left:0;border-top:2px solid;border-left:2px solid",
          "top:0;right:0;border-top:2px solid;border-right:2px solid",
          "bottom:0;left:0;border-bottom:2px solid;border-left:2px solid",
          "bottom:0;right:0;border-bottom:2px solid;border-right:2px solid"].map((s, i) => (
          <div key={i} style={{
            position: "absolute", width: "12px", height: "12px",
            borderColor: "#8b6914",
            ...Object.fromEntries(s.split(";").map(p => { const [k,v] = p.split(":"); return [k, v]; }))
          }} />
        ))}

        {loading ? (
          <div style={{
            color: "#8b6914",
            fontSize: "1.5rem",
            animation: "spin 1s linear infinite",
          }}>🎯</div>
        ) : taunt ? (
          <p className="taunt-text" style={{
            color: "#f0d080",
            fontSize: "1.25rem",
            lineHeight: "1.6",
            textAlign: "center",
            margin: 0,
            fontStyle: "italic",
            textShadow: "0 0 10px rgba(212,168,83,0.2)",
          }}>"{taunt}"</p>
        ) : (
          <p style={{
            color: "#4a3520",
            fontSize: "1rem",
            textAlign: "center",
            margin: 0,
            fontStyle: "italic",
          }}>Чакам следващия ход...</p>
        )}
      </div>

      {/* Button */}
      <button
        className="dart-btn"
        onClick={generateTaunt}
        disabled={loading}
        style={{
          background: loading
            ? "rgba(80,55,20,0.5)"
            : "linear-gradient(135deg, #8b5e0a, #c4922a, #8b5e0a)",
          border: "1px solid #c4922a",
          borderRadius: "3px",
          color: loading ? "#6b4f20" : "#fff8e7",
          fontSize: "1.1rem",
          fontFamily: "inherit",
          fontWeight: "bold",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          padding: "1rem 2.5rem",
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 0 15px rgba(184,134,11,0.2)",
        }}
      >
        {loading ? "Хвърлям..." : "⚡ Хвърли Дарт + Провокирай"}
      </button>

      {/* Counter */}
      {dartCount > 0 && (
        <p style={{
          color: "#5a3f1a",
          fontSize: "0.8rem",
          marginTop: "1.5rem",
          letterSpacing: "0.1em",
        }}>
          Дартове хвърлени тази сесия: <span style={{ color: "#8b6914" }}>{dartCount}</span>
        </p>
      )}

      {/* Deflect Missiles reminder */}
      <div style={{
        marginTop: "2.5rem",
        padding: "0.6rem 1.2rem",
        border: "1px solid rgba(100,70,20,0.4)",
        borderRadius: "2px",
        color: "#5a3f1a",
        fontSize: "0.75rem",
        letterSpacing: "0.08em",
        textAlign: "center",
      }}>
        🛡️ DEFLECT MISSILES READY · AC ОЩЕ ДЪРЖИ · ТАНКЪТ Е SAFE
      </div>
    </div>
  );
}
