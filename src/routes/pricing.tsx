import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Building2,
  Users,
  BarChart2,
  ShieldCheck,
  Zap,
  Globe,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useI18n, type Language } from "@/lib/i18n";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { createSubscriptionCheckoutSession, createAdCheckoutSession } from "@/lib/stripe";
import { updateCourse } from "@/lib/courses";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";

export const Route = createFileRoute("/pricing")({
  component: Pricing,
  head: () => ({ meta: [{ title: "Institutional Pricing — LearnLab" }] }),
});

// ─── Localisation strings ────────────────────────────────────────────────────
const pricingStrings: Record<Language, Record<string, string | string[]>> = {
  en: {
    badge: "Professional Investment",
    heroHeading1: "Scale your",
    heroHeading2: "Intelligence.",
    heroSub: "Choose the right path for your personal growth or global workforce training.",
    sectionIndividual: "Individual Mastery",
    sectionPromote: "Promote Your Courses",
    sectionEnterprise: "Institutional B2B",
    footerStandards: "Supported by Global Standards",
    investment: "Investment",
    startNow: "Start Now",
    days: "Days",
    selectCoursePromote: "Select Course to Promote",
    selectCoursePackage: "Package",
    selectCourseCampaign: "Select Course for Campaign",
    noCourses: "You don't have any published courses yet.",
    currentlyPromoted: "Currently Promoted",
    activeInCampaign: "Active in Campaign",
    select: "Select",
    leave: "Leave",
    join: "Join",
    campaignFreeJoin: "Free to join! (+15% fee applied on sale)",
    pleaseLogin: "Please login first",
    alreadyFree: "You are already on the free plan",
    joinedCampaign: "Successfully joined campaign!",
    leftCampaign: "Successfully left campaign",
    featuredPlacementTitle: "Featured Placement",
    featuredPlacementSub: "Top spots in home and categories",
    revenueShareAdsTitle: "Revenue-share Ads",
    revenueShareAdsSub: "Pay only when you sell",
    revenueShareAdsBody:
      "Join homepage campaigns for free! Offer 10% discount to customers and +5% platform fee (total +15% on your base rate) to scale your student base.",
    startPromotingToday: "Start Promoting Today",
  },
  th: {
    badge: "การลงทุนระดับมืออาชีพ",
    heroHeading1: "ยกระดับ",
    heroHeading2: "ความรู้และความสามารถ",
    heroSub: "เลือกเส้นทางที่เหมาะสมสำหรับการเติบโตส่วนบุคคลหรือการฝึกอบรมทีมงานระดับโลกของคุณ",
    sectionIndividual: "ความเชี่ยวชาญเฉพาะบุคคล",
    sectionPromote: "โปรโมตหลักสูตรของคุณ",
    sectionEnterprise: "บริการสำหรับสถาบันและองค์กร",
    footerStandards: "ได้รับการสนับสนุนโดยมาตรฐานระดับโลก",
    investment: "การลงทุน",
    startNow: "เริ่มต้นใช้งาน",
    days: "วัน",
    selectCoursePromote: "เลือกคอร์สที่จะโปรโมต",
    selectCoursePackage: "แพ็กเกจ",
    selectCourseCampaign: "เลือกคอร์สร่วมแคมเปญ",
    noCourses: "คุณยังไม่มีคอร์สที่เผยแพร่แล้ว",
    currentlyPromoted: "โปรโมตอยู่",
    activeInCampaign: "เข้าร่วมอยู่",
    select: "เลือก",
    leave: "ยกเลิก",
    join: "เข้าร่วม",
    campaignFreeJoin: "ฟรีค่าเข้าร่วม! (หักส่วนแบ่งเพิ่ม 15% เมื่อขายได้)",
    pleaseLogin: "กรุณาเข้าสู่ระบบก่อน",
    alreadyFree: "คุณอยู่ในแพลนฟรีอยู่แล้ว",
    joinedCampaign: "เข้าร่วมแคมเปญสำเร็จ!",
    leftCampaign: "ยกเลิกการเข้าร่วมสำเร็จ",
    featuredPlacementTitle: "Featured Placement (ดันคอร์ส)",
    featuredPlacementSub: "ขึ้นหน้าแรกและอันดับต้นๆ ของหมวดหมู่",
    revenueShareAdsTitle: "Revenue-share Ads (แคมเปญ)",
    revenueShareAdsSub: "จ่ายเฉพาะเมื่อขายได้จริง",
    revenueShareAdsBody:
      "เข้าร่วมแคมเปญโปรโมตหน้าแรกฟรี! โดยมอบส่วนลด 10% ให้ลูกค้า และเพิ่มส่วนแบ่งให้แพลตฟอร์ม 5% (รวมหักเพิ่ม 15% จากเรตปกติ) เพื่อขยายฐานผู้เรียนให้กว้างขวางขึ้น",
    startPromotingToday: "เริ่มโปรโมตวันนี้",
  },
  es: {
    badge: "Inversión Profesional",
    heroHeading1: "Amplía tu",
    heroHeading2: "Inteligencia.",
    heroSub: "Elige el camino adecuado para tu crecimiento personal o el entrenamiento de tu equipo.",
    sectionIndividual: "Dominio Individual",
    sectionPromote: "Promociona Tus Cursos",
    sectionEnterprise: "B2B Institucional",
    footerStandards: "Respaldado por Estándares Globales",
    investment: "Inversión",
    startNow: "Empezar Ahora",
    days: "Días",
    selectCoursePromote: "Selecciona Curso a Promover",
    selectCoursePackage: "Paquete",
    selectCourseCampaign: "Selecciona Curso para Campaña",
    noCourses: "Aún no tienes cursos publicados.",
    currentlyPromoted: "Actualmente Promovido",
    activeInCampaign: "Activo en Campaña",
    select: "Seleccionar",
    leave: "Salir",
    join: "Unirse",
    campaignFreeJoin: "¡Gratis unirse! (Se aplica +15% de tarifa en la venta)",
    pleaseLogin: "Por favor inicia sesión primero",
    alreadyFree: "Ya estás en el plan gratuito",
    joinedCampaign: "¡Te uniste a la campaña con éxito!",
    leftCampaign: "Saliste de la campaña con éxito",
    featuredPlacementTitle: "Colocación Destacada",
    featuredPlacementSub: "Posiciones destacadas en inicio y categorías",
    revenueShareAdsTitle: "Anuncios con Reparto de Ingresos",
    revenueShareAdsSub: "Paga solo cuando vendas",
    revenueShareAdsBody:
      "¡Únete a campañas de inicio gratis! Ofrece 10% de descuento a clientes y +5% de tarifa de plataforma (total +15% sobre tu tarifa base) para escalar tu base de estudiantes.",
    startPromotingToday: "Comienza a Promocionar Hoy",
  },
  ja: {
    badge: "プロフェッショナル投資",
    heroHeading1: "知識を",
    heroHeading2: "スケールアップ。",
    heroSub: "個人の成長またはグローバルな人材育成に適したパスを選択してください。",
    sectionIndividual: "個人マスタリー",
    sectionPromote: "コースをプロモート",
    sectionEnterprise: "法人・組織向けサービス",
    footerStandards: "グローバル標準に対応",
    investment: "投資",
    startNow: "今すぐ始める",
    days: "日間",
    selectCoursePromote: "プロモートするコースを選択",
    selectCoursePackage: "パッケージ",
    selectCourseCampaign: "キャンペーンに参加するコースを選択",
    noCourses: "まだ公開済みのコースがありません。",
    currentlyPromoted: "プロモート中",
    activeInCampaign: "キャンペーン参加中",
    select: "選択",
    leave: "退出",
    join: "参加",
    campaignFreeJoin: "参加無料！（販売時+15%の手数料が適用されます）",
    pleaseLogin: "先にログインしてください",
    alreadyFree: "すでに無料プランに加入しています",
    joinedCampaign: "キャンペーンへの参加が完了しました！",
    leftCampaign: "キャンペーンから退出しました",
    featuredPlacementTitle: "フィーチャー掲載",
    featuredPlacementSub: "ホームとカテゴリのトップ掲載枠",
    revenueShareAdsTitle: "収益シェア広告",
    revenueShareAdsSub: "売れた時だけ支払い",
    revenueShareAdsBody:
      "ホームページキャンペーンに無料参加！顧客に10%割引を提供し、プラットフォーム手数料+5%（ベースレートに+15%合計）で学習者ベースを拡大しましょう。",
    startPromotingToday: "今日からプロモート開始",
  },
  zh: {
    badge: "专业投资",
    heroHeading1: "提升您的",
    heroHeading2: "知识与技能。",
    heroSub: "为您的个人成长或全球团队培训选择正确的路径。",
    sectionIndividual: "个人精通",
    sectionPromote: "推广您的课程",
    sectionEnterprise: "机构与企业服务",
    footerStandards: "由全球标准支持",
    investment: "投资",
    startNow: "立即开始",
    days: "天",
    selectCoursePromote: "选择要推广的课程",
    selectCoursePackage: "套餐",
    selectCourseCampaign: "选择参与活动的课程",
    noCourses: "您还没有已发布的课程。",
    currentlyPromoted: "正在推广",
    activeInCampaign: "活动参与中",
    select: "选择",
    leave: "退出",
    join: "加入",
    campaignFreeJoin: "免费加入！（销售时收取+15%费用）",
    pleaseLogin: "请先登录",
    alreadyFree: "您已在免费套餐中",
    joinedCampaign: "成功加入活动！",
    leftCampaign: "成功退出活动",
    featuredPlacementTitle: "精选展示",
    featuredPlacementSub: "首页和分类页顶部展示位",
    revenueShareAdsTitle: "收益分成广告",
    revenueShareAdsSub: "仅在销售时付费",
    revenueShareAdsBody:
      "免费参加首页活动！为客户提供10%折扣，并向平台增加5%的分成（总计+15%基础费率），以扩大您的学习者群体。",
    startPromotingToday: "今天开始推广",
  },
  ko: {
    badge: "전문적인 투자",
    heroHeading1: "지식과 기술을",
    heroHeading2: "확장하세요.",
    heroSub: "개인 성장 또는 세계적인 팀 교육을 위한 올바른 경로를 선택하세요.",
    sectionIndividual: "개인 마스터리",
    sectionPromote: "강의 홍보하기",
    sectionEnterprise: "기관 및 조직 서비스",
    footerStandards: "글로벌 표준으로 지원",
    investment: "투자",
    startNow: "지금 시작",
    days: "일",
    selectCoursePromote: "홍보할 강의 선택",
    selectCoursePackage: "패키지",
    selectCourseCampaign: "캠페인에 참여할 강의 선택",
    noCourses: "아직 게시된 강의가 없습니다.",
    currentlyPromoted: "현재 홍보 중",
    activeInCampaign: "캠페인 참여 중",
    select: "선택",
    leave: "나가기",
    join: "참여",
    campaignFreeJoin: "무료로 참여! (판매 시 +15% 수수료 적용)",
    pleaseLogin: "먼저 로그인해 주세요",
    alreadyFree: "이미 무료 플랜을 이용 중입니다",
    joinedCampaign: "캠페인에 성공적으로 참여했습니다!",
    leftCampaign: "캠페인에서 성공적으로 나갔습니다",
    featuredPlacementTitle: "추천 게재",
    featuredPlacementSub: "홈 및 카테고리 최상단 노출",
    revenueShareAdsTitle: "수익 공유 광고",
    revenueShareAdsSub: "판매 시에만 비용 지불",
    revenueShareAdsBody:
      "홈페이지 캠페인에 무료로 참여하세요! 고객에게 10% 할인을 제공하고 플랫폼 수수료 +5%(기본 요금의 총 +15%)를 추가하여 학습자 기반을 확장하세요.",
    startPromotingToday: "오늘 홍보 시작",
  },
};

// Per-tier translations
const tierTranslations: Record<
  Language,
  {
    individual: { name: string; desc: string; features: string[] }[];
    enterprise: { name: string; desc: string; features: string[]; cta: string; suffix: string }[];
  }
> = {
  en: {
    individual: [
      {
        name: "Free",
        desc: "Try the system and create your first course",
        features: ["20% Revenue Share", "Free AI course creation (2 times)", "Basic management tools"],
      },
      {
        name: "Starter",
        desc: "For beginners in earning income",
        features: ["12% Revenue Share", "10 AI course creations per month", "Course Boost Feature", "Basic data analysis"],
      },
      {
        name: "Growth",
        desc: "For professionals and agencies",
        features: ["10% Revenue Share", "30 AI course creations per month", "Advanced analytics", "Early access to new features"],
      },
      {
        name: "Pro",
        desc: "The ultimate course creation experience",
        features: ["5% Revenue Share", "Unlimited AI-powered course creation*", "White-label (Coming Soon)", "Personal account assistant"],
      },
    ],
    enterprise: [
      {
        name: "Team Starter",
        desc: "Build your first team of learners",
        features: ["Maximum 10 member seats", "Basic seat management", "Standard team reports", "Single organization interface"],
        cta: "Getting Started for Your Team",
        suffix: "/ month",
      },
      {
        name: "Enterprise Elite",
        desc: "Large-scale Institutional Training",
        features: ["Unlimited Seats", "Employee Learning Reports (CSV/PDF)", "AI-Powered Learning Analytics", "White-label Brand Portal (Coming Soon)", "24/7 Personal Account Administrator"],
        cta: "Enterprise Start",
        suffix: "/ month",
      },
    ],
  },
  th: {
    individual: [
      {
        name: "Free (ฟรี)",
        desc: "ทดลองระบบและสร้างคอร์สแรก",
        features: ["ส่วนแบ่งรายได้ 20%", "สร้างคอร์สด้วย AI ฟรี 2 ครั้ง", "เครื่องมือจัดการพื้นฐาน"],
      },
      {
        name: "Starter (เริ่มต้น)",
        desc: "สำหรับผู้เริ่มต้นสร้างรายได้",
        features: ["ส่วนแบ่งรายได้ 12%", "สร้างคอร์สด้วย AI 10 ครั้ง/เดือน", "ฟีเจอร์ดันคอร์ส (Boost)", "วิเคราะห์ข้อมูลเบื้องต้น"],
      },
      {
        name: "Growth (เติบโต)",
        desc: "สำหรับมืออาชีพและเอเจนซี่",
        features: ["ส่วนแบ่งรายได้ 10%", "สร้างคอร์สด้วย AI 30 ครั้ง/เดือน", "การวิเคราะห์ขั้นสูง", "สิทธิ์เข้าถึงฟีเจอร์ใหม่ก่อนใคร"],
      },
      {
        name: "Pro (โปร)",
        desc: "ขีดสุดของการสร้างคอร์ส",
        features: ["ส่วนแบ่งรายได้ 5%", "สร้างคอร์สด้วย AI ไม่จำกัด*", "White-label (เร็วๆ นี้)", "ผู้ช่วยส่วนตัวดูแลบัญชี"],
      },
    ],
    enterprise: [
      {
        name: "Team Starter (เริ่มต้นทีม)",
        desc: "สร้างทีมผู้เรียนทีมแรกของคุณ",
        features: ["ที่นั่งสมาชิกสูงสุด 10 ที่นั่ง", "การจัดการที่นั่งขั้นพื้นฐาน", "รายงานทีมมาตรฐาน", "หน้าตาองค์กรเดี่ยว"],
        cta: "เริ่มต้นใช้งานสำหรับทีม",
        suffix: "/ เดือน",
      },
      {
        name: "Enterprise Elite (องค์กร)",
        desc: "การฝึกอบรมระดับสถาบันขนาดใหญ่",
        features: ["จัดสรรที่นั่งได้ไม่จำกัด", "รายงานผลการเรียนของพนักงาน (CSV/PDF)", "ระบบวิเคราะห์การเรียนรู้ด้วย AI", "White-label พอร์ทัลเฉพาะแบรนด์ (เร็วๆ นี้)", "ผู้ดูแลบัญชีส่วนตัวตลอด 24/7"],
        cta: "เริ่มต้นระดับองค์กร",
        suffix: "/ เดือน",
      },
    ],
  },
  es: {
    individual: [
      {
        name: "Gratis",
        desc: "Prueba el sistema y crea tu primer curso",
        features: ["20% de Reparto de Ingresos", "Creación de cursos con IA gratis (2 veces)", "Herramientas de gestión básicas"],
      },
      {
        name: "Starter",
        desc: "Para principiantes que generan ingresos",
        features: ["12% de Reparto de Ingresos", "10 creaciones de cursos con IA por mes", "Función de Impulso de Curso", "Análisis de datos básico"],
      },
      {
        name: "Growth",
        desc: "Para profesionales y agencias",
        features: ["10% de Reparto de Ingresos", "30 creaciones de cursos con IA por mes", "Analítica avanzada", "Acceso anticipado a nuevas funciones"],
      },
      {
        name: "Pro",
        desc: "La experiencia definitiva de creación de cursos",
        features: ["5% de Reparto de Ingresos", "Creación ilimitada de cursos con IA*", "Marca blanca (Próximamente)", "Asistente personal de cuenta"],
      },
    ],
    enterprise: [
      {
        name: "Team Starter",
        desc: "Construye tu primer equipo de aprendices",
        features: ["Máximo 10 asientos para miembros", "Gestión básica de asientos", "Informes de equipo estándar", "Interfaz de organización única"],
        cta: "Comenzar para Tu Equipo",
        suffix: "/ mes",
      },
      {
        name: "Enterprise Elite",
        desc: "Formación Institucional a Gran Escala",
        features: ["Asientos Ilimitados", "Informes de Aprendizaje de Empleados (CSV/PDF)", "Análisis de Aprendizaje con IA", "Portal de Marca White-label (Próximamente)", "Administrador Personal de Cuenta 24/7"],
        cta: "Inicio Empresarial",
        suffix: "/ mes",
      },
    ],
  },
  ja: {
    individual: [
      {
        name: "無料",
        desc: "システムを試して最初のコースを作成",
        features: ["収益シェア20%", "AIコース作成無料（2回）", "基本管理ツール"],
      },
      {
        name: "スターター",
        desc: "収入を始める初心者向け",
        features: ["収益シェア12%", "AIコース作成10回/月", "コースブースト機能", "基本データ分析"],
      },
      {
        name: "グロース",
        desc: "プロフェッショナルとエージェンシー向け",
        features: ["収益シェア10%", "AIコース作成30回/月", "高度な分析", "新機能への早期アクセス"],
      },
      {
        name: "プロ",
        desc: "究極のコース作成体験",
        features: ["収益シェア5%", "AIコース作成無制限*", "ホワイトラベル（近日公開）", "個人アカウントアシスタント"],
      },
    ],
    enterprise: [
      {
        name: "チームスターター",
        desc: "最初の学習チームを構築",
        features: ["最大10メンバーシート", "基本シート管理", "標準チームレポート", "単一組織インターフェース"],
        cta: "チームを始める",
        suffix: "/ 月",
      },
      {
        name: "エンタープライズエリート",
        desc: "大規模な機関トレーニング",
        features: ["無制限シート", "従業員学習レポート（CSV/PDF）", "AI学習分析", "ホワイトラベルブランドポータル（近日公開）", "24/7専任アカウント管理者"],
        cta: "エンタープライズ開始",
        suffix: "/ 月",
      },
    ],
  },
  zh: {
    individual: [
      {
        name: "免费",
        desc: "试用系统并创建您的第一个课程",
        features: ["20% 收益分成", "免费AI课程创建（2次）", "基础管理工具"],
      },
      {
        name: "入门版",
        desc: "适合初次获得收入的创作者",
        features: ["12% 收益分成", "每月10次AI课程创建", "课程推广功能", "基础数据分析"],
      },
      {
        name: "成长版",
        desc: "适合专业人士和机构",
        features: ["10% 收益分成", "每月30次AI课程创建", "高级分析", "新功能优先体验"],
      },
      {
        name: "专业版",
        desc: "终极课程创建体验",
        features: ["5% 收益分成", "无限AI课程创建*", "白标（即将推出）", "个人账户助手"],
      },
    ],
    enterprise: [
      {
        name: "团队入门版",
        desc: "建立您的第一个学习团队",
        features: ["最多10个成员席位", "基础席位管理", "标准团队报告", "单一组织界面"],
        cta: "开始您的团队",
        suffix: "/ 月",
      },
      {
        name: "企业精英版",
        desc: "大规模机构培训",
        features: ["无限席位", "员工学习报告（CSV/PDF）", "AI驱动学习分析", "白标品牌门户（即将推出）", "24/7个人账户管理员"],
        cta: "企业开始",
        suffix: "/ 月",
      },
    ],
  },
  ko: {
    individual: [
      {
        name: "무료",
        desc: "시스템을 체험하고 첫 강의를 만들어보세요",
        features: ["20% 수익 공유", "AI 강의 생성 무료 (2회)", "기본 관리 도구"],
      },
      {
        name: "스타터",
        desc: "수익 창출을 시작하는 초보자를 위한",
        features: ["12% 수익 공유", "월 10회 AI 강의 생성", "강의 부스트 기능", "기본 데이터 분석"],
      },
      {
        name: "그로스",
        desc: "전문가와 에이전시를 위한",
        features: ["10% 수익 공유", "월 30회 AI 강의 생성", "고급 분석", "새 기능 조기 접근"],
      },
      {
        name: "프로",
        desc: "궁극의 강의 제작 경험",
        features: ["5% 수익 공유", "무제한 AI 강의 생성*", "화이트라벨 (출시 예정)", "개인 계정 어시스턴트"],
      },
    ],
    enterprise: [
      {
        name: "팀 스타터",
        desc: "첫 번째 학습 팀 구성",
        features: ["최대 10명 회원 좌석", "기본 좌석 관리", "표준 팀 보고서", "단일 조직 인터페이스"],
        cta: "팀 시작하기",
        suffix: "/ 월",
      },
      {
        name: "엔터프라이즈 엘리트",
        desc: "대규모 기관 교육",
        features: ["무제한 좌석", "직원 학습 보고서 (CSV/PDF)", "AI 기반 학습 분석", "화이트라벨 브랜드 포털 (출시 예정)", "24/7 개인 계정 관리자"],
        cta: "엔터프라이즈 시작",
        suffix: "/ 월",
      },
    ],
  },
};

function Pricing() {
  const { lang, t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const s = (key: string) => pricingStrings[lang]?.[key] as string ?? pricingStrings.en[key] as string;

  // State for Ad/Campaign Modals
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [selectedAdPackage, setSelectedAdPackage] = useState<{
    days: number;
    price: number;
  } | null>(null);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch user's courses for the selection modal
  const { data: myCourses = [] } = useQuery({
    queryKey: ["my-courses-for-ads", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, status, ad_type, is_campaign_active")
        .eq("creator_id", user.id)
        .eq("status", "published");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleSubscriptionPurchase = async (tierId: string, amount: string | number) => {
    if (!user) {
      toast.info(s("pleaseLogin"));
      navigate({ to: "/login", search: { mode: "login" } });
      return;
    }

    if (amount === "0" || amount === 0) {
      toast.success(s("alreadyFree"));
      return;
    }

    try {
      setIsSubmitting(true);
      const numericAmount =
        typeof amount === "string" ? parseInt(amount.replace(/,/g, "")) : amount;

      const result = await (createSubscriptionCheckoutSession as any)({
        data: {
          tier: tierId.split(" ")[0].toLowerCase(),
          userId: user.id,
          amount: numericAmount,
        },
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate checkout");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyAd = async (courseId: string, courseTitle: string) => {
    if (!selectedAdPackage || !user) return;
    try {
      setIsSubmitting(true);
      const result = await (createAdCheckoutSession as any)({
        data: {
          courseId,
          courseTitle,
          userId: user.id,
          durationDays: selectedAdPackage.days,
          amount: selectedAdPackage.price,
          adType: "featured",
        },
      });

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to initiate checkout");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCourseMutation = useMutation({
    mutationFn: async ({ id, isCampaignActive }: { id: string; isCampaignActive: boolean }) => {
      await (updateCourse as any)({
        data: { id, updates: { isCampaignActive }, userId: user?.id },
      });
    },
    onSuccess: (_, variables) => {
      toast.success(variables.isCampaignActive ? s("joinedCampaign") : s("leftCampaign"));
      queryClient.invalidateQueries({ queryKey: ["my-courses-for-ads", user?.id] });
    },
    onError: (err: any) => toast.error(err.message || "Failed to update campaign status"),
  });

  const handleToggleCampaign = (courseId: string, currentStatus: boolean) => {
    updateCourseMutation.mutate({ id: courseId, isCampaignActive: !currentStatus });
  };

  const localTiers = tierTranslations[lang] ?? tierTranslations.en;

  const individualTiers = localTiers.individual.map((tier, i) => ({
    ...tier,
    price: ["0", "299", "879", "2,499"][i],
    featured: i === 1,
  }));

  const enterpriseTiers = localTiers.enterprise.map((tier, i) => ({
    ...tier,
    price: ["1,790", "3,590"][i],
    icon: [Users, Building2][i],
    highlight: i === 1,
  }));

  return (
    <SiteLayout>
      <div className="min-h-screen bg-[#f8fafc] pb-32">
        {/* Header Section */}
        <div className="bg-white border-b border-slate-200 pt-32 pb-16">
          <div className="mx-auto max-w-7xl px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4"
            >
              <ShieldCheck className="h-3 w-3" /> {s("badge")}
            </motion.div>
            <h1 className="text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 uppercase italic">
              {s("heroHeading1")}{" "}
              <span className="text-indigo-600">{s("heroHeading2")}</span>
            </h1>
            <p className="mt-4 text-slate-500 font-medium text-lg max-w-2xl mx-auto">
              {s("heroSub")}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 -mt-12 space-y-24">
          {/* Individual Section */}
          <section className="space-y-10">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                {s("sectionIndividual")}
              </h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {individualTiers.map((tier) => (
                <Card
                  key={tier.name}
                  className={cn(
                    "border-none shadow-2xl transition-all duration-500 rounded-[2.5rem] overflow-hidden group",
                    tier.featured
                      ? "bg-slate-900 text-white shadow-indigo-200/50 scale-105 z-10"
                      : "bg-white text-slate-900",
                  )}
                >
                  <CardContent className="p-10 space-y-10">
                    <div className="space-y-2">
                      <p
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          tier.featured ? "text-indigo-400" : "text-slate-400",
                        )}
                      >
                        {tier.name}
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-black tracking-tighter">{tier.price}</span>
                        <span
                          className={cn("text-xs font-bold uppercase tracking-widest opacity-40")}
                        >
                          THB
                        </span>
                      </div>
                      <p className="text-sm font-medium opacity-60">{tier.desc}</p>
                    </div>

                    <ul className="space-y-4">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-3">
                          <Check
                            className={cn(
                              "h-4 w-4 mt-0.5 shrink-0",
                              tier.featured ? "text-indigo-400" : "text-indigo-600",
                            )}
                          />
                          <span className="text-sm font-medium leading-none">{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      className={cn(
                        "w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all active:scale-95",
                        tier.featured
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-900 border border-slate-200",
                      )}
                      onClick={() => handleSubscriptionPurchase(tier.name, tier.price)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        s("startNow")
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Ads Section */}
          <section className="space-y-12">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                {s("sectionPromote")}
              </h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <Card className="bg-white border-2 border-dashed border-indigo-200 p-10 rounded-[2.5rem] shadow-xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Zap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">
                      {s("featuredPlacementTitle")}
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">
                      {s("featuredPlacementSub")}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { days: 3, price: 89 },
                    { days: 7, price: 199 },
                    { days: 14, price: 349 },
                    { days: 30, price: 699 },
                  ].map((ad) => (
                    <button
                      key={ad.days}
                      onClick={() => {
                        if (!user) {
                          toast.info(s("pleaseLogin"));
                          navigate({ to: "/login", search: { mode: "login" } });
                          return;
                        }
                        setSelectedAdPackage(ad);
                        setIsAdModalOpen(true);
                      }}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex justify-between items-center hover:bg-indigo-50 hover:border-indigo-200 transition-all active:scale-95 cursor-pointer text-left w-full"
                    >
                      <span className="text-xs font-black uppercase tracking-tighter text-slate-500">
                        {ad.days} {s("days")}
                      </span>
                      <span className="text-lg font-black text-indigo-600">
                        {ad.price} <small className="text-[8px] opacity-60">THB</small>
                      </span>
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="bg-indigo-600 p-10 rounded-[2.5rem] shadow-xl text-white">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                    <BarChart2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">
                      {s("revenueShareAdsTitle")}
                    </h3>
                    <p className="text-sm text-indigo-100 font-medium">
                      {s("revenueShareAdsSub")}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium leading-relaxed mb-8 opacity-80">
                  {s("revenueShareAdsBody")}
                </p>
                <button
                  onClick={() => {
                    if (!user) {
                      toast.info(s("pleaseLogin"));
                      navigate({ to: "/login", search: { mode: "login" } });
                      return;
                    }
                    setIsCampaignModalOpen(true);
                  }}
                  className="p-4 rounded-2xl bg-white/10 border border-white/20 text-center w-full hover:bg-white/20 transition-all active:scale-95 cursor-pointer"
                >
                  <span className="text-xs font-black uppercase tracking-widest">
                    {s("startPromotingToday")}
                  </span>
                </button>
              </Card>
            </div>
          </section>

          {/* Enterprise Section */}
          <section className="space-y-12">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                {s("sectionEnterprise")}
              </h2>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {enterpriseTiers.map((tier) => (
                <Card
                  key={tier.name}
                  className={cn(
                    "border-none shadow-2xl rounded-[3rem] p-12 transition-all duration-700 relative overflow-hidden group",
                    tier.highlight
                      ? "bg-slate-900 text-white shadow-[0_40px_100px_-20px_rgba(79,70,229,0.3)] border border-indigo-500/20"
                      : "bg-white text-slate-900 border border-slate-100",
                  )}
                >
                  {/* Decorative Icon Background */}
                  <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                    <tier.icon className={cn("h-48 w-48", tier.highlight && "text-indigo-500")} />
                  </div>

                  <div className="relative z-10 h-full flex flex-col">
                    <div className="flex justify-between items-start mb-12">
                      <div className="space-y-3">
                        <div
                          className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center mb-6",
                            tier.highlight
                              ? "bg-indigo-600/30 text-indigo-400 border border-indigo-500/50"
                              : "bg-indigo-50 text-indigo-600",
                          )}
                        >
                          <tier.icon className="h-6 w-6" />
                        </div>
                        <h3
                          className={cn(
                            "text-3xl font-black tracking-tight uppercase leading-none",
                            tier.highlight ? "text-white" : "text-slate-900",
                          )}
                        >
                          {tier.name}
                        </h3>
                        <p
                          className={cn(
                            "text-base font-medium",
                            tier.highlight ? "text-slate-400" : "text-slate-500",
                          )}
                        >
                          {tier.desc}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-[10px] font-black uppercase tracking-widest mb-1 opacity-60",
                          )}
                        >
                          {s("investment")}
                        </p>
                        <div className="flex items-baseline justify-end gap-1">
                          <span
                            className={cn(
                              "text-5xl font-black tracking-tighter",
                              tier.highlight && "text-indigo-400",
                            )}
                          >
                            {tier.price}
                          </span>
                          <span className="text-xs font-bold text-slate-500 uppercase">
                            {tier.suffix}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mb-12 flex-1">
                      {tier.features.map((f) => (
                        <div key={f} className="flex items-center gap-3">
                          <Check
                            className={cn(
                              "h-4 w-4",
                              tier.highlight ? "text-emerald-400" : "text-emerald-500",
                            )}
                          />
                          <span
                            className={cn(
                              "text-sm font-bold tracking-tight",
                              tier.highlight ? "text-white" : "text-slate-600",
                            )}
                          >
                            {f}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Button
                      className={cn(
                        "w-full h-16 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all active:scale-95",
                        tier.highlight
                          ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/30"
                          : "bg-slate-900 text-white hover:bg-slate-800",
                      )}
                      asChild
                    >
                      <Link to="/organization">
                        {tier.cta} <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <div className="text-center pt-10">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
                {s("footerStandards")}
              </p>
              <div className="flex justify-center gap-12 mt-8 opacity-20 grayscale transition-all hover:grayscale-0 cursor-default">
                <ShieldCheck className="h-8 w-8" />
                <Globe className="h-8 w-8" />
                <Zap className="h-8 w-8" />
                <BarChart2 className="h-8 w-8" />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Ad Purchase Modal */}
      <Dialog open={isAdModalOpen} onOpenChange={setIsAdModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">
              {s("selectCoursePromote")}
            </DialogTitle>
            <DialogDescription>
              {s("selectCoursePackage")}: {selectedAdPackage?.days} {s("days")} ({selectedAdPackage?.price} THB)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {myCourses.length === 0 ? (
              <p className="text-sm text-center text-slate-500 py-4">{s("noCourses")}</p>
            ) : (
              myCourses.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50"
                >
                  <div className="min-w-0 pr-4 flex-1">
                    <p className="font-bold text-sm truncate">{c.title}</p>
                    {c.ad_type === "featured" && (
                      <Badge className="mt-1 bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-[10px] border-none">
                        {s("currentlyPromoted")}
                      </Badge>
                    )}
                  </div>
                  <Button
                    onClick={() => handleBuyAd(c.id, c.title)}
                    disabled={isSubmitting || c.ad_type === "featured"}
                    className="bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black uppercase"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      s("select")
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Join Modal */}
      <Dialog open={isCampaignModalOpen} onOpenChange={setIsCampaignModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">
              {s("selectCourseCampaign")}
            </DialogTitle>
            <DialogDescription>{s("campaignFreeJoin")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {myCourses.length === 0 ? (
              <p className="text-sm text-center text-slate-500 py-4">{s("noCourses")}</p>
            ) : (
              myCourses.map((c: any) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50"
                >
                  <div className="min-w-0 pr-4 flex-1">
                    <p className="font-bold text-sm truncate">{c.title}</p>
                    {c.is_campaign_active && (
                      <Badge className="mt-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] border-none">
                        {s("activeInCampaign")}
                      </Badge>
                    )}
                  </div>
                  <Button
                    onClick={() => handleToggleCampaign(c.id, c.is_campaign_active)}
                    disabled={updateCourseMutation.isPending}
                    variant={c.is_campaign_active ? "outline" : "default"}
                    className={cn(
                      "rounded-xl text-xs font-black uppercase min-w-[80px]",
                      c.is_campaign_active
                        ? "border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white",
                    )}
                  >
                    {updateCourseMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : c.is_campaign_active ? (
                      s("leave")
                    ) : (
                      s("join")
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
