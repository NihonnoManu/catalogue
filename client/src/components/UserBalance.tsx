import { User } from "@shared/schema";

interface UserBalanceProps {
  user: User;
}

export default function UserBalance({ user }: UserBalanceProps) {
  // Get the first letter of the display name for the avatar
  const initial = user.displayName.charAt(0).toUpperCase();

  return (
    <div className="mb-4 p-3 rounded bg-background">
      <div className="flex items-center space-x-2 mb-2">
        <div className={`w-8 h-8 rounded-full ${user.avatarColor} flex items-center justify-center text-white font-bold`}>
          <span>{initial}</span>
        </div>
        <span className="font-medium">{user.displayName}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">Balance:</span>
        <span className="font-bold text-primary">{user.balance} MP</span>
      </div>
    </div>
  );
}
