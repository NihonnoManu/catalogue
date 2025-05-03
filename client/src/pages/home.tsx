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
    <div className="vh-100 d-flex flex-column">
      {/* Header Bar */}
      <header className="navbar py-2 px-3 border-bottom border-discord-border" style={{backgroundColor: '#202225'}}>
        <div className="container-fluid d-flex align-items-center justify-content-between px-0">
          <div className="d-flex align-items-center gap-2">
            <div className="d-flex align-items-center justify-content-center rounded-circle" 
                style={{ width: '32px', height: '32px', backgroundColor: 'var(--discord-blurple)' }}>
              <span className="text-white fw-bold">M</span>
            </div>
            <h1 className="fw-bold fs-5 text-discord-text mb-0">MiniPoints Economy</h1>
          </div>
          <div className="d-flex align-items-center gap-3">
            <Link href="/catalog-manager">
              <button className="btn btn-discord-secondary btn-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-1"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                Manage Catalog
              </button>
            </Link>
            <Link href="/rules-manager">
              <button className="btn btn-discord-secondary btn-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="me-1"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"></path><path d="M7 7h.01"></path></svg>
                Manage Rules
              </button>
            </Link>
            <div className="badge bg-discord-green text-white px-2 py-1 rounded-pill">ONLINE</div>
          </div>
        </div>
      </header>

      {/* Main Content Area with Discord-style layout */}
      <div className="d-flex flex-grow-1 overflow-hidden">

        {/* Channel List - Wide left sidebar */}
        <div className="sidebar-discord" style={{ width: '240px', overflow: 'auto' }}>
          <div className="p-3 border-bottom border-discord-border">
            <h6 className="text-discord-muted text-uppercase fw-bold mb-3 fs-7">Users</h6>
            <UserBalances 
              users={users || []}
              transactions={transactions || []}
              isLoading={isLoading}
              catalogItems={catalogItems || []}
            />
          </div>
          <div className="p-3">
            <h6 className="text-discord-muted text-uppercase fw-bold mb-3 fs-7">Commands</h6>
            <div className="d-flex flex-column gap-1">
              <div className="rounded px-2 py-1" style={{backgroundColor: 'rgba(79, 84, 92, 0.24)'}}>
                <span className="text-discord-text"># !help</span>
              </div>
              <div className="rounded px-2 py-1" style={{backgroundColor: 'rgba(79, 84, 92, 0.24)'}}>
                <span className="text-discord-text"># !balance</span>
              </div>
              <div className="rounded px-2 py-1" style={{backgroundColor: 'rgba(79, 84, 92, 0.24)'}}>
                <span className="text-discord-text"># !catalogue</span>
              </div>
              <div className="rounded px-2 py-1" style={{backgroundColor: 'rgba(79, 84, 92, 0.24)'}}>
                <span className="text-discord-text"># !buy [item]</span>
              </div>
              <div className="rounded px-2 py-1" style={{backgroundColor: 'rgba(79, 84, 92, 0.24)'}}>
                <span className="text-discord-text"># !bargain [item] [price]</span>
              </div>
              <div className="rounded px-2 py-1" style={{backgroundColor: 'rgba(79, 84, 92, 0.24)'}}>
                <span className="text-discord-text"># !transactions</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Bot Interface */}
        <div className="flex-grow-1 d-flex flex-column" style={{backgroundColor: 'var(--discord-main)'}}>
          <div className="border-bottom border-discord-border px-4 py-2 d-flex align-items-center">
            <div className="d-flex align-items-center">
              <span className="me-2">#</span>
              <span className="fw-bold">minipoints-chat</span>
            </div>
            <div className="ms-3 text-discord-muted small">Chat with the MiniPoints Economy Bot</div>
          </div>
          <div className="flex-grow-1">
            <BotInterface 
              users={users || []}
              catalogItems={catalogItems || []}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
