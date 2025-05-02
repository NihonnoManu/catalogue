import React from "react";

interface UserMessageProps {
  content: string;
}

export default function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex mb-4 justify-end">
      <div className="bg-accent rounded-lg p-3 max-w-lg">
        <p>{content}</p>
      </div>
    </div>
  );
}
