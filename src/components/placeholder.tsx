import { cn } from "@/lib/utils";

export function Bar({ className }: { className?: string }) {
  return <div className={cn("h-3 rounded bg-muted-foreground/20", className)} />;
}

export function MediaBox({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg bg-muted-foreground/15 text-muted-foreground/60",
        className,
      )}
    >
      {children}
    </div>
  );
}
