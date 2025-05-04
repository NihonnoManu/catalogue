import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User } from "@shared/schema";
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface CommandInputProps {
  onSendCommand: (command: string) => void;
  isLoading: boolean;
  users: User[];
  activeUser: User | null;
  onChangeUser: (user: User) => void;
}

export default function CommandInput({ 
  onSendCommand, 
  isLoading,
  users,
  activeUser,
  onChangeUser
}: CommandInputProps) {
  const [command, setCommand] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isLoading) return;
    
    onSendCommand(command);
    setCommand("");
  };

  const handleUserChange = (userId: string) => {
    const user = users.find(u => u.id.toString() === userId);
    if (user) {
      onChangeUser(user);
    }
  };

  return (
    <div className="command-input">
      {users.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="user-list d-flex gap-2 mb-0">
            {users.map(user => (
              <div 
                key={user.id} 
                className={`user-item py-2 px-3 rounded ${activeUser?.id === user.id ? 'active' : ''}`}
                onClick={() => handleUserChange(user.id.toString())}
                style={{ cursor: 'pointer' }}
              >
                <div className="user-avatar" style={{ 
                  backgroundColor: user.id === 1 ? '#5865F2' : '#ED4245',
                  width: '32px',
                  height: '32px',
                  fontSize: '14px'
                }}>
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="user-info ms-2">
                  <div className="user-name">{user.displayName}</div>
                  <div className="user-balance">{user.balance} points</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="input-wrapper">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Type a command (!help, !balance, !catalogue, !buy [item])"
          disabled={isLoading || !activeUser}
          aria-label="Command input"
        />
        <button
          type="submit"
          className="send-button"
          disabled={isLoading || !command.trim() || !activeUser}
        >
          {isLoading ? (
            <div className="spinner-border spinner-border-sm text-discord-blurple" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" fill="currentColor" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
