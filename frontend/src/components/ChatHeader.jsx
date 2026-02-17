export default function ChatHeader({ onClose }) {
  return (
    <div className="chat-header">
      <div className="chat-header-left">
        <div className="bot-avatar-header">
          <div className="mini-logo">LOTTO<span>m</span></div>
        </div>
        <div className="chat-header-info">
          <span className="chat-header-name">LottAssist</span>
          <span className="chat-header-status">
            <span className="status-dot"></span>
            Online
          </span>
        </div>
      </div>
      <button className="chat-close-btn" onClick={onClose} aria-label="Chiudi chat">
        ✕
      </button>
    </div>
  );
}
