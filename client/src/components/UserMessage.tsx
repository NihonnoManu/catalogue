import React from "react";

interface UserMessageProps {
  content: string;
}

export default function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="message message-user">
      <div className="message-avatar" style={{backgroundColor: '#ED4245'}}>
        <span>U</span>
      </div>
      <div className="message-content">
        <p>{content}</p>
      </div>
    </div>
  );
}
