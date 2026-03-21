import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const sizes = { sm: "h-6 w-6 text-[10px]", md: "h-9 w-9 text-xs", lg: "h-16 w-16 text-lg" };

interface MemberAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const MemberAvatar = ({ name, avatarUrl, size = "md", className }: MemberAvatarProps) => {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Avatar className={cn(sizes[size], className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
      <AvatarFallback className="bg-primary text-primary-foreground font-medium">{initials}</AvatarFallback>
    </Avatar>
  );
};
