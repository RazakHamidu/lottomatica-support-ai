import { useState, useRef, useEffect } from "react";
import ChatHeader from "./ChatHeader";
import ChatMessage from "./ChatMessage";
import ChatInput from "./ChatInput";
import TypingIndicator from "./TypingIndicator";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const WELCOME_MESSAGE = {
  role: "assistant",
  content: "Ciao! Sono LottAssist, il tuo assistente virtuale Lottomatica. 👋\n\nCome posso aiutarti oggi? Puoi chiedermi informazioni su:\n- Verifica account e documenti\n- Depositi e prelievi\n- Bonus e promozioni\n- Gioco responsabile\n- Scommesse sportive",
  time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
  sources: [],
  streaming: false,
};

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [hasUnread, setHasUnread] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleOpen = () => {
    setIsOpen(true);
    setHasUnread(false);
  };

  const handleSend = async (text) => {
    const now = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

    // Aggiunge il messaggio utente
    setMessages((prev) => [...prev, { role: "user", content: text, time: now }]);
    setIsLoading(true);

    // Segnaposto per il messaggio bot (verrà aggiornato chunk per chunk)
    const botPlaceholder = {
      role: "assistant",
      content: "",
      time: now,
      sources: [],
      streaming: true,
    };

    try {
      const res = await fetch(`${API_URL}/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversation_id: conversationId }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Aggiunge subito il placeholder bot (mostra il cursore)
      setMessages((prev) => [...prev, botPlaceholder]);
      setIsLoading(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // l'ultima riga potrebbe essere incompleta

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "init") {
              if (!conversationId) setConversationId(event.conversation_id);

            } else if (event.type === "chunk") {
              // Aggiorna l'ultimo messaggio (bot) con il nuovo testo
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, content: last.content + event.text };
                return updated;
              });

            } else if (event.type === "done") {
              // Stream terminato: rimuovi il flag streaming e aggiungi le fonti
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = { ...last, streaming: false, sources: event.sources || [] };
                return updated;
              });

            } else if (event.type === "error") {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: "Mi dispiace, si è verificato un errore tecnico. Contatta il supporto al **800 900 009** (lun-dom 9:00-22:00).",
                  streaming: false,
                  sources: [],
                };
                return updated;
              });
            }
          } catch (_) {
            // JSON non valido, ignora
          }
        }
      }
    } catch (err) {
      setIsLoading(false);
      setMessages((prev) => {
        // Se il placeholder è già stato aggiunto, aggiornalo; altrimenti aggiungilo
        const last = prev[prev.length - 1];
        const errMsg = {
          role: "assistant",
          content: "Mi dispiace, si è verificato un errore tecnico. Per assistenza immediata contatta il supporto al **800 900 009** (lun-dom 9:00-22:00).",
          time: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
          sources: [],
          streaming: false,
        };
        if (last?.streaming) {
          const updated = [...prev];
          updated[updated.length - 1] = errMsg;
          return updated;
        }
        return [...prev, errMsg];
      });
    }
  };

  const handleFeedback = async (messageIndex, rating) => {
    if (!conversationId) return;
    try {
      await fetch(`${API_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId, message_index: messageIndex, rating }),
      });
    } catch (_) {}
  };

  const showQuickReplies = messages.length === 1;

  return (
    <>
      <button
        className={`chat-fab ${isOpen ? "hidden" : ""}`}
        onClick={handleOpen}
        aria-label="Apri assistente virtuale"
      >
        <svg viewBox="0 0 24 24" fill="white" width="28" height="28">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
        {hasUnread && <span className="fab-badge">1</span>}
      </button>

      {isOpen && (
        <div className="chat-window">
          <ChatHeader onClose={() => setIsOpen(false)} />
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                message={msg}
                onFeedback={(rating) => handleFeedback(i, rating)}
              />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
          <ChatInput
            onSend={handleSend}
            disabled={isLoading || messages[messages.length - 1]?.streaming}
            showQuickReplies={showQuickReplies}
          />
        </div>
      )}
    </>
  );
}
