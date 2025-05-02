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
    <div className="p-4 border-t border-black/20 bg-sidebar">
      {users.length > 0 && (
        <div className="mb-3">
          <Select
            value={activeUser?.id.toString() || ""}
            onValueChange={handleUserChange}
            disabled={isLoading}
          >
            <SelectTrigger className="w-full bg-background border-none">
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Active User</SelectLabel>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.displayName}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex">
        <Input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Type a command (!help, !balance, !catalogue, !buy [item])"
          className="flex-1 rounded-l-md bg-background border-none outline-none text-foreground p-3"
          disabled={isLoading || !activeUser}
          aria-label="Command input"
        />
        <Button
          type="submit"
          variant="default"
          className="bg-primary text-white px-4 rounded-r-md hover:bg-opacity-80 transition-colors"
          disabled={isLoading || !command.trim() || !activeUser}
        >
          {isLoading ? (
            <span className="flex items-center">
              <span className="animate-spin mr-1">&#9696;</span> 
              Processing
            </span>
          ) : (
            "Send"
          )}
        </Button>
      </form>
    </div>
  );
}
