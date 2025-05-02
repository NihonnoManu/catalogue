import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { PurchaseRequest } from "@shared/schema";

export function useEconomy() {
  // Get all users
  const users = useQuery({
    queryKey: ['/api/users'],
  });

  // Get all catalog items
  const catalog = useQuery({
    queryKey: ['/api/catalog'],
  });

  // Get recent transactions
  const transactions = useQuery({
    queryKey: ['/api/transactions'],
  });

  // Purchase an item
  const purchaseItem = useMutation({
    mutationFn: async (purchaseData: PurchaseRequest) => {
      const response = await apiRequest('POST', '/api/purchase', purchaseData);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    }
  });

  // Execute Discord bot commands
  const executeCommand = useMutation({
    mutationFn: async ({ userId, command }: { userId: number, command: string }) => {
      const response = await apiRequest('POST', '/api/simulate-command', { userId, command });
      return response.json();
    }
  });

  return {
    users,
    catalog,
    transactions,
    purchaseItem,
    executeCommand
  };
}
