import { useState } from "react";

export default function ChatMessage({ message, onFeedback }) {
  const [feedbackGiven, setFeedbackGiven] = useState(null);
  const isBot = message.role === "assistant";

  const handleFeedback = (rating) => {
    setFeedbackGiven(rating);
    onFeedback?.(rating);
  };

  const formatText = (text) => {
    // Converti markdown basilare in HTML
    return text
      .split("\n")
      .map((line, i) => {
        if (line.startsWith("## ")) return <h4 key={i}>{line.slice(3)}</h4>;
        if (line.startsWith("**") && line.endsWith("**")) {
          return <strong key={i}>{line.slice(2, -2)}</strong>;
        }
        if (line.match(/^\d+\) /)) {
          return <div key={i} className="list-item">{line}</div>;
        }
        if (line === "") return <br key={i} />;
        return <span key={i}>{line}<br /></span>;
      });
  };

  return (
    <div className={`message ${isBot ? "bot-message" : "user-message"}`}>
      {isBot && <div className="bot-avatar">LM</div>}
      <div className="message-content">
        <div className={`message-bubble ${isBot ? "bot-bubble" : "user-bubble"}`}>
          {isBot ? formatText(message.content) : message.content}
          {isBot && message.streaming && <span className="streaming-cursor" />}
        </div>
        <div className="message-footer">
          <span className="message-time">{message.time}</span>
          {isBot && !message.streaming && !feedbackGiven && (
            <div className="feedback-buttons">
              <button
                className="feedback-btn"
                onClick={() => handleFeedback(1)}
                title="Risposta utile"
              >👍</button>
              <button
                className="feedback-btn"
                onClick={() => handleFeedback(-1)}
                title="Risposta non utile"
              >👎</button>
            </div>
          )}
          {isBot && !message.streaming && feedbackGiven && (
            <span className="feedback-thanks">
              {feedbackGiven === 1 ? "Grazie! 😊" : "Grazie per il feedback"}
            </span>
          )}
        </div>
        {isBot && message.sources?.length > 0 && (
          <div className="message-sources">
            {message.sources.map((s, i) => (
              <span key={i} className="source-tag">{s.category}</span>
            ))}
          </div>
        )}
      </div>
      {!isBot && <div className="user-avatar">U</div>}
    </div>
  );
}
