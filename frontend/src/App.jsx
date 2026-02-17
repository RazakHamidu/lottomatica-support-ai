import ChatWidget from "./components/ChatWidget";
import "./styles/chat.css";

/* Logo ufficiale Lottomatica: LOTTO (bold) + matica (regular) in blu */
function LottomaticaLogo({ white = false }) {
  const color = white ? "white" : "#003DA5";
  return (
    <span style={{ fontSize: 22, lineHeight: 1, userSelect: "none" }}>
      <span style={{ fontWeight: 900, color, letterSpacing: "-1px", textTransform: "uppercase" }}>LOTTO</span>
      <span style={{ fontWeight: 400, color, letterSpacing: "-0.5px" }}>matica</span>
    </span>
  );
}

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", minHeight: "100vh", background: "#f5f7fa" }}>
      {/* Header Lottomatica */}
      <header style={{
        background: "#003DA5",
        padding: "14px 32px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
      }}>
        <LottomaticaLogo white />
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginLeft: 2 }}>— AI Support Demo</span>
      </header>

      <main style={{ maxWidth: 760, margin: "60px auto", padding: "0 24px" }}>
        <h1 style={{ color: "#1a1a1a", fontSize: 28, marginBottom: 12 }}>
          Benvenuto su Lottomatica
        </h1>
        <p style={{ color: "#555", lineHeight: 1.7, marginBottom: 24 }}>
          Hai bisogno di assistenza? Il nostro assistente virtuale <strong>LottAssist</strong> è disponibile 24/7 per rispondere a tutte le tue domande su account, pagamenti, scommesse e molto altro.
        </p>

        <div style={{
          background: "#e8eef8",
          border: "1px solid #c0d0f0",
          borderRadius: 10,
          padding: "16px 20px",
          marginBottom: 32
        }}>
          <strong style={{ color: "#003DA5" }}>🤖 LottAssist — AI Customer Support Demo</strong>
          <p style={{ color: "#555", margin: "8px 0 0", fontSize: 14, lineHeight: 1.6 }}>
            Progetto che dimostra come l'AI Generativa con RAG può migliorare drasticamente il supporto clienti Lottomatica (attuale Trustpilot: 1.2/5). Clicca sull'icona chat in basso a destra per provare.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 40 }}>
          {[
            { emoji: "🔐", title: "Verifica Account (KYC)", desc: "Chiedi info su documenti e validazione" },
            { emoji: "💳", title: "Pagamenti", desc: "Depositi, prelievi, metodi di pagamento" },
            { emoji: "🎁", title: "Bonus e Promozioni", desc: "Requisiti di puntata e offerte" },
            { emoji: "⚽", title: "Scommesse Sportive", desc: "Come piazzare scommesse, cashout" },
            { emoji: "🛡️", title: "Gioco Responsabile", desc: "Autoesclusione e limiti di gioco" },
            { emoji: "👤", title: "Gestione Account", desc: "Password, dati personali, sicurezza" },
          ].map((item, i) => (
            <div key={i} style={{
              background: "white",
              border: "1px solid #e0e0e0",
              borderRadius: 10,
              padding: "16px",
            }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{item.emoji}</div>
              <div style={{ fontWeight: 600, color: "#1a1a1a", fontSize: 15 }}>{item.title}</div>
              <div style={{ color: "#777", fontSize: 13, marginTop: 4 }}>{item.desc}</div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: "center", color: "#aaa", fontSize: 13 }}>
          Powered by Google Gemini + RAG (NumPy) · FastAPI + React
        </p>
      </main>

      <ChatWidget />
    </div>
  );
}
