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

    if (content.type === "bargain_initiated") {
      const { bargain } = content.content;
      return (
        <div>
          <div className="card bg-discord-secondary border-0 border-start border-4 border-discord-purple">
            <div className="card-body p-3">
              <h5 className="card-title text-discord-text mb-3">Bargain Proposal</h5>
              <div className="mb-2">
                <span className="text-discord-muted">Item:</span>
                <span className="fw-medium ms-2">{bargain.item.name}</span>
              </div>
              <div className="mb-2">
                <span className="text-discord-muted">Original Price:</span>
                <span className="fw-medium ms-2">{bargain.originalPrice} MP</span>
              </div>
              <div className="mb-2">
                <span className="text-discord-muted">Your Offer:</span>
                <span className="fw-medium text-discord-green ms-2">{bargain.offeredPrice} MP</span>
              </div>
              <div className="mb-2">
                <span className="text-discord-muted">Discount:</span>
                <span className="fw-medium text-discord-green ms-2">{bargain.discount} MP ({bargain.discountPercentage}%)</span>
              </div>
              <div className="alert alert-info p-2 mt-3 mb-0 small">
                <i className="fa fa-info-circle me-2"></i>
                Your bargain request is pending approval by the other user.
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (content.type === "transactions") {
      const { transactions, message } = content.content;
      return (
        <div>
          <div className="card bg-discord-secondary border-0">
            <div className="card-body p-3">
              <h5 className="card-title text-discord-text mb-3">Recent Transactions</h5>
              
              {transactions && transactions.length > 0 ? (
                <div className="transaction-list">
                  {transactions.map((tx: any) => {
                    // Check if the current user is the sender of this transaction
                    const isSender = currentUser && tx.senderId === currentUser.id;
                    
                    // Format the transaction date/time
                    const transactionDate = new Date(tx.createdAt);
                    const dateStr = transactionDate.toLocaleDateString();
                    const timeStr = transactionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    // Find the item details if it exists
                    const itemDetails = catalogItems.find(item => item.id === tx.itemId);
                    
                    return (
                      <div key={tx.id} className="transaction-item p-2 mb-2">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <div>
                            <Badge variant={isSender ? "destructive" : "default"} className="px-2 py-0.5 rounded-full text-center">
                              {isSender ? 'Sent' : 'Received'}
                            </Badge>
                            <span className="ms-2 text-discord-text">
                              {itemDetails ? itemDetails.name : 'Points Transfer'}
                            </span>
                          </div>
                          <span className="transaction-date small text-discord-muted">
                            {dateStr} {timeStr}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span className="text-discord-muted small">
                            {isSender ? 
                              `To: ${tx.receiver?.displayName || 'Unknown User'}` : 
                              `From: ${tx.sender?.displayName || 'Unknown User'}`}
                          </span>
                          <span className={`fw-medium ${isSender ? 'text-discord-red' : 'text-discord-green'}`}>
                            {isSender ? `-${tx.amount}` : `+${tx.amount}`} MP
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-3 text-discord-muted">
                  {message || "No transactions found"}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (content.type === "bargain_accepted") {
      const { message, bargain, transaction } = content.content;
      return (
        <div>
          <div className="card bg-discord-secondary border-0 border-start border-4 border-discord-green">
            <div className="card-body p-3">
              <h5 className="card-title text-discord-text mb-3">Bargain Accepted</h5>
              <p className="mb-3">{message}</p>
              
              {bargain && (
                <div className="mb-3 p-2 rounded bg-discord-tertiary">
                  <div className="d-flex flex-wrap justify-content-between align-items-center mb-2">
                    <span className="fw-medium">{bargain.item.name}</span>
                    <Badge variant="secondary" className="ml-2">
                      {bargain.discountPercentage}% off
                    </Badge>
                  </div>
                  <div className="d-flex flex-wrap justify-content-between text-muted small">
                    <span className="text-success">Original: {bargain.originalPrice} minipoints</span>
                    <span className="text-success">→</span>
                    <span className="text-success fw-medium">Agreed: {bargain.agreedPrice} minipoints</span>
                  </div>
                </div>
              )}
              
              {transaction && (
                <div className="small text-muted mt-2">
                  //Transaction ID: {transaction.id}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (content.type === "bargain_rejected") {
      return (
        <div>
          <div className="card bg-discord-secondary border-0 border-start border-4 border-discord-red">
            <div className="card-body p-3">
              <h5 className="card-title text-discord-text mb-3">Bargain Rejected</h5>
              <p className="mb-0">{content.content.message}</p>
            </div>
          </div>
        </div>
      );
    }
    
    if (content.type === "all_in_success") {
      const { message, purchase, transfer, transaction } = content.content;
      return (
        <div>
          <div className="card bg-discord-secondary border-0 border-start border-4 border-discord-gold">
            <div className="card-body p-3">
              <h5 className="card-title text-discord-text mb-3">All Points Transferred!</h5>
              <p className="mb-3">{message}</p>
              
              {/* For item purchases (legacy format) */}
              {purchase && (
                <div className="mb-3 p-2 rounded bg-discord-tertiary">
                  <div className="d-flex flex-wrap justify-content-between align-items-center mb-2">
                    <span className="fw-medium">{purchase.item.name}</span>
                    {purchase.paidPrice > purchase.originalPrice && (
                      <Badge variant="secondary" className="ml-2">
                        Extra {purchase.paidPrice - purchase.originalPrice} points!
                      </Badge>
                    )}
                  </div>
                  <div className="d-flex flex-wrap justify-content-between text-muted small">
                    <span>Original: {purchase.originalPrice} minipoints</span>
                    <span>→</span>
                    <span className="text-discord-gold fw-medium">Paid: {purchase.paidPrice} minipoints</span>
                  </div>
                  <div className="d-flex justify-content-between mt-2">
                    <span className="text-discord-muted small">To: {purchase.recipient}</span>
                    <span className="text-discord-red fw-medium">Balance: {purchase.newBalance}</span>
                  </div>
                </div>
              )}
              
              {/* For direct transfers (new format) */}
              {transfer && (
                <div className="mb-3 p-2 rounded bg-discord-tertiary">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-medium">Direct Transfer</span>
                    <Badge variant="secondary" className="ml-2 bg-discord-gold text-white px-3 py-1 rounded-full text-center font-semibold">
                      🔥 All-in! 🔥
                    </Badge>
                  </div>
                  <div className="d-flex flex-wrap justify-content-between text-muted small">
                    <span className="text-discord-gold fw-medium">Amount: {transfer.amount} minipoints</span>
                    <span className="text-discord-gold">→</span>
                    <span className="text-discord-muted">To: {transfer.receiver}</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-discord-red fw-medium">New Balance: {transfer.newSenderBalance}</span>
                  </div>
                </div>
              )}
              
              {transaction && (
                <div className="small text-muted mt-2">
                 // Transaction ID: {transaction.id}
                </div>
              )}
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
