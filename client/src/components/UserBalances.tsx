import UserBalance from "./UserBalance";
import TransactionHistory from "./TransactionHistory";
import { User, Transaction, CatalogItem } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

interface UserBalancesProps {
  users: User[];
  transactions: Transaction[];
  isLoading: boolean;
  catalogItems?: CatalogItem[];
}

export default function UserBalances({ users, transactions, isLoading, catalogItems }: UserBalancesProps) {
  return (
    <div className="w-100">
      {isLoading ? (
        <>
          <div className="mb-3 p-3 rounded bg-discord-secondary">
            <div className="d-flex align-items-center gap-2 mb-2">
              <div className="spinner-border spinner-border-sm text-discord-muted" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <div className="text-discord-muted">Loading users...</div>
            </div>
          </div>
        </>
      ) : (
        users.map((user) => (
          <div key={user.id} className="user-item mb-2">
            <div className="user-avatar" style={{
              //backgroundColor: user.id === 1 ? '#5865F2' : '#ED4245', 
              backgroundColor: user.avatarColor, 
            }}>
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{user.displayName}</div>
              <div className="user-balance">{user.balance} points</div>
            </div>
          </div>
        ))
      )}

      <h6 className="text-discord-muted text-uppercase fw-bold mt-4 mb-3 fs-7">Recent Transactions</h6>
      
      <TransactionHistory 
        transactions={transactions}
        users={users} 
        isLoading={isLoading}
        catalogItems={catalogItems}
      />
    </div>
  );
}
