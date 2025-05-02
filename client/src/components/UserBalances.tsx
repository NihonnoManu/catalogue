import UserBalance from "./UserBalance";
import TransactionHistory from "./TransactionHistory";
import { User, Transaction } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface UserBalancesProps {
  users: User[];
  transactions: Transaction[];
  isLoading: boolean;
}

export default function UserBalances({ users, transactions, isLoading }: UserBalancesProps) {
  return (
    <div className="w-64 bg-sidebar p-4 flex flex-col border-r border-black/20">
      <h2 className="text-sm uppercase tracking-wide font-semibold text-muted-foreground mb-4">User Balances</h2>
      
      {isLoading ? (
        <>
          <div className="mb-4 p-3 rounded bg-background">
            <div className="flex items-center space-x-2 mb-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="mb-4 p-3 rounded bg-background">
            <div className="flex items-center space-x-2 mb-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </>
      ) : (
        users.map((user) => (
          <UserBalance key={user.id} user={user} />
        ))
      )}

      <h2 className="text-sm uppercase tracking-wide font-semibold text-muted-foreground mt-4 mb-3">Recent Transactions</h2>
      
      <TransactionHistory 
        transactions={transactions}
        users={users} 
        isLoading={isLoading} 
      />
    </div>
  );
}
