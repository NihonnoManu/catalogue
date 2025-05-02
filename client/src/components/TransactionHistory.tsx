import { Transaction, User } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface TransactionHistoryProps {
  transactions: Transaction[];
  users: User[];
  isLoading: boolean;
}

export default function TransactionHistory({ transactions, users, isLoading }: TransactionHistoryProps) {
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
    <div className="flex-1 overflow-y-auto rounded bg-background p-2">
      <div className="space-y-2">
        {isLoading ? (
          Array(3).fill(0).map((_, index) => (
            <div key={index} className="p-2">
              <div className="flex justify-between mb-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex items-center space-x-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))
        ) : transactions.length > 0 ? (
          transactions.map((transaction) => {
            const senderName = findUserName(transaction.senderId);
            const receiverName = findUserName(transaction.receiverId);
            const borderColor = senderName === users[0]?.displayName ? "border-primary" : "border-green-500";
            
            return (
              <div 
                key={transaction.id} 
                className={`text-xs p-2 border-l-2 ${borderColor} bg-secondary rounded`}
              >
                <div className="flex justify-between">
                  <span>{senderName}</span>
                  <span className="text-muted-foreground">{formatDate(transaction.createdAt)}</span>
                </div>
                <div className="mt-1">
                  <span className="text-destructive">-{transaction.amount} MP</span>
                  <span className="text-muted-foreground"> for </span>
                  <span>{transaction.item?.name || 'Unknown Item'}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-4 text-muted-foreground">No transactions yet</div>
        )}
      </div>
    </div>
  );
}
