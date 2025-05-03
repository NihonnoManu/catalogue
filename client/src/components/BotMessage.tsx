import { formatDistanceToNow } from "date-fns";
import { User, CatalogItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BotMessageProps {
  content: any;
  timestamp: Date;
  currentUser: User | null;
  catalogItems: CatalogItem[];
  onCommandSelect: (command: string) => void;
}

export default function BotMessage({ 
  content, 
  timestamp, 
  currentUser, 
  catalogItems,
  onCommandSelect
}: BotMessageProps) {
  const messageTime = formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  
  const renderMessageContent = () => {
    if (!content) return <p>No content to display</p>;
    
    if (content.type === "error") {
      return (
        <div className="mt-1 max-w-2xl">
          <div className="bg-secondary rounded p-3 border-l-4 border-destructive">
            <p className="text-destructive font-medium">Error</p>
            <p>{content.content}</p>
          </div>
        </div>
      );
    }
    
    if (content.type === "help") {
      return (
        <div className="mt-1 max-w-2xl">
          <p>Welcome to the MiniPoints Economy System! Here are the commands you can use:</p>
          <div className="mt-2 bg-secondary rounded p-3 border border-black/10">
            <ul className="space-y-2">
              {content.content.commands.map((cmd: { name: string, description: string }, index: number) => (
                <li key={index}>
                  <code className="bg-background px-1 py-0.5 rounded">{cmd.name}</code> - {cmd.description}
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    }
    
    if (content.type === "balance") {
      const user = content.content.user;
      return (
        <div className="mt-1 max-w-2xl">
          <div className="bg-secondary rounded p-3 border border-black/10">
            <h3 className="font-semibold text-white mb-2">Current Balance</h3>
            <p className="mb-2">
              <span className="text-muted-foreground mr-2">User:</span>
              <span className="font-medium">{user.displayName}</span>
            </p>
            <p>
              <span className="text-muted-foreground mr-2">Balance:</span>
              <span className="font-bold text-primary">{user.balance} MP</span>
            </p>
          </div>
        </div>
      );
    }
    
    if (content.type === "catalogue") {
      return (
        <div className="mt-1 max-w-3xl">
          <div className="bg-secondary rounded p-3 border border-black/10">
            <h3 className="font-semibold text-white mb-3">Catalogue Items</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {content.content.items.map((item: CatalogItem) => (
                <div key={item.id} className="bg-background rounded p-2 flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{item.name}</span>
                    <Badge variant="default" className="bg-primary text-white">{item.price} MP</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm mb-2">{item.description}</p>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="mt-auto text-xs"
                    onClick={() => onCommandSelect(`!buy ${item.slug}`)}
                  >
                    Buy with !buy {item.slug}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
    
    if (content.type === "purchase_success") {
      const { purchase } = content.content;
      return (
        <div className="mt-1 max-w-2xl">
          <div className="bg-secondary rounded p-3 border-l-4 border-green-500">
            <h3 className="font-semibold text-white mb-2">Purchase Successful!</h3>
            <p className="mb-2">
              <span className="text-muted-foreground">Item:</span>
              <span className="font-medium ml-1">{purchase.item.name}</span>
            </p>
            <p className="mb-2">
              <span className="text-muted-foreground">Cost:</span>
              <span className="font-medium text-destructive ml-1">-{purchase.cost} MP</span>
            </p>
            <p className="mb-2">
              <span className="text-muted-foreground">New Balance:</span>
              <span className="font-medium text-primary ml-1">{purchase.newBalance} MP</span>
            </p>
            <p className="mb-1 text-muted-foreground text-sm">
              Points have been transferred to
              <span className="font-medium ml-1">{purchase.recipient}</span>
            </p>
          </div>
        </div>
      );
    }
    
    // Default case for unknown content
    return <p>{JSON.stringify(content)}</p>;
  };

  return (
    <div className="message message-bot">
      <div className="message-avatar" style={{backgroundColor: '#5865F2'}}>
        <i className="fas fa-robot">B</i>
      </div>
      <div>
        <div className="d-flex align-items-center mb-1">
          <span className="fw-semibold text-discord-text me-2">MiniPoints Bot</span>
          <span className="message-timestamp">{messageTime}</span>
        </div>
        <div className="message-content">
          {renderMessageContent()}
        </div>
      </div>
    </div>
  );
}
