import { useQuery } from "@tanstack/react-query";
import UserBalances from "@/components/UserBalances";
import BotInterface from "@/components/BotInterface";
import { useEffect } from "react";
import { Link } from "wouter";
import { User, Transaction, CatalogItem } from "@shared/schema";

export default function Home() {
  // Fetch all users for the sidebar
  const { data: users, isLoading: isLoadingUsers, error: usersError } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Fetch transactions for the transaction history
  const { data: transactions, isLoading: isLoadingTransactions, error: transactionsError } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  // Fetch catalog items
  const { data: catalogItems, isLoading: isLoadingCatalog, error: catalogError } = useQuery<CatalogItem[]>({
    queryKey: ['/api/catalog'],
  });

  // Load initial data for demonstration
  useEffect(() => {
    if (usersError) {
      console.error("Error loading users:", usersError);
    }
    if (transactionsError) {
      console.error("Error loading transactions:", transactionsError);
    }
    if (catalogError) {
      console.error("Error loading catalog:", catalogError);
    }
  }, [usersError, transactionsError, catalogError]);

  const isLoading = isLoadingUsers || isLoadingTransactions || isLoadingCatalog;

  return (
    <div className="min-vh-100 d-flex flex-column">
      {/* Header Bar */}
      <header className="navbar-discord py-2 px-3 border-bottom d-flex align-items-center justify-content-between">
        <div className="d-flex align-items-center gap-2">
          <div className="d-flex align-items-center justify-content-center rounded-circle p-2" 
               style={{ width: '40px', height: '40px', backgroundColor: 'var(--discord-blurple)' }}>
            <i className="fas fa-robot text-white"></i>
          </div>
          <h1 className="fw-bold fs-4 text-white mb-0">MiniPoints Economy Bot</h1>
        </div>
        <div className="d-flex align-items-center gap-3">
          <Link href="/catalog">
            <button className="btn btn-discord-primary btn-sm">
              <i className="fas fa-cog me-1"></i> Manage Catalog
            </button>
          </Link>
          <span className="online-badge">ONLINE</span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="d-flex flex-grow-1 overflow-hidden">
        {/* Left Sidebar - User Balances */}
        <div className="sidebar-discord p-3" style={{ width: '300px' }}>
          <UserBalances 
            users={users || []}
            transactions={transactions || []}
            isLoading={isLoading}
          />
        </div>

        {/* Main Content - Bot Interface */}
        <div className="flex-grow-1 bg-discord-secondary p-3">
          <BotInterface 
            users={users || []}
            catalogItems={catalogItems || []}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
