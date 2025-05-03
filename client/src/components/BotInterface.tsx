import { useState, useRef, useEffect } from "react";
import { User, CatalogItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import BotMessage from "./BotMessage";
import UserMessage from "./UserMessage";
import CommandInput from "./CommandInput";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface BotInterfaceProps {
  users: User[];
  catalogItems: CatalogItem[];
  isLoading: boolean;
}

type MessageType = {
  id: string;
  type: "bot" | "user";
  content: any;
  timestamp: Date;
};

export default function BotInterface({ users, catalogItems, isLoading }: BotInterfaceProps) {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Set the default active user when users are loaded
  useEffect(() => {
    if (users.length > 0 && !activeUser) {
      setActiveUser(users[0]);
    }
  }, [users, activeUser]);

  // Add welcome message when component first loads
  useEffect(() => {
    if (messages.length === 0 && !isLoading) {
      setMessages([
        {
          id: "welcome",
          type: "bot",
          content: {
            type: "help",
            content: {
              commands: [
                { name: "!balance", description: "Check your current balance" },
                { name: "!catalogue", description: "View items available for purchase" },
                { name: "!buy [item]", description: "Purchase an item from the catalogue" },
                { name: "!bargain [item] [price]", description: "Make a bargain offer for an item" },
                { name: "!transactions", description: "View your recent transactions (last 5)" },
                { name: "!help", description: "Display this help message" }
              ]
            }
          },
          timestamp: new Date()
        }
      ]);
    }
  }, [isLoading, messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Command processing mutation
  const commandMutation = useMutation({
    mutationFn: async (command: string) => {
      if (!activeUser) throw new Error("No active user selected");
      
      const response = await apiRequest(
        "POST",
        "/api/simulate-command",
        {
          userId: activeUser.id,
          command
        }
      );
      
      return response.json();
    },
    onSuccess: (data) => {
      // Add bot response to messages
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "bot",
          content: data,
          timestamp: new Date()
        }
      ]);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  });

  const handleSendCommand = (command: string) => {
    if (!command.trim()) return;
    
    // Add user message to chat
    setMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        type: "user",
        content: command,
        timestamp: new Date()
      }
    ]);
    
    // Process command
    commandMutation.mutate(command);
  };

  return (
    <div className="chat-container h-100">
      {/* Bot messages and user interactions */}
      <div 
        ref={chatAreaRef}
        className="chat-messages"
        id="chat-area"
      >
        {messages.map((message) => (
          message.type === "bot" ? (
            <BotMessage
              key={message.id}
              content={message.content}
              timestamp={message.timestamp}
              currentUser={activeUser}
              catalogItems={catalogItems}
              onCommandSelect={handleSendCommand}
            />
          ) : (
            <UserMessage
              key={message.id}
              content={message.content as string}
            />
          )
        ))}
        
        {commandMutation.isPending && (
          <div className="d-flex align-items-center justify-content-center my-4">
            <div className="spinner-border spinner-border-sm text-discord-muted" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}
      </div>

      {/* Command Input Area */}
      <CommandInput 
        onSendCommand={handleSendCommand} 
        isLoading={commandMutation.isPending}
        users={users}
        activeUser={activeUser}
        onChangeUser={setActiveUser}
      />
    </div>
  );
}
