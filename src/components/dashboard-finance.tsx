import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export function UserPurchaseHistory({ userId }: { userId: string }) {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["purchase-history", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, courses(title), bundles(title), organizations(name)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Skeleton className="h-32 w-full rounded-2xl" />;
  if (!payments || (payments?.length || 0) === 0)
    return (
      <div className="p-12 text-center border rounded-2xl bg-secondary/10 text-muted-foreground text-xs font-bold uppercase tracking-widest italic">
        No transaction records.
      </div>
    );

  return (
    <Card className="border-border/40 bg-card shadow-sm rounded-2xl overflow-hidden">
      <Table>
        <TableHeader className="bg-secondary/30">
          <TableRow className="hover:bg-transparent border-none">
            <TableHead className="font-black text-[10px] uppercase py-3 px-6 text-muted-foreground">
              Transaction ID
            </TableHead>
            <TableHead className="font-black text-[10px] uppercase py-3 text-muted-foreground">
              Course
            </TableHead>
            <TableHead className="font-black text-[10px] uppercase py-3 text-muted-foreground">
              Amount
            </TableHead>
            <TableHead className="text-right font-black text-[10px] uppercase py-3 px-6 text-muted-foreground">
              Date
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(payments || []).map((p: any) => (
            <TableRow key={p.id} className="border-border/50 hover:bg-slate-50 transition-colors">
              <TableCell className="font-mono text-[10px] font-black text-muted-foreground px-6 py-4 uppercase">
                {p.transaction_id || `TX-${p.id.slice(0, 8)}`}
              </TableCell>
              <TableCell className="font-bold text-sm text-slate-700">
                <div className="flex flex-col">
                  <span className="truncate max-w-[300px]">
                    {p.courses?.title ||
                      p.bundles?.title ||
                      (p.organization_id
                        ? `License for ${p.organizations?.name}`
                        : "Premium Access")}
                  </span>
                  <div className="flex gap-1 mt-1">
                    {p.bundle_id && (
                      <Badge className="bg-emerald-50 text-emerald-600 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">
                        Bundle
                      </Badge>
                    )}
                    {p.organization_id && (
                      <Badge className="bg-indigo-50 text-indigo-600 border-none text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm">
                        Organization
                      </Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-black text-sm text-emerald-600">${p.amount}</TableCell>
              <TableCell className="text-right px-6 text-[10px] font-bold text-muted-foreground uppercase">
                {new Date(p.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

export function CreatorSalesHistory({ creatorId }: { creatorId: string }) {
  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["creator-sales", creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, courses!inner(title, creator_id), profiles:user_id(name, email)")
        .eq("courses.creator_id", creatorId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full rounded-2xl" />;
  if (!sales || (sales?.length || 0) === 0) return null;

  return (
    <Card className="border-border/40 bg-card shadow-sm rounded-2xl overflow-hidden text-slate-900">
      <Table>
        <TableHeader className="bg-slate-50 border-b border-slate-100">
          <TableRow className="hover:bg-transparent border-none">
            <TableHead className="font-black text-[10px] uppercase py-4 px-6 text-slate-400 tracking-widest">
              Student Information
            </TableHead>
            <TableHead className="font-black text-[10px] uppercase py-4 text-slate-400 tracking-widest">
              Course Purchased
            </TableHead>
            <TableHead className="font-black text-[10px] uppercase py-4 text-slate-400 tracking-widest">
              Revenue
            </TableHead>
            <TableHead className="text-right font-black text-[10px] uppercase py-4 px-6 text-slate-400 tracking-widest">
              Transaction Date
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(sales || []).map((s: any) => (
            <TableRow key={s.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
              <TableCell className="py-5 px-6">
                <div className="flex flex-col text-left">
                  <span className="font-bold text-sm text-slate-900">
                    {s.profiles?.name || "Premium Student"}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium italic">
                    {s.profiles?.email}
                  </span>
                </div>
              </TableCell>
              <TableCell className="py-5 font-bold text-sm text-slate-600 text-left">
                {s.courses?.title}
              </TableCell>
              <TableCell className="py-5 font-black text-sm text-emerald-600 text-left">
                ${s.amount.toLocaleString()}
              </TableCell>
              <TableCell className="py-5 text-right px-6 text-[10px] font-black text-muted-foreground uppercase">
                {new Date(s.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
