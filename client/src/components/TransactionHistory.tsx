import { Transaction, User, CatalogItem } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface TransactionHistoryProps {
  transactions: Transaction[];
  users: User[];
  isLoading: boolean;
  catalogItems?: CatalogItem[];
}

export default function TransactionHistory({ transactions, users, isLoading, catalogItems = [] }: TransactionHistoryProps) {
  const findUserName = (userId: number): string => {
    const user = users.find(u => u.id === userId);
    return user ? user.displayName : "Unknown User";
  };

  const formatDate = (dateString: Date | string | null | undefined): string => {
    if (!dateString) return '';
    
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Unknown date';
    }
  };

  return (
    <div className="overflow-auto" style={{maxHeight: '200px'}}>
      <div className="d-flex flex-column gap-2">
        {isLoading ? (
          <div className="d-flex align-items-center justify-content-center py-3">
            <div className="spinner-border spinner-border-sm text-discord-muted" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <span className="ms-2 text-discord-muted">Loading transactions...</span>
          </div>
        ) : transactions.length > 0 ? (
          transactions.map((transaction) => {
            const senderName = findUserName(transaction.senderId);
            const receiverName = findUserName(transaction.receiverId);
            const borderColor = senderName === users[0]?.displayName ? 
              'border-discord-green' : 'border-discord-purple';
            
            return (
              <div 
                key={transaction.id} 
                className={`small p-2 border-start border-3 ${borderColor} bg-discord-secondary rounded`}
              >
                <div className="d-flex justify-content-between">
                  <span className="fw-medium">{senderName}</span>
                  <span className="text-discord-muted">{formatDate(transaction.createdAt)}</span>
                </div>
                <div className="mt-1">
                  <span className="text-discord-red">-{transaction.amount} MP</span>
                  <span className="text-discord-muted"> for </span>
                  <span className="fw-medium">
                    {/* Find catalog item name by itemId */}
                    {catalogItems?.find(item => item.id === transaction.itemId)?.name || `Item #${transaction.itemId}`}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-4 text-discord-muted">No transactions yet</div>
        )}
      </div>
    </div>
  );
}
