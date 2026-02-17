import { useState, useRef } from "react";

const QUICK_REPLIES = [
  "Come verifico il mio account?",
  "Problemi con il deposito",
  "Il mio account è bloccato",
  "Come prelevo le vincite?",
  "Voglio autoescludermi",
  "Come funziona il bonus?",
];

export default function ChatInput({ onSend, disabled, showQuickReplies }) {
  const [input, setInput] = useState("");
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  return (
    <div className="chat-input-area">
      {showQuickReplies && (
        <div className="quick-replies">
          {QUICK_REPLIES.map((reply, i) => (
            <button
              key={i}
              className="quick-reply-btn"
              onClick={() => onSend(reply)}
              disabled={disabled}
            >
              {reply}
            </button>
          ))}
        </div>
      )}
      <form className="chat-input-form" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Scrivi un messaggio..."
          disabled={disabled}
          rows={1}
        />
        <button
          type="submit"
          className={`send-btn ${input.trim() && !disabled ? "active" : ""}`}
          disabled={!input.trim() || disabled}
          aria-label="Invia messaggio"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
