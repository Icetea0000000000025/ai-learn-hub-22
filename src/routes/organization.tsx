import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Building2,
  Users,
  Ticket,
  GraduationCap,
  Activity,
  Download,
  CheckCircle2,
  UserPlus,
  Trash2,
  AlertCircle,
  ShieldAlert,
  Check,
  ChevronDown,
  Plus,
  Mail,
  ArrowRight,
  Loader2,
  LayoutDashboard,
  BarChart2,
  Settings,
  CreditCard,
  TrendingUp,
  Sparkles,
  Search,
  MoreHorizontal,
  ExternalLink,
  PieChart,
  History,
  PanelLeft,
  Home,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";
import { createOrgPackageCheckoutSession, createEnterpriseCheckoutSession } from "@/lib/stripe";
import { fetchCourses, type Course } from "@/lib/courses";
import {
  removeCourseFromMember,
  repairMissingPackages,
  assignCourseToMember,
  provisionFreeCourseToOrg,
  inviteMemberToOrg,
  fetchUserOrganizations,
} from "@/lib/organizations";

export const Route = createFileRoute("/organization")({
  beforeLoad: async ({ location }) => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error || !session)
        throw redirect({ to: "/login", search: { mode: "login", redirect: location.href } as any });
      return { user: session.user };
    } catch (err: any) {
      if (err?.to || err?.status === 307 || err?.status === 302) throw err;
      throw redirect({ to: "/login", search: { mode: "login", redirect: location.href } as any });
    }
  },
  component: OrganizationDashboard,
});

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "overview" | "team" | "licenses" | "reports" | "settings";

// ─── Localisation strings ─────────────────────────────────────────────────────
type OrgStringMap = Record<string, string>;

const orgStrings: Record<Language, OrgStringMap> = {
  en: {
    active: "Active",
    expired: "Expired",
    orgCreated: "Organization created",
    memberAdded: "added to organization successfully.",
    memberAddedFallback: "User",
    seatAssigned: "Seat assigned",
    accessRevoked: "Access revoked",
    orgUpdated: "Organization updated",
    createWorkspaceDesc: "Give your organization a name to get started.",
    teamStarterDesc: "Perfect for small teams up to 10 members",
    enterpriseDesc: "Unlimited scale and advanced management",
    perMonth: "/month",
    noCoursesMatch: "No courses match your search",
    availableCourses: "Available Courses",
    perSeat: "seat",
    creatorBenefitTitle: "Creator Benefit Applied",
    creatorBenefitDesc:
      "As the creator of this course, you can provision up to 1,000 free seats for your own organization.",
    issueFreeBtn: "Issue Free Licenses",
    navigation: "Navigation",
    accountOwner: "Account Owner",
    viewAllLicenses: "View all licenses →",
    userHeader: "User",
    statusHeader: "Status",
    learningProfile: "Learning Profile",
    notEnrolledYet: "Not enrolled yet",
    moreCount: "+{n} more",
    memberHeader: "Member",
    rolePermissions: "Role / Permissions",
    courseAccess: "Course Access",
    actionHeader: "Action",
    joined: "Joined",
    noActiveCourses: "No active courses",
    noSeatsAssigned: "No seats assigned yet",
    enrolledBadge: "Enrolled",
    noCapacity: "No Capacity Available",
    searchTeam: "Search team directory...",
    inDirectory: "in directory",
    orgProgress: "Org Progress",
    avgCompletionRate: "avg completion rate",
    usageHistory: "Usage History",
    seatsProcessed: "seats processed",
    analyticsDisabledDesc:
      "Your organization's access to data exports and analytics has been paused due to an inactive subscription.",
    fullName: "Full Name",
    emailAddress: "Email Address",
    enrollmentStatus: "Enrollment Status",
    overallProgress: "Overall Progress",
    userRegistered: "User Registered",
  },
  th: {
    active: "ใช้งานอยู่",
    expired: "หมดอายุ",
    orgCreated: "สร้างองค์กรสำเร็จแล้ว",
    memberAdded: "ถูกเพิ่มในองค์กรสำเร็จแล้ว",
    memberAddedFallback: "ผู้ใช้",
    seatAssigned: "จัดสรรที่นั่งสำเร็จแล้ว",
    accessRevoked: "ยกเลิกการเข้าถึงแล้ว",
    orgUpdated: "อัปเดตองค์กรสำเร็จแล้ว",
    createWorkspaceDesc: "ตั้งชื่อองค์กรของคุณเพื่อเริ่มต้นการใช้งาน",
    teamStarterDesc: "เหมาะสำหรับทีมขนาดเล็กที่มีสมาชิกไม่เกิน 10 คน",
    enterpriseDesc: "สเกลได้ไม่จำกัดและการจัดการระดับสูง",
    perMonth: "/เดือน",
    noCoursesMatch: "ไม่พบหลักสูตรที่ตรงกับการค้นหา",
    availableCourses: "หลักสูตรที่มีจำหน่าย",
    perSeat: "ที่นั่ง",
    creatorBenefitTitle: "สิทธิ์ผู้สร้างถูกนำมาใช้",
    creatorBenefitDesc:
      "ในฐานะผู้สร้างหลักสูตรนี้ คุณสามารถจัดสรรที่นั่งฟรีได้สูงสุด 1,000 ที่นั่งสำหรับองค์กรของคุณเอง",
    issueFreeBtn: "ออกใบอนุญาตฟรี",
    navigation: "การนำทาง",
    accountOwner: "เจ้าของบัญชี",
    viewAllLicenses: "ดูใบอนุญาตทั้งหมด →",
    userHeader: "ผู้ใช้",
    statusHeader: "สถานะ",
    learningProfile: "โปรไฟล์การเรียนรู้",
    notEnrolledYet: "ยังไม่ได้ลงทะเบียน",
    moreCount: "+{n} เพิ่มเติม",
    memberHeader: "สมาชิก",
    rolePermissions: "บทบาท / สิทธิ์",
    courseAccess: "การเข้าถึงคอร์ส",
    actionHeader: "ดำเนินการ",
    joined: "เข้าร่วมเมื่อ",
    noActiveCourses: "ไม่มีคอร์สที่ใช้งานอยู่",
    noSeatsAssigned: "ยังไม่มีการมอบหมายที่นั่ง",
    enrolledBadge: "ลงทะเบียนแล้ว",
    noCapacity: "ไม่มีที่นั่งว่าง",
    searchTeam: "ค้นหาในรายชื่อทีม...",
    inDirectory: "ในรายชื่อ",
    orgProgress: "ความก้าวหน้าองค์กร",
    avgCompletionRate: "อัตราการเรียนจบเฉลี่ย",
    usageHistory: "ประวัติการใช้งาน",
    seatsProcessed: "ที่นั่งที่ดำเนินการแล้ว",
    analyticsDisabledDesc:
      "การเข้าถึงการส่งออกข้อมูลและการวิเคราะห์ขององค์กรคุณถูกระงับเนื่องจากการสมัครสมาชิกไม่ใช้งาน",
    fullName: "ชื่อ-นามสกุล",
    emailAddress: "ที่อยู่อีเมล",
    enrollmentStatus: "สถานะการลงทะเบียน",
    overallProgress: "ความก้าวหน้าโดยรวม",
    userRegistered: "ผู้ใช้ที่ลงทะเบียน",
  },
  es: {
    active: "Activo",
    expired: "Expirado",
    orgCreated: "Organización creada",
    memberAdded: "añadido a la organización correctamente.",
    memberAddedFallback: "Usuario",
    seatAssigned: "Asiento asignado",
    accessRevoked: "Acceso revocado",
    orgUpdated: "Organización actualizada",
    createWorkspaceDesc: "Dale un nombre a tu organización para comenzar.",
    teamStarterDesc: "Perfecto para equipos pequeños de hasta 10 miembros",
    enterpriseDesc: "Escala ilimitada y gestión avanzada",
    perMonth: "/mes",
    noCoursesMatch: "No hay cursos que coincidan con tu búsqueda",
    availableCourses: "Cursos Disponibles",
    perSeat: "asiento",
    creatorBenefitTitle: "Beneficio de Creador Aplicado",
    creatorBenefitDesc:
      "Como creador de este curso, puedes aprovisionar hasta 1,000 asientos gratuitos para tu propia organización.",
    issueFreeBtn: "Emitir Licencias Gratuitas",
    navigation: "Navegación",
    accountOwner: "Propietario de Cuenta",
    viewAllLicenses: "Ver todas las licencias →",
    userHeader: "Usuario",
    statusHeader: "Estado",
    learningProfile: "Perfil de Aprendizaje",
    notEnrolledYet: "Aún no inscrito",
    moreCount: "+{n} más",
    memberHeader: "Miembro",
    rolePermissions: "Rol / Permisos",
    courseAccess: "Acceso al Curso",
    actionHeader: "Acción",
    joined: "Se unió",
    noActiveCourses: "Sin cursos activos",
    noSeatsAssigned: "Aún no se han asignado asientos",
    enrolledBadge: "Inscrito",
    noCapacity: "Sin Capacidad Disponible",
    searchTeam: "Buscar en el directorio del equipo...",
    inDirectory: "en el directorio",
    orgProgress: "Progreso de la Org.",
    avgCompletionRate: "tasa de finalización promedio",
    usageHistory: "Historial de Uso",
    seatsProcessed: "asientos procesados",
    analyticsDisabledDesc:
      "El acceso de tu organización a las exportaciones de datos y analíticas ha sido pausado debido a una suscripción inactiva.",
    fullName: "Nombre Completo",
    emailAddress: "Dirección de Correo",
    enrollmentStatus: "Estado de Inscripción",
    overallProgress: "Progreso General",
    userRegistered: "Usuario Registrado",
  },
  ja: {
    active: "有効",
    expired: "期限切れ",
    orgCreated: "組織を作成しました",
    memberAdded: "が組織に追加されました。",
    memberAddedFallback: "ユーザー",
    seatAssigned: "シートを割り当てました",
    accessRevoked: "アクセスを取り消しました",
    orgUpdated: "組織を更新しました",
    createWorkspaceDesc: "組織名を入力して開始してください。",
    teamStarterDesc: "最大10名の小規模チームに最適",
    enterpriseDesc: "無制限のスケールと高度な管理",
    perMonth: "/月",
    noCoursesMatch: "検索に一致するコースがありません",
    availableCourses: "利用可能なコース",
    perSeat: "席",
    creatorBenefitTitle: "クリエイター特典が適用されました",
    creatorBenefitDesc:
      "このコースのクリエイターとして、自分の組織に最大1,000席の無料シートをプロビジョニングできます。",
    issueFreeBtn: "無料ライセンスを発行",
    navigation: "ナビゲーション",
    accountOwner: "アカウントオーナー",
    viewAllLicenses: "すべてのライセンスを表示 →",
    userHeader: "ユーザー",
    statusHeader: "ステータス",
    learningProfile: "学習プロファイル",
    notEnrolledYet: "未登録",
    moreCount: "+{n} 件",
    memberHeader: "メンバー",
    rolePermissions: "ロール / 権限",
    courseAccess: "コースアクセス",
    actionHeader: "操作",
    joined: "参加日",
    noActiveCourses: "有効なコースなし",
    noSeatsAssigned: "まだシートが割り当てられていません",
    enrolledBadge: "登録済み",
    noCapacity: "空き容量なし",
    searchTeam: "チームディレクトリを検索...",
    inDirectory: "ディレクトリ内",
    orgProgress: "組織の進捗",
    avgCompletionRate: "平均完了率",
    usageHistory: "使用履歴",
    seatsProcessed: "処理済みシート",
    analyticsDisabledDesc:
      "サブスクリプションが非アクティブなため、データエクスポートと分析へのアクセスが一時停止されています。",
    fullName: "氏名",
    emailAddress: "メールアドレス",
    enrollmentStatus: "登録ステータス",
    overallProgress: "全体の進捗",
    userRegistered: "登録ユーザー",
  },
  zh: {
    active: "活跃",
    expired: "已过期",
    orgCreated: "组织创建成功",
    memberAdded: "已成功加入组织。",
    memberAddedFallback: "用户",
    seatAssigned: "席位已分配",
    accessRevoked: "访问已撤销",
    orgUpdated: "组织已更新",
    createWorkspaceDesc: "为您的组织命名以开始使用。",
    teamStarterDesc: "适合最多10名成员的小团队",
    enterpriseDesc: "无限扩展和高级管理",
    perMonth: "/月",
    noCoursesMatch: "没有与您搜索匹配的课程",
    availableCourses: "可用课程",
    perSeat: "席",
    creatorBenefitTitle: "已应用创作者权益",
    creatorBenefitDesc:
      "作为本课程的创作者，您可以为自己的组织提供最多1,000个免费席位。",
    issueFreeBtn: "发放免费许可证",
    navigation: "导航",
    accountOwner: "账户所有者",
    viewAllLicenses: "查看所有许可证 →",
    userHeader: "用户",
    statusHeader: "状态",
    learningProfile: "学习档案",
    notEnrolledYet: "尚未注册",
    moreCount: "+{n} 更多",
    memberHeader: "成员",
    rolePermissions: "角色 / 权限",
    courseAccess: "课程访问",
    actionHeader: "操作",
    joined: "加入于",
    noActiveCourses: "暂无活跃课程",
    noSeatsAssigned: "尚未分配席位",
    enrolledBadge: "已注册",
    noCapacity: "无可用容量",
    searchTeam: "搜索团队目录...",
    inDirectory: "在目录中",
    orgProgress: "组织进度",
    avgCompletionRate: "平均完成率",
    usageHistory: "使用历史",
    seatsProcessed: "已处理席位",
    analyticsDisabledDesc:
      "由于订阅未激活，您的组织对数据导出和分析的访问已暂停。",
    fullName: "全名",
    emailAddress: "电子邮件地址",
    enrollmentStatus: "注册状态",
    overallProgress: "总体进度",
    userRegistered: "已注册用户",
  },
  ko: {
    active: "활성",
    expired: "만료됨",
    orgCreated: "조직이 생성되었습니다",
    memberAdded: "이(가) 조직에 성공적으로 추가되었습니다.",
    memberAddedFallback: "사용자",
    seatAssigned: "좌석이 할당되었습니다",
    accessRevoked: "액세스가 취소되었습니다",
    orgUpdated: "조직이 업데이트되었습니다",
    createWorkspaceDesc: "시작하려면 조직 이름을 입력하세요.",
    teamStarterDesc: "최대 10명의 소규모 팀에 적합",
    enterpriseDesc: "무제한 확장 및 고급 관리",
    perMonth: "/월",
    noCoursesMatch: "검색과 일치하는 강좌가 없습니다",
    availableCourses: "이용 가능한 강좌",
    perSeat: "석",
    creatorBenefitTitle: "크리에이터 혜택이 적용되었습니다",
    creatorBenefitDesc:
      "이 강좌의 크리에이터로서 자신의 조직에 최대 1,000개의 무료 좌석을 제공할 수 있습니다.",
    issueFreeBtn: "무료 라이선스 발급",
    navigation: "탐색",
    accountOwner: "계정 소유자",
    viewAllLicenses: "모든 라이선스 보기 →",
    userHeader: "사용자",
    statusHeader: "상태",
    learningProfile: "학습 프로필",
    notEnrolledYet: "아직 등록되지 않음",
    moreCount: "+{n} 더",
    memberHeader: "멤버",
    rolePermissions: "역할 / 권한",
    courseAccess: "강좌 접근",
    actionHeader: "작업",
    joined: "가입일",
    noActiveCourses: "활성 강좌 없음",
    noSeatsAssigned: "아직 할당된 좌석이 없습니다",
    enrolledBadge: "등록됨",
    noCapacity: "사용 가능한 용량 없음",
    searchTeam: "팀 디렉토리 검색...",
    inDirectory: "디렉토리에서",
    orgProgress: "조직 진행률",
    avgCompletionRate: "평균 완료율",
    usageHistory: "사용 기록",
    seatsProcessed: "처리된 좌석",
    analyticsDisabledDesc:
      "비활성 구독으로 인해 데이터 내보내기 및 분석에 대한 조직의 액세스가 일시 중지되었습니다.",
    fullName: "성명",
    emailAddress: "이메일 주소",
    enrollmentStatus: "등록 상태",
    overallProgress: "전체 진행률",
    userRegistered: "등록된 사용자",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(name?: string) {
  return (name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const AVA_COLORS = [
  { bg: "bg-blue-50", text: "text-blue-800" },
  { bg: "bg-amber-50", text: "text-amber-900" },
  { bg: "bg-pink-50", text: "text-pink-800" },
  { bg: "bg-teal-50", text: "text-teal-800" },
  { bg: "bg-purple-50", text: "text-purple-800" },
];
function avaColor(name?: string) {
  return AVA_COLORS[(name?.charCodeAt(0) ?? 0) % AVA_COLORS.length];
}

// ─── Micro components ─────────────────────────────────────────────────────────
function Ava({ name, url, size = 32 }: { name?: string; url?: string; size?: number }) {
  const { bg, text } = avaColor(name);
  if (url)
    return (
      <img
        src={url}
        style={{ width: size, height: size }}
        className="rounded-full object-cover flex-shrink-0 border border-border"
        alt=""
      />
    );
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "rounded-full flex items-center justify-center font-semibold flex-shrink-0",
        bg,
        text,
        size <= 24 ? "text-[10px]" : "text-[12px]",
      )}
    >
      {initials(name)}
    </span>
  );
}

function ProgressBar({ used, max, className }: { used: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div className={cn("h-1.5 w-full bg-secondary rounded-full overflow-hidden", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          pct >= 100 ? "bg-destructive" : "bg-primary",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  hintUp,
  icon: Icon,
  color = "blue",
}: {
  label: string;
  value: string | number;
  hint?: string;
  hintUp?: boolean;
  icon: React.ElementType;
  color?: "blue" | "green" | "purple" | "amber";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <Card className="shadow-none border-border/50 bg-white">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <div className={cn("p-1.5 rounded-lg", colors[color])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {hint && (
          <div
            className={cn(
              "text-[11px] mt-1.5 flex items-center gap-1 font-medium",
              hintUp ? "text-emerald-600" : "text-muted-foreground",
            )}
          >
            {hintUp && <TrendingUp className="h-3 w-3" />}
            {hint}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Sidebar item ─────────────────────────────────────────────────────────────
function SidebarItem({
  icon: Icon,
  label,
  badge,
  active,
  onClick,
  collapsed,
}: {
  icon: React.ElementType;
  label: string;
  badge?: number;
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center rounded-lg transition-colors group mb-0.5",
        collapsed ? "justify-center w-10 h-10 mx-auto" : "w-full gap-3 px-3 py-2.5 text-sm",
        active
          ? "bg-primary text-primary-foreground font-medium shadow-md shadow-primary/10"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      title={collapsed ? label : undefined}
    >
      <Icon
        className={cn(
          "h-4 w-4 flex-shrink-0",
          active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      {!collapsed && <span className="flex-1 text-left">{label}</span>}
      {!collapsed && badge !== undefined && (
        <Badge
          variant={active ? "secondary" : "outline"}
          className={cn(
            "h-5 px-1.5 py-0 text-[10px]",
            active ? "bg-white/20 text-white border-0" : "text-muted-foreground",
          )}
        >
          {badge}
        </Badge>
      )}
    </button>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusDot({ active }: { active: boolean }) {
  const { lang } = useI18n();
  const s = (key: string) => orgStrings[lang as Language]?.[key] ?? orgStrings.en[key];
  return (
    <Badge
      variant={active ? "secondary" : "destructive"}
      className={cn(
        "h-5 gap-1 text-[10px] font-semibold uppercase tracking-wider px-2",
        active
          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-100"
          : "bg-red-50 text-red-700 hover:bg-red-50 border-red-100",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-emerald-500" : "bg-red-500")} />
      {active ? s("active") : s("expired")}
    </Badge>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function OrganizationDashboard() {
  const { user, profile } = useAuth();
  const { lang, t } = useI18n();
  const queryClient = useQueryClient();
  const search = Route.useSearch() as any;

  // Helper: look up a key from the org-specific strings
  const s = (key: string) => orgStrings[lang as Language]?.[key] ?? orgStrings.en[key];

  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [memberEmail, setMemberEmail] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [editOrgName, setEditOrgName] = useState("");
  const [buyOpen, setBuyOpen] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [seatCount, setSeatCount] = useState(5);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedOrgIndex, setSelectedOrgIndex] = useState(0);

  // Queries
  const { data: myOrgs = [], isPending: loadingOrgs } = useQuery({
    queryKey: ["my-organizations", user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchUserOrganizations(user!.id),
  });
  const org = myOrgs[selectedOrgIndex]?.organizations as any;

  // Initialize edit name when org is loaded
  useEffect(() => {
    if (org?.name && !editOrgName) setEditOrgName(org.name);
  }, [org?.name, editOrgName]);

  const { data: allCourses = [] as Course[] } = useQuery({
    queryKey: ["all-courses-for-org"],
    queryFn: () => fetchCourses(),
  });
  const selectedCourse = useMemo(
    () => allCourses.find((c) => c.id === courseId),
    [allCourses, courseId],
  );

  const { data: members = [], isLoading: loadingMembers } = useQuery({
    queryKey: ["org-members-suite", org?.id],
    enabled: !!org?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("*, profiles(id,name,email,avatar_url)")
        .eq("organization_id", org.id);
      if (error) throw error;
      const ids = data.map((m) => m.user_id);

      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("user_id,course_id,enrolled_at,courses(title, id)")
        .in("user_id", ids);

      const courseIds = [...new Set(enrollments?.map((e) => e.course_id) || [])];

      const { data: lessonsCount } = await supabase
        .from("lessons")
        .select("course_id")
        .in("course_id", courseIds);

      const lessonMap: Record<string, number> = {};
      lessonsCount?.forEach((l) => {
        if (l.course_id) {
          lessonMap[l.course_id] = (lessonMap[l.course_id] || 0) + 1;
        }
      });

      const { data: progressData } = await supabase
        .from("lesson_progress")
        .select("user_id, course_id")
        .in("user_id", ids)
        .in("course_id", courseIds as string[]);

      const progressMap: Record<string, number> = {};
      progressData?.forEach((p) => {
        if (p.user_id && p.course_id) {
          const key = `${p.user_id}-${p.course_id}`;
          progressMap[key] = (progressMap[key] || 0) + 1;
        }
      });

      return data.map((m) => {
        const userEnrollments = enrollments?.filter((e) => e.user_id === m.user_id) ?? [];
        const enrichedEnrollments = userEnrollments.map((e) => {
          const total = e.course_id ? lessonMap[e.course_id] || 0 : 0;
          const completed =
            m.user_id && e.course_id ? progressMap[`${m.user_id}-${e.course_id}`] || 0 : 0;
          return {
            ...e,
            progress_percent: total > 0 ? Math.round((completed / total) * 100) : 0,
          };
        });
        return {
          ...m,
          enrollments: enrichedEnrollments,
        };
      });
    },
  });

  const { data: packages = [] } = useQuery({
    queryKey: ["org-packages-management", org?.id],
    enabled: !!org?.id,
    queryFn: async () => {
      const { data: pkgs, error } = await supabase
        .from("organization_packages")
        .select("*, courses(id,title,image_url)")
        .eq("organization_id", org.id);
      if (error) throw error;
      if (!pkgs?.length) return [];
      const { data: assignments } = await (supabase as any)
        .from("organization_member_courses")
        .select("*")
        .in(
          "course_id",
          pkgs.map((p) => p.course_id),
        );
      return pkgs.map((p) => ({
        ...p,
        courses: p.courses
          ? {
              ...p.courses,
              imageUrl: (p.courses as any).image_url,
            }
          : null,
        assignments: assignments?.filter((a: any) => a.course_id === p.course_id) ?? [],
      }));
    },
  });

  const { data: enterpriseProfile } = useQuery({
    queryKey: ["my-profile-enterprise"],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Auto-repair on checkout success
  useEffect(() => {
    if (search.success === "true" && user?.id && org?.id) {
      (repairMissingPackages as any)({
        data: { orgId: org.id, userId: user.id },
      }).then((r: any) => {
        if (r?.count > 0) {
          toast.success(t("provisionedSuccess", { count: r.count }));
          queryClient.invalidateQueries({
            queryKey: ["org-packages-management"],
          });
        }
      });
    }
  }, [search.success, user?.id, org?.id, queryClient, t]);

  // Derived values
  const isActive =
    !org?.subscription_status ||
    (org.subscription_status === "active" &&
      (!org.subscription_expires_at || new Date(org.subscription_expires_at) > new Date()));

  const isApproved =
    profile?.role === "admin" || (enterpriseProfile as any)?.org_request_status === "approved";

  const totalSeats = packages.reduce((a: number, p: any) => a + (p.max_seats ?? 0), 0);
  const usedSeats = packages.reduce((a: number, p: any) => a + (p.used_seats ?? 0), 0);
  const usagePct = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;

  // Real completion rate calculation
  const allEnrollments = members.flatMap((m) => m.enrollments || []);
  const avgCompletion =
    allEnrollments.length > 0
      ? Math.round(
          allEnrollments.reduce((acc, e) => acc + (e.progress_percent || 0), 0) /
            allEnrollments.length,
        )
      : 0;

  // Real Enrollment activity data (last 6 months)
  const chartData = useMemo(() => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const now = new Date();
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mLabel = months[d.getMonth()];
      const count = allEnrollments.filter((e) => {
        if (!e.enrolled_at) return false;
        const ed = new Date(e.enrolled_at);
        return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
      }).length;
      result.push({ l: mLabel, h: count, w: i });
    }
    const max = Math.max(...result.map((r) => r.h), 1);
    return result.map((r) => ({ ...r, h: Math.round((r.h / max) * 100) }));
  }, [allEnrollments]);

  const discount = seatCount > 50 ? 0.25 : seatCount > 10 ? 0.15 : 0.1;
  const finalTotal = Math.round((selectedCourse?.price ?? 0) * seatCount * (1 - discount));

  // Mutations
  const createOrgMutation = useMutation({
    mutationFn: async () => {
      if (!newOrgName || !user?.id) throw new Error("Name required");
      const { error } = await supabase
        .from("organizations")
        .insert({ name: newOrgName, owner_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-organizations"] });
      toast.success(s("orgCreated"));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      if (!isActive) throw new Error("Subscription expired");
      if (!org?.id) throw new Error("No organization selected");
      return (inviteMemberToOrg as any)({
        data: {
          email: memberEmail,
          orgId: org.id,
          invitedBy: user?.id,
        },
      });
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["org-members-suite"] });
      toast.success(
        `${res.name || s("memberAddedFallback")} ${s("memberAdded")}`,
      );
      setMemberEmail("");
    },
    onError: (e: any) => toast.error(e.message || "Failed to add member"),
  });

  const assignSeatMutation = useMutation({
    mutationFn: async ({ memberId, courseId }: { memberId: string; courseId: string }) => {
      if (!isActive) throw new Error("Subscription expired");
      return (assignCourseToMember as any)({
        data: { memberId, courseId, assignedBy: user?.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["org-packages-management", "org-members-suite"],
      });
      toast.success(s("seatAssigned"));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async ({ memberId, courseId }: { memberId: string; courseId: string }) => {
      await (removeCourseFromMember as any)({
        data: { memberId, courseId, orgId: org.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["org-packages-management", "org-members-suite"],
      });
      toast.success(s("accessRevoked"));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateOrgMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!org?.id) return;
      const { error } = await supabase.from("organizations").update({ name }).eq("id", org.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-organizations"] });
      toast.success(s("orgUpdated"));
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleBuyLicenses = async () => {
    if (!org || !courseId || !selectedCourse || !user) return;

    if (selectedCourse.creatorId === user.id) {
      try {
        await (provisionFreeCourseToOrg as any)({
          data: { orgId: org.id, courseId: selectedCourse.id, userId: user.id },
        });
        toast.success(t("creatorBenefitSuccess"));
        setBuyOpen(false);
        queryClient.invalidateQueries({
          queryKey: ["org-packages-management", org.id],
        });
        return;
      } catch (e: any) {
        toast.error("Failed to provision seats: " + e.message);
      }
      return;
    }

    try {
      const res = await (createOrgPackageCheckoutSession as any)({
        data: {
          orgId: org.id,
          courseId: selectedCourse.id,
          courseTitle: selectedCourse.title,
          seatCount,
          amountPerSeat: selectedCourse.price,
          userId: user.id,
        },
      });
      if (res.url) window.location.href = res.url;
    } catch (e: any) {
      toast.error("Checkout failed: " + e.message);
    }
  };

  const handlePurchasePlan = async (amount: number, name: string) => {
    if (!user?.id) return;
    try {
      const res = await (createEnterpriseCheckoutSession as any)({
        data: { planName: name, userId: user.id, amount },
      });
      if (res.url) window.location.href = res.url;
    } catch (e: any) {
      toast.error("Checkout failed: " + e.message);
    }
  };

  const exportReport = () => {
    if (!isActive) {
      toast.error(t("accessSuspended"));
      return;
    }
    const rows = [
      [
        s("memberHeader"),
        s("emailAddress"),
        t("coursesEnrolled"),
      ],
      ...members.map((m: any) => [
        m.profiles?.name ?? "—",
        m.profiles?.email ?? "—",
        (m.enrollments || []).map((e: any) => e.courses?.title).join("; "),
      ]),
    ];
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" }),
    );
    a.download = `${org?.name ?? "org"}_report.csv`;
    a.click();
    toast.success(t("exportData"));
  };

  // Loading
  if (!user || loadingOrgs) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
      </div>
    );
  }

  // ── No org: onboarding ─────────────────────────────────────────────────────
  if (!org) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 relative overflow-hidden">
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-10">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-6 shadow-xl shadow-primary/20">
              <Building2 className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">{t("orgWelcome")}</h1>
            <p className="text-muted-foreground mt-2 max-w-xs mx-auto">{t("orgWelcomeSub")}</p>
          </div>

          {isApproved ? (
            <Card className="border-border shadow-2xl">
              <CardHeader>
                <CardTitle className="text-lg">{t("createWorkspace")}</CardTitle>
                <CardDescription>
                  {s("createWorkspaceDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">{t("workspaceName")}</Label>
                  <Input
                    id="orgName"
                    placeholder={t("workspacePlaceholder")}
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <Button
                  onClick={() => createOrgMutation.mutate()}
                  disabled={!newOrgName || createOrgMutation.isPending}
                  className="w-full h-11 shadow-lg shadow-primary/20"
                >
                  {createOrgMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {t("createOrg")} <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <Link
                  to="/"
                  className="block text-center text-xs text-muted-foreground hover:text-primary transition-colors mt-4"
                >
                  {t("returnMainSite")}
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {[
                {
                  name: t("teamStarter"),
                  price: 49,
                  desc: s("teamStarterDesc"),
                  icon: Users,
                },
                {
                  name: t("enterprise"),
                  price: 99,
                  desc: s("enterpriseDesc"),
                  featured: true,
                  icon: Sparkles,
                },
              ].map((plan) => (
                <Card
                  key={plan.name}
                  className={cn(
                    "relative overflow-hidden transition-all hover:border-primary/50",
                    plan.featured && "border-primary/50 bg-primary/5 shadow-lg",
                  )}
                >
                  {plan.featured && (
                    <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest rounded-bl-lg">
                      {t("recommended")}
                    </div>
                  )}
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <div
                      className={cn(
                        "p-2 rounded-lg bg-background border border-border",
                        plan.featured && "border-primary/20",
                      )}
                    >
                      <plan.icon
                        className={cn(
                          "h-5 w-5",
                          plan.featured ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      <CardDescription className="text-xs">{plan.desc}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardFooter className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold">${plan.price}</span>
                      <span className="text-xs text-muted-foreground">
                        {s("perMonth")}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handlePurchasePlan(plan.price, plan.name)}
                      variant={plan.featured ? "default" : "outline"}
                    >
                      {t("selectPlan")}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
              <Link
                to="/"
                className="text-center text-xs text-muted-foreground hover:text-primary transition-colors mt-4"
              >
                {t("maybeLater")}
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Full dashboard ─────────────────────────────────────────────────────────
  const PAGE_LABELS: Record<Tab, { title: string; sub: string }> = {
    overview: {
      title: t("orgOverviewTitle"),
      sub: t("orgOverviewSub"),
    },
    team: {
      title: t("orgTeamTitle"),
      sub: t("orgTeamSub"),
    },
    licenses: {
      title: t("orgLicensesTitle"),
      sub: t("orgLicensesSub"),
    },
    reports: {
      title: t("orgReportsTitle"),
      sub: t("orgReportsSub"),
    },
    settings: {
      title: t("orgSettingsTitle"),
      sub: t("orgSettingsSub"),
    },
  };

  return (
    <div className="flex h-screen w-screen bg-slate-100 relative overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "shrink-0 bg-white border-r border-border flex flex-col relative z-20 shadow-xl transition-[width] duration-300 ease-in-out overflow-hidden",
          sidebarOpen ? "w-64" : "w-16",
        )}
      >
        {/* Org Selector / Info */}
        <div
          className={cn(
            "border-b border-border bg-slate-50/50 flex items-center transition-all duration-300",
            sidebarOpen ? "p-4 justify-between" : "p-4 flex-col justify-center gap-4 h-[88px]",
          )}
        >
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              {myOrgs.length > 1 ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex items-center gap-3 w-full p-1 rounded-xl hover:bg-slate-200/50 transition-all group text-left">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/10">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground truncate">{org?.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <StatusDot active={isActive} />
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0 shadow-2xl border-border rounded-2xl overflow-hidden ml-4">
                    <Command>
                      <CommandInput placeholder={t("switchOrg")} className="h-10" />
                      <CommandList className="max-h-60 custom-scrollbar">
                        <CommandGroup heading={t("myOrgs")}>
                          {myOrgs.map((m: any, idx: number) => (
                            <CommandItem
                              key={m.organization_id}
                              onSelect={() => {
                                setSelectedOrgIndex(idx);
                                setEditOrgName(""); // Reset edit name to sync with new org
                              }}
                              className="flex items-center gap-3 p-3 cursor-pointer"
                            >
                              <div
                                className={cn(
                                  "h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs",
                                  selectedOrgIndex === idx
                                    ? "bg-primary text-white"
                                    : "bg-slate-100 text-slate-500",
                                )}
                              >
                                {initials(m.organizations?.name)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">
                                  {m.organizations?.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground uppercase font-black">
                                  {m.role}
                                </p>
                              </div>
                              {selectedOrgIndex === idx && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/10">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{org?.name}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      <StatusDot active={isActive} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-slate-200 hover:text-foreground transition-colors ml-2"
            title={sidebarOpen ? t("collapseSidebar") : t("expandSidebar")}
          >
            <PanelLeft
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                !sidebarOpen && "rotate-180",
              )}
            />
          </Button>
        </div>

        {/* Expired warning (only when open) */}
        {!isActive && sidebarOpen && (
          <div className="p-3 m-5 bg-destructive/10 border border-destructive/20 rounded-xl text-[11px] text-destructive">
            <div className="flex items-center gap-2 mb-2 font-bold uppercase tracking-wider">
              <AlertCircle className="h-3.5 w-3.5" />
              {t("accessSuspended")}
            </div>
            <p className="leading-relaxed opacity-80 mb-3">{t("subscriptionEnded")}</p>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handlePurchasePlan(49, "Team Starter")}
              className="w-full h-8 text-[11px] font-bold"
            >
              {t("renewSubscription")}
            </Button>
          </div>
        )}

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6 custom-scrollbar">
          <nav className="space-y-1">
            {sidebarOpen && (
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-3 mb-3 truncate">
                {t("mainMenu")}
              </p>
            )}
            <SidebarItem
              icon={LayoutDashboard}
              label={t("overview")}
              active={tab === "overview"}
              onClick={() => setTab("overview")}
              collapsed={!sidebarOpen}
            />
            <SidebarItem
              icon={Users}
              label={t("team")}
              badge={members.length}
              active={tab === "team"}
              onClick={() => setTab("team")}
              collapsed={!sidebarOpen}
            />
            <SidebarItem
              icon={GraduationCap}
              label={t("licenses")}
              badge={packages.length}
              active={tab === "licenses"}
              onClick={() => setTab("licenses")}
              collapsed={!sidebarOpen}
            />
            <SidebarItem
              icon={BarChart2}
              label={t("reports")}
              active={tab === "reports"}
              onClick={() => setTab("reports")}
              collapsed={!sidebarOpen}
            />
            <SidebarItem
              icon={Settings}
              label={t("settings")}
              active={tab === "settings"}
              onClick={() => setTab("settings")}
              collapsed={!sidebarOpen}
            />
          </nav>

          <Separator className="mx-2 opacity-50" />

          <nav className="space-y-1">
            {sidebarOpen && (
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] px-3 mb-3 truncate">
                {s("navigation")}
              </p>
            )}
            <SidebarItem
              icon={Home}
              label={t("backToHome")}
              onClick={() => (window.location.href = "/")}
              collapsed={!sidebarOpen}
            />
          </nav>
        </div>

        {/* User Account */}
        <div className="p-4 border-t border-border bg-slate-50/50 flex justify-center">
          <div
            className={cn(
              "flex items-center rounded-xl hover:bg-white transition-colors cursor-pointer group w-full",
              sidebarOpen ? "gap-3 p-2" : "justify-center p-1 w-10",
            )}
          >
            <Ava
              name={profile?.name ?? undefined}
              url={profile?.avatar_url ?? undefined}
              size={sidebarOpen ? 36 : 28}
            />
            {sidebarOpen && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                    {profile?.name ?? s("accountOwner")}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate opacity-70">
                    {user?.email}
                  </p>
                </div>
                <MoreHorizontal className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content Area ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-border sticky top-0 z-30 px-8 py-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Building2 className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {t("orgSuite")}
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-foreground tracking-tight">
                {PAGE_LABELS[tab].title}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                {PAGE_LABELS[tab].sub}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={exportReport}
              className="h-10 gap-2 shadow-sm border-border/60 hover:border-primary/30 bg-white"
            >
              <Download className="h-4 w-4 text-primary" />
              <span>{t("exportData")}</span>
            </Button>

            <Dialog open={buyOpen} onOpenChange={setBuyOpen}>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="h-10 gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 px-5"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t("purchaseSeats")}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md gap-0 p-0 overflow-hidden rounded-2xl border-border shadow-2xl">
                <div className="bg-primary p-6 text-primary-foreground">
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Ticket className="h-5 w-5" />
                    {t("expandCurriculum")}
                  </DialogTitle>
                  <DialogDescription className="text-primary-foreground/70 mt-1">
                    {t("acquireLicenses")}
                  </DialogDescription>
                </div>

                <div className="p-6 space-y-6">
                  {/* Course selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t("selectCourse")}
                    </Label>
                    <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between h-11 text-sm border-border hover:bg-slate-50"
                        >
                          <span className="truncate font-medium">
                            {courseId
                              ? allCourses.find((c) => c.id === courseId)?.title
                              : t("browseCatalog")}
                          </span>
                          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl border-border shadow-xl overflow-hidden"
                        align="start"
                      >
                        <Command className="rounded-none">
                          <CommandInput
                            placeholder={t("searchCurriculum")}
                            className="h-11 border-0 ring-0 focus:ring-0"
                          />
                          <CommandList
                            className="max-h-72 overflow-y-auto"
                            onWheel={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                              <Search className="h-8 w-8 opacity-20" />
                              <span>{s("noCoursesMatch")}</span>
                            </CommandEmpty>
                            <CommandGroup
                              heading={s("availableCourses")}
                              className="p-1"
                            >
                              {allCourses.map((c) => (
                                <CommandItem
                                  key={c.id}
                                  value={c.title}
                                  onSelect={() => {
                                    setCourseId(c.id);
                                    setPickerOpen(false);
                                  }}
                                  className="flex items-center gap-3 p-3 cursor-pointer rounded-lg aria-selected:bg-primary/5"
                                >
                                  <div className="h-10 w-14 rounded bg-slate-100 flex-shrink-0 overflow-hidden border border-border">
                                    <img
                                      src={c.imageUrl}
                                      className="w-full h-full object-cover"
                                      alt=""
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-foreground truncate text-sm">
                                      {c.title}
                                    </p>
                                    <p className="text-xs text-primary font-semibold mt-0.5">
                                      ${c.price}{" "}
                                      <span className="text-muted-foreground font-normal">
                                        / {s("perSeat")}
                                      </span>
                                    </p>
                                  </div>
                                  {courseId === c.id && (
                                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Quantity or Creator Provision */}
                  {selectedCourse?.creatorId === user?.id ? (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="p-4 flex gap-4">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-primary/10">
                          <Sparkles className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{s("creatorBenefitTitle")}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {s("creatorBenefitDesc")}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {t("quantity")}
                          </Label>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border-emerald-100 uppercase"
                          >
                            {Math.round(discount * 100)}% {t("discount")}
                          </Badge>
                        </div>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={seatCount}
                          onChange={(e) => setSeatCount(parseInt(e.target.value) || 1)}
                          className="h-11 text-lg font-bold"
                        />
                      </div>

                      {selectedCourse && (
                        <div className="rounded-xl bg-slate-50 border border-border/50 p-4 space-y-3">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{t("standardRate")}</span>
                            <span>${selectedCourse.price * seatCount}</span>
                          </div>
                          <div className="flex justify-between text-xs text-emerald-600 font-medium">
                            <span>
                              {t("volumeDiscount")} ({Math.round(discount * 100)}%)
                            </span>
                            <span>−${Math.round(selectedCourse.price * seatCount * discount)}</span>
                          </div>
                          <Separator className="bg-border/50" />
                          <div className="flex justify-between items-baseline">
                            <span className="text-sm font-bold">{t("estimatedTotal")}</span>
                            <span className="text-2xl font-black text-primary">${finalTotal}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={handleBuyLicenses}
                    disabled={
                      !courseId || (selectedCourse?.creatorId !== user?.id && seatCount < 1)
                    }
                    className="w-full h-12 text-base font-bold shadow-xl shadow-primary/20"
                  >
                    {selectedCourse?.creatorId === user?.id ? (
                      s("issueFreeBtn")
                    ) : (
                      <>
                        {t("proceedPayment")}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        {/* Content with Scroll Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-8">
          {/* ── Overview ───────────────────────────────────────────────── */}
          {tab === "overview" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  icon={Users}
                  label={t("teamSize")}
                  value={members.length}
                  hint={t("registeredMembers")}
                  color="blue"
                />
                <MetricCard
                  icon={Ticket}
                  label={t("licensePool")}
                  value={totalSeats}
                  hint={t("totalCapacity")}
                  color="amber"
                />
                <MetricCard
                  icon={GraduationCap}
                  label={t("activeLearners")}
                  value={usedSeats}
                  hint={`${totalSeats - usedSeats} ${t("seatsFree")}`}
                  color="green"
                />
                <MetricCard
                  icon={PieChart}
                  label={t("adoptionRate")}
                  value={`${usagePct}%`}
                  hint={t("curriculumUsage")}
                  color="purple"
                  hintUp
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Activity chart */}
                <Card className="lg:col-span-2 border-border/50 shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50/50 border-b border-border/50 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold">{t("learningActivity")}</CardTitle>
                      <CardDescription className="text-xs">{t("enrollmentVolume")}</CardDescription>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      {t("monthlyView")}
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="flex items-end gap-3 h-48">
                      {chartData.map(({ l, h, w }) => {
                        const gradients = [
                          "bg-slate-200",
                          "bg-slate-300",
                          "bg-slate-400",
                          "bg-primary/40",
                          "bg-primary/70",
                          "bg-primary",
                        ];
                        return (
                          <div key={l} className="flex flex-col items-center flex-1 gap-3 group">
                            <div className="relative w-full">
                              <div
                                className={cn(
                                  "w-full rounded-t-lg transition-all duration-700 group-hover:opacity-80",
                                  gradients[Math.min(w, 5)],
                                )}
                                style={{ height: `${h}%` }}
                              >
                                {h > 15 && (
                                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-primary/5 px-1.5 py-0.5 rounded">
                                    {Math.round(h)}%
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              {l}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* License utilization */}
                <Card className="border-border/50 shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50/50 border-b border-border/50">
                    <CardTitle className="text-base font-bold">{t("courseUtilization")}</CardTitle>
                    <CardDescription className="text-xs">{t("seatUsage")}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                      {packages.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center">
                          <div className="p-4 bg-slate-50 rounded-full mb-3">
                            <GraduationCap className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                          <p className="text-xs text-muted-foreground font-medium">
                            {t("noLicenses")}
                          </p>
                        </div>
                      ) : (
                        packages.slice(0, 5).map((p: any) => (
                          <div key={p.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                            <div className="flex justify-between items-center mb-2.5">
                              <span className="text-xs font-bold text-foreground truncate max-w-[160px]">
                                {p.courses?.title}
                              </span>
                              <span className="text-[10px] font-bold text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
                                {p.used_seats} / {p.max_seats}
                              </span>
                            </div>
                            <ProgressBar used={p.used_seats} max={p.max_seats} />
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                  {packages.length > 5 && (
                    <CardFooter className="p-3 border-t border-border/50 justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTab("licenses")}
                        className="text-[11px] font-bold text-primary"
                      >
                        {s("viewAllLicenses")}
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              </div>

              {/* Team preview */}
              <Card className="border-border/50 shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-border/50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">{t("recentMembers")}</CardTitle>
                    <CardDescription className="text-xs">{t("latestUsers")}</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTab("team")}
                    className="h-8 text-[11px] font-bold border-border/60"
                  >
                    {t("directory")} →
                  </Button>
                </CardHeader>
                <Table>
                  <TableHeader className="bg-slate-50/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-6 py-4">
                        {s("userHeader")}
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">
                        {s("statusHeader")}
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">
                        {s("learningProfile")}
                      </TableHead>
                      <TableHead className="w-[100px] text-right pr-6 py-4" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.slice(0, 4).map((m: any) => (
                      <TableRow
                        key={m.id}
                        className="group transition-colors hover:bg-slate-50/50 border-border/50"
                      >
                        <TableCell className="pl-6 py-4">
                          <div className="flex items-center gap-3">
                            <Ava name={m.profiles?.name} url={m.profiles?.avatar_url} size={32} />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-foreground">
                                {m.profiles?.name ?? "—"}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {m.profiles?.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={m.role === "admin" ? "default" : "secondary"}
                            className="h-5 px-2 text-[9px] font-bold uppercase tracking-wider"
                          >
                            {m.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {m.enrollments.length === 0 ? (
                              <span className="text-[10px] text-muted-foreground/40 italic font-medium">
                                {s("notEnrolledYet")}
                              </span>
                            ) : (
                              m.enrollments.slice(0, 2).map((e: any, i: number) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="h-5 px-2 text-[9px] bg-white border-border/60"
                                >
                                  {e.courses?.title}
                                </Badge>
                              ))
                            )}
                            {m.enrollments.length > 2 && (
                              <span className="text-[9px] font-bold text-muted-foreground self-center">
                                +{m.enrollments.length - 2} {s("moreCount").replace("{n}", "")}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTab("licenses")}
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* ── Team ───────────────────────────────────────────────────── */}
          {tab === "team" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
              <Card className="border-border/50 shadow-sm overflow-hidden bg-white">
                <div className="p-6 bg-slate-50/50 border-b border-border/50">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold">{t("orgDirectory")}</h2>
                      <p className="text-xs text-muted-foreground">{t("addMemberSub")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative w-full md:w-80">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                        <Input
                          placeholder="invite@company.com"
                          value={memberEmail}
                          onChange={(e) => setMemberEmail(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addMemberMutation.mutate()}
                          disabled={!isActive}
                          className="h-10 pl-9 pr-24 bg-white"
                        />
                        <Button
                          size="sm"
                          onClick={() => addMemberMutation.mutate()}
                          disabled={!memberEmail || addMemberMutation.isPending || !isActive}
                          className="absolute right-1 top-1 bottom-1 h-auto text-[10px] font-bold uppercase tracking-wider"
                        >
                          {addMemberMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            t("addUser")
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <Table>
                  <TableHeader className="bg-slate-50/30">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-8 py-4">
                        {s("memberHeader")}
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">
                        {s("rolePermissions")}
                      </TableHead>
                      <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">
                        {s("courseAccess")}
                      </TableHead>
                      <TableHead className="text-right pr-8 py-4 w-[140px]">
                        <span className="text-[10px] font-bold uppercase tracking-widest">
                          {s("actionHeader")}
                        </span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingMembers ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-20">
                          <Loader2 className="h-8 w-8 animate-spin text-primary/20 mx-auto" />
                          <p className="text-xs text-muted-foreground mt-4 font-medium">
                            {t("syncingDirectory")}
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : members.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-24">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-border/60">
                              <Users className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-bold">{t("directoryEmpty")}</p>
                              <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                                {t("inviteMembersSub")}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      members.map((m: any) => (
                        <TableRow
                          key={m.id}
                          className="group border-border/50 hover:bg-slate-50/30 transition-colors"
                        >
                          <TableCell className="pl-8 py-5">
                            <div className="flex items-center gap-4">
                              <Ava name={m.profiles?.name} url={m.profiles?.avatar_url} size={36} />
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-foreground">
                                  {m.profiles?.name ?? s("userRegistered")}
                                </p>
                                <p className="text-xs text-muted-foreground">{m.profiles?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant={m.role === "admin" ? "default" : "secondary"}
                                className="h-5 w-fit text-[9px] font-bold uppercase tracking-widest"
                              >
                                {m.role}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground/60 font-medium ml-1">
                                {s("joined")}{" "}
                                {new Date(m.joined_at).toLocaleDateString()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5 max-w-sm">
                              {m.enrollments?.length === 0 ? (
                                <span className="text-xs text-muted-foreground/40 italic font-medium">
                                  {s("noActiveCourses")}
                                </span>
                              ) : (
                                m.enrollments.map((e: any, i: number) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="h-5 px-2 text-[9px] bg-white font-medium border-border/60"
                                  >
                                    {e.courses?.title}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="pr-8 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!isActive}
                              onClick={() => setTab("licenses")}
                              className="h-9 gap-2 shadow-sm border-border group-hover:border-primary/50 group-hover:text-primary transition-all font-bold text-[11px]"
                            >
                              {t("assignSeats")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          {/* ── Licenses ───────────────────────────────────────────────── */}
          {tab === "licenses" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
              {packages.length === 0 ? (
                <Card className="border-dashed border-2 py-24 text-center bg-white/40 backdrop-blur-sm">
                  <CardContent className="flex flex-col items-center gap-6">
                    <div className="h-20 w-20 rounded-3xl bg-slate-50 flex items-center justify-center border border-border">
                      <Ticket className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold">{t("noLicensesAvailable")}</h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        {t("noLicensesSub")}
                      </p>
                    </div>
                    <Button
                      size="lg"
                      onClick={() => setBuyOpen(true)}
                      className="gap-2 shadow-xl shadow-primary/20"
                    >
                      <Plus className="h-4 w-4" />
                      {t("exploreCurriculum")}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {packages.map((pkg: any) => {
                    const pct =
                      pkg.max_seats > 0
                        ? Math.min(100, Math.round((pkg.used_seats / pkg.max_seats) * 100))
                        : 0;
                    const unassigned = members.filter(
                      (m: any) => !pkg.assignments.find((a: any) => a.member_id === m.id),
                    );

                    return (
                      <Card
                        key={pkg.id}
                        className={cn(
                          "relative flex flex-col overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md bg-white/80 backdrop-blur-sm",
                          !isActive && "opacity-70 grayscale-[0.5]",
                        )}
                      >
                        <div className="h-24 bg-slate-900 relative overflow-hidden flex items-center px-6">
                          <div className="absolute inset-0 opacity-20">
                            <img
                              src={pkg.courses?.imageUrl}
                              className="w-full h-full object-cover blur-sm"
                              alt=""
                            />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-transparent" />
                          <div className="relative z-10 flex items-center gap-4">
                            <div className="h-14 w-14 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 p-1">
                              <img
                                src={pkg.courses?.imageUrl}
                                className="w-full h-full object-cover rounded shadow-lg"
                                alt=""
                              />
                            </div>
                            <div>
                              <h3 className="text-white font-black text-lg leading-tight truncate max-w-[280px]">
                                {pkg.courses?.title}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-[10px] font-black uppercase tracking-widest">
                                  {pkg.used_seats} / {pkg.max_seats} {t("seatsUsed")}
                                </Badge>
                                <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                                  {pct}% {t("allocated")}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="absolute top-4 right-6">
                            <div
                              className={cn(
                                "h-12 w-12 rounded-full border-4 border-white/10 flex items-center justify-center font-black text-xs",
                                pct >= 100 ? "text-destructive" : "text-white/80",
                              )}
                            >
                              {pct}%
                            </div>
                          </div>
                        </div>

                        <div className="p-6 space-y-6 bg-white/50 flex-1">
                          <div className="space-y-2">
                            <ProgressBar
                              used={pkg.used_seats}
                              max={pkg.max_seats}
                              className="h-2"
                            />
                          </div>

                          <div className="space-y-3">
                            <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground flex items-center gap-2">
                              <UserPlus className="h-3 w-3" />
                              {t("assignNewLearner")}
                            </Label>
                            <div className="flex gap-2">
                              <select
                                className="flex-1 h-11 px-4 rounded-xl border border-border bg-slate-50 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 disabled:bg-slate-100 transition-all appearance-none cursor-pointer"
                                onChange={(e) => {
                                  if (e.target.value) {
                                    assignSeatMutation.mutate({
                                      memberId: e.target.value,
                                      courseId: pkg.course_id,
                                    });
                                    e.target.value = "";
                                  }
                                }}
                                disabled={pct >= 100 || !isActive}
                              >
                                <option value="">
                                  {!isActive
                                    ? t("accessSuspended")
                                    : pct >= 100
                                      ? s("noCapacity")
                                      : s("searchTeam")}
                                </option>
                                {unassigned.map((m: any) => (
                                  <option key={m.id} value={m.id}>
                                    {m.profiles?.name} ({m.profiles?.email})
                                  </option>
                                ))}
                              </select>
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-11 w-11 shrink-0 rounded-xl"
                                disabled={pct >= 100 || !isActive}
                              >
                                <ChevronDown className="h-5 w-5 opacity-40" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                                {t("activeAssignments")}
                              </p>
                              <Badge variant="outline" className="text-[9px] font-bold py-0 h-4">
                                {pkg.assignments.length}
                              </Badge>
                            </div>

                            <div className="grid gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                              {pkg.assignments.length === 0 ? (
                                <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-border/60">
                                  <p className="text-[11px] text-muted-foreground/50 font-medium">
                                    {s("noSeatsAssigned")}
                                  </p>
                                </div>
                              ) : (
                                pkg.assignments.map((a: any) => {
                                  const member = members.find((m: any) => m.id === a.member_id);
                                  return (
                                    <div
                                      key={a.id}
                                      className="flex items-center justify-between p-3 bg-slate-50/80 hover:bg-slate-100 transition-colors rounded-xl border border-transparent hover:border-border/60"
                                    >
                                      <div className="flex items-center gap-3 min-w-0">
                                        <Ava
                                          name={member?.profiles?.name ?? undefined}
                                          url={member?.profiles?.avatar_url ?? undefined}
                                          size={28}
                                        />
                                        <div className="min-w-0">
                                          <p className="text-[11px] font-bold text-foreground truncate">
                                            {member?.profiles?.name}
                                          </p>
                                          <p className="text-[9px] text-muted-foreground truncate opacity-70">
                                            {member?.profiles?.email}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 pl-3">
                                        <div className="h-5 px-1.5 rounded bg-emerald-500/10 flex items-center gap-1.5 shrink-0">
                                          <div className="h-1 w-1 rounded-full bg-emerald-500" />
                                          <span className="text-[9px] font-bold text-emerald-600 uppercase">
                                            {s("enrolledBadge")}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() =>
                                            revokeMutation.mutate({
                                              memberId: a.member_id,
                                              courseId: pkg.course_id,
                                            })
                                          }
                                          disabled={!isActive || revokeMutation.isPending}
                                          className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all disabled:opacity-30"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Reports ────────────────────────────────────────────────── */}
          {tab === "reports" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                  icon={Users}
                  label={t("activeLearners")}
                  value={members.length}
                  hint={s("inDirectory")}
                  color="blue"
                />
                <MetricCard
                  icon={CheckCircle2}
                  label={s("orgProgress")}
                  value={`${avgCompletion}%`}
                  hint={s("avgCompletionRate")}
                  color="green"
                  hintUp
                />
                <MetricCard
                  icon={History}
                  label={s("usageHistory")}
                  value={totalSeats}
                  hint={s("seatsProcessed")}
                  color="purple"
                />
              </div>

              <Card className="border-border/50 shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-border/50 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">
                      {t("comprehensiveReport")}
                    </CardTitle>
                    <CardDescription className="text-xs">{t("detailedAudit")}</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={exportReport}
                    disabled={!isActive}
                    className="h-9 gap-2 shadow-sm font-bold"
                  >
                    <Download className="h-4 w-4" />
                    {t("exportFiles")}
                  </Button>
                </CardHeader>

                {!isActive ? (
                  <div className="py-24 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-destructive/10 text-destructive mb-6">
                      <ShieldAlert className="h-8 w-8" />
                    </div>
                    <h3 className="text-base font-bold text-foreground">
                      {t("analyticsDisabled")}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
                      {s("analyticsDisabledDesc")}
                    </p>
                    <Button
                      variant="link"
                      onClick={() => handlePurchasePlan(49, "Team Starter")}
                      className="mt-4 text-xs font-bold underline"
                    >
                      {t("renewAccess")}
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/30">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-8 py-5">
                            {s("fullName")}
                          </TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-widest py-5">
                            {s("emailAddress")}
                          </TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-widest py-5">
                            {s("enrollmentStatus")}
                          </TableHead>
                          <TableHead className="text-[10px] font-bold uppercase tracking-widest py-5">
                            {s("overallProgress")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((m: any) => {
                          const avgProg =
                            m.enrollments.length > 0
                              ? Math.round(
                                  m.enrollments.reduce(
                                    (acc: number, e: any) => acc + (e.progress_percent || 0),
                                    0,
                                  ) / m.enrollments.length,
                                )
                              : 0;

                          return (
                            <TableRow
                              key={m.id}
                              className="border-border/50 hover:bg-slate-50/30 transition-colors"
                            >
                              <TableCell className="pl-8 py-4">
                                <p className="text-xs font-bold text-foreground">
                                  {m.profiles?.name ?? "—"}
                                </p>
                              </TableCell>
                              <TableCell className="py-4">
                                <p className="text-xs text-muted-foreground font-medium">
                                  {m.profiles?.email}
                                </p>
                              </TableCell>
                              <TableCell className="py-4">
                                {m.enrollments?.length === 0 ? (
                                  <Badge
                                    variant="outline"
                                    className="h-5 text-[9px] text-muted-foreground opacity-50 uppercase tracking-widest"
                                  >
                                    {t("idle")}
                                  </Badge>
                                ) : (
                                  <div className="flex -space-x-1">
                                    {m.enrollments.slice(0, 4).map((e: any, i: number) => (
                                      <div
                                        key={i}
                                        className="h-6 w-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center overflow-hidden"
                                        title={e.courses?.title}
                                      >
                                        <img
                                          src={e.courses?.imageUrl}
                                          className="h-full w-full object-cover"
                                          alt=""
                                        />
                                      </div>
                                    ))}
                                    {m.enrollments.length > 4 && (
                                      <div className="h-6 w-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                                        +{m.enrollments.length - 4}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center gap-3">
                                  <ProgressBar used={avgProg} max={100} className="w-24 h-1.5" />
                                  <span
                                    className={cn(
                                      "text-[10px] font-black tracking-tighter",
                                      avgProg >= 90
                                        ? "text-emerald-600"
                                        : avgProg > 0
                                          ? "text-primary"
                                          : "text-muted-foreground/30",
                                    )}
                                  >
                                    {avgProg}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ── Settings ───────────────────────────────────────────────── */}
          {tab === "settings" && (
            <div className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
              <Card className="border-border/50 shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-border/50">
                  <CardTitle className="text-base font-bold">{t("profileIdentity")}</CardTitle>
                  <CardDescription className="text-xs">{t("profileIdentitySub")}</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* Logo / Avatar side */}
                    <div className="flex flex-col items-center gap-4">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground self-start">
                        {t("companyLogo")}
                      </Label>
                      <div className="relative group">
                        <div className="h-32 w-32 rounded-3xl bg-primary text-primary-foreground flex items-center justify-center text-4xl font-black shadow-xl shadow-primary/10 border-4 border-white">
                          {org.logo_url ? (
                            <img
                              src={org.logo_url}
                              className="h-full w-full object-cover rounded-[22px]"
                              alt=""
                            />
                          ) : (
                            initials(org.name)
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                          <Plus className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground text-center max-w-[120px]">
                        {t("logoDesc")}
                      </p>
                    </div>

                    {/* Fields side */}
                    <div className="flex-1 space-y-6">
                      <div className="space-y-2">
                        <Label
                          htmlFor="editOrgName"
                          className="text-xs font-bold text-muted-foreground"
                        >
                          {t("orgDisplayName")}
                        </Label>
                        <Input
                          id="editOrgName"
                          value={editOrgName}
                          onChange={(e) => setEditOrgName(e.target.value)}
                          className="h-11 font-medium bg-white"
                          placeholder={t("enterCompanyName")}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground">
                          {t("workspaceUrl")}
                        </Label>
                        <div className="flex items-center gap-2">
                          <div className="h-11 flex-1 bg-slate-50 border border-border rounded-lg px-4 flex items-center text-sm text-muted-foreground font-medium">
                            ai-spark-learn.com/org/{org.id.slice(0, 8)}
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 shrink-0 bg-white"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-slate-50/50 border-t border-border/50 p-4 px-6 flex justify-between items-center">
                  <p className="text-[10px] text-muted-foreground font-medium italic">
                    {t("changesReflected")}
                  </p>
                  <Button
                    disabled={
                      !editOrgName || editOrgName === org.name || updateOrgMutation.isPending
                    }
                    onClick={() => updateOrgMutation.mutate(editOrgName)}
                    className="h-9 px-6 font-bold shadow-lg shadow-primary/20"
                  >
                    {updateOrgMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    {t("saveWorkspace")}
                  </Button>
                </CardFooter>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-border/50 shadow-sm opacity-60 bg-white">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 text-primary mb-1">
                      <CreditCard className="h-4 w-4" />
                      <CardTitle className="text-sm font-bold">{t("billingUsage")}</CardTitle>
                    </div>
                    <CardDescription className="text-[11px]">
                      {t("billingUsageSub")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-[11px] font-bold h-8 bg-white"
                      disabled
                    >
                      {t("manageSubscription")}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm opacity-60 bg-white">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2 text-primary mb-1">
                      <ShieldAlert className="h-4 w-4" />
                      <CardTitle className="text-sm font-bold">{t("accessControl")}</CardTitle>
                    </div>
                    <CardDescription className="text-[11px]">
                      {t("accessControlSub")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-[11px] font-bold h-8 bg-white"
                      disabled
                    >
                      {t("configureRoles")}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
