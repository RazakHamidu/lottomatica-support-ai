export default function TypingIndicator() {
  return (
    <div className="message bot-message typing-message">
      <div className="bot-avatar">L</div>
      <div className="message-bubble typing-bubble">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </div>
    </div>
  );
}
