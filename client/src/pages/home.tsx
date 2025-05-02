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
    <div className="min-h-screen flex flex-col">
      {/* Header Bar */}
      <header className="bg-sidebar px-4 py-3 border-b border-black/20 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary">
            <i className="fas fa-robot text-white"></i>
          </div>
          <h1 className="text-white font-bold text-lg">MiniPoints Economy Bot</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/catalog">
            <button className="px-3 py-1.5 rounded bg-primary text-xs text-white hover:bg-primary/80 transition-colors">
              Manage Catalog
            </button>
          </Link>
          <span className="px-2 py-1 rounded bg-green-600 text-xs text-white">ONLINE</span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - User Balances */}
        <UserBalances 
          users={users || []}
          transactions={transactions || []}
          isLoading={isLoading}
        />

        {/* Main Content - Bot Interface */}
        <BotInterface 
          users={users || []}
          catalogItems={catalogItems || []}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
