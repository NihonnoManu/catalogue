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
        <div>
          <div className="alert alert-danger p-3 mb-0">
            <p className="text-danger fw-medium mb-1">Error</p>
            <p className="mb-0">{content.content}</p>
          </div>
        </div>
      );
    }
    
    if (content.type === "help") {
      return (
        <div>
          <p>Welcome to the MiniPoints Economy System! Here are the commands you can use:</p>
          <div className="rounded bg-discord-secondary p-3 mt-2">
            <ul className="list-unstyled mb-0">
              {content.content.commands.map((cmd: { name: string, description: string }, index: number) => (
                <li key={index} className="mb-2">
                  <code className="bg-discord-accent px-2 py-1 rounded">{cmd.name}</code>
                  <span className="ms-2">{cmd.description}</span>
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
        <div>
          <div className="card bg-discord-secondary border-0">
            <div className="card-body p-3">
              <h5 className="card-title text-discord-text mb-3">Current Balance</h5>
              <div className="mb-2">
                <span className="text-discord-muted me-2">User:</span>
                <span className="fw-medium">{user.displayName}</span>
              </div>
              <div>
                <span className="text-discord-muted me-2">Balance:</span>
                <span className="fw-bold text-discord-green">{user.balance} MP</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    if (content.type === "catalogue") {
      return (
        <div>
          <div className="card bg-discord-secondary border-0">
            <div className="card-body p-3">
              <h5 className="card-title text-discord-text mb-3">Catalogue Items</h5>
              <div className="row g-2">
                {content.content.items.map((item: CatalogItem) => (
                  <div key={item.id} className="col-12 col-md-6">
                    <div className="catalog-item h-100">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="catalog-name">{item.name}</span>
                        <span className="badge bg-discord-blurple">{item.price} MP</span>
                      </div>
                      <p className="catalog-description mb-3">{item.description}</p>
                      <button 
                        className="btn btn-discord-secondary btn-sm" 
                        onClick={() => onCommandSelect(`!buy ${item.slug}`)}
                      >
                        Buy with !buy {item.slug}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    if (content.type === "purchase_success") {
      const { purchase } = content.content;
      return (
        <div>
          <div className="card bg-discord-secondary border-0 border-start border-4 border-discord-green">
            <div className="card-body p-3">
              <h5 className="card-title text-discord-text mb-3">Purchase Successful!</h5>
              <div className="mb-2">
                <span className="text-discord-muted">Item:</span>
                <span className="fw-medium ms-2">{purchase.item.name}</span>
              </div>
              <div className="mb-2">
                <span className="text-discord-muted">Cost:</span>
                <span className="fw-medium text-discord-red ms-2">-{purchase.cost} MP</span>
              </div>
              <div className="mb-2">
                <span className="text-discord-muted">New Balance:</span>
                <span className="fw-medium text-discord-green ms-2">{purchase.newBalance} MP</span>
              </div>
              <div className="text-discord-muted small">
                Points have been transferred to
                <span className="fw-medium ms-1">{purchase.recipient}</span>
              </div>
            </div>
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
