import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  deleteCourse,
  fetchCourseById,
  updateCourse,
  isSaleActive,
  getCourseEffectivePrice,
} from "@/lib/courses";
import { useAuth, getCurrentSession } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  Star,
  Play,
  ShieldCheck,
  ChevronRight,
  Eye,
  Plus,
  CheckCircle2,
  Users,
  Loader2,
  Sparkles,
  FileText,
  PlayCircle,
  BrainCircuit,
  Clock,
  BookOpen,
  ArrowLeft,
  Share2,
  Bookmark,
  Settings,
  MoreVertical,
  Layout,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

import {
  fetchLessonsByCourse,
  fetchCurriculumByCourse,
  createLesson,
  deleteLesson,
  updateLesson,
  reorderLessons,
} from "@/lib/lessons";
import { checkEnrollment } from "@/lib/enrollments";
import { fetchModulesByCourse, createModule, deleteModule, reorderModules } from "@/lib/modules";
import { QuizEditor } from "@/components/quiz-editor";
import { motion, AnimatePresence } from "framer-motion";
import {
  uploadFile,
  uploadLessonResource,
  uploadCoursePromoVideo,
  parseStorageUrl,
  getSignedUrl,
  getSignedUploadUrl,
} from "@/lib/storage";
import { generateCourseImage, generateLessonResource, generateCourseMetadata } from "@/lib/ai";

import { COURSE_CATEGORIES } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { fetchReviewsByCourse, createReview } from "@/lib/reviews";
import { submitReport } from "@/lib/moderation";
import { Flag } from "lucide-react";
import { useI18n, type Language } from "@/lib/i18n";

const coursePageStrings: Record<string, Record<string, string>> = {
  "Review submitted! Thank you for your feedback.": {
    "en": "Review submitted! Thank you for your feedback.",
    "th": "ส่งความคิดเห็นเรียบร้อยแล้ว! ขอบคุณสำหรับความคิดเห็นของคุณ",
    "es": "¡Reseña enviada! Gracias por tus comentarios.",
    "ja": "レビューが送信されました！フィードバックありがとうございます。",
    "zh": "评价已提交！感谢您的反馈。",
    "ko": "리뷰가 제출되었습니다! 피드백해 주셔서 감사합니다."
  },
  "Failed to submit review": {
    "en": "Failed to submit review",
    "th": "ไม่สามารถส่งความคิดเห็นได้",
    "es": "Error al enviar la reseña",
    "ja": "レビューの送信に失敗しました",
    "zh": "提交评价失败",
    "ko": "리뷰 제출에 실패했습니다"
  },
  "Student Feedback": {
    "en": "Student Feedback",
    "th": "ความคิดเห็นจากผู้เรียน",
    "es": "Comentarios de los estudiantes",
    "ja": "受講生のフィードバック",
    "zh": "学生反馈",
    "ko": "수강생 피드백"
  },
  "Join thousands of students sharing their journey. Real feedback from real learners.": {
    "en": "Join thousands of students sharing their journey. Real feedback from real learners.",
    "th": "ร่วมแบ่งปันประสบการณ์กับนักเรียนหลายพันคน ความคิดเห็นจริงจากผู้เรียนจริง",
    "es": "Únete a miles de estudiantes que comparten su viaje. Comentarios reales de estudiantes reales.",
    "ja": "学習体験を共有する何千人もの受講生に参加しましょう。実際の学習者からの本物の声。",
    "zh": "与数千名分享学习旅程的学生一起。来自真实学习者的真实反馈。",
    "ko": "여정을 공유하는 수천 명의 학생들과 함께하세요. 실제 수강생들의 진짜 피드백."
  },
  "Average Rating": {
    "en": "Average Rating",
    "th": "คะแนนเฉลี่ย",
    "es": "Calificación promedio",
    "ja": "平均評価",
    "zh": "平均评分",
    "ko": "평균 평점"
  },
  "Total Reviews": {
    "en": "Total Reviews",
    "th": "ความคิดเห็นทั้งหมด",
    "es": "Total de reseñas",
    "ja": "総レビュー数",
    "zh": "评价总数",
    "ko": "총 리뷰 수"
  },
  "Rate your experience": {
    "en": "Rate your experience",
    "th": "ให้คะแนนความพึงพอใจของคุณ",
    "es": "Califica tu experiencia",
    "ja": "評価する",
    "zh": "评价您的体验",
    "ko": "만족도 평가하기"
  },
  "Your feedback helps instructors improve and helps other students make the right choice.": {
    "en": "Your feedback helps instructors improve and helps other students make the right choice.",
    "th": "ความคิดเห็นของคุณช่วยให้ผู้สอนปรับปรุงหลักสูตรและช่วยให้เพื่อนนักเรียนคนอื่นตัดสินใจได้ง่ายขึ้น",
    "es": "Tus comentarios ayudan a los instructores a mejorar y a otros estudiantes a tomar la decisión correcta.",
    "ja": "あなたのフィードバックは講師の改善に役立ち、他の受講生が正しい選択をするのを助けます。",
    "zh": "您的反馈有助于讲师改进并帮助其他学生做出正确选择。",
    "ko": "귀하의 피드백은 강사의 개선을 돕고 다른 학생들이 올바른 선택을 하도록 돕습니다."
  },
  "Overall Rating": {
    "en": "Overall Rating",
    "th": "คะแนนภาพรวม",
    "es": "Calificación general",
    "ja": "総合評価",
    "zh": "总体评分",
    "ko": "전체 평점"
  },
  "Write your review": {
    "en": "Write your review",
    "th": "เขียนความคิดเห็นของคุณ",
    "es": "Escribe tu reseña",
    "ja": "レビューを書く",
    "zh": "撰写评价",
    "ko": "리뷰 작성하기"
  },
  "What did you think of the course quality, instructor, and content?": {
    "en": "What did you think of the course quality, instructor, and content?",
    "th": "คุณคิดอย่างไรกับคุณภาพของคอร์สเรียน ผู้สอน และเนื้อหา?",
    "es": "¿Qué te pareció la calidad del curso, el instructor y el contenido?",
    "ja": "コースの品質、講師、内容についてどう思いましたか？",
    "zh": "您对课程质量、讲师和内容有什么看法？",
    "ko": "강의 품질, 강사 및 내용에 대해 어떻게 생각하셨나요?"
  },
  "Review Published!": {
    "en": "Review Published!",
    "th": "เผยแพร่ความคิดเห็นแล้ว!",
    "es": "¡Reseña publicada!",
    "ja": "レビューが公開されました！",
    "zh": "评价已发布！",
    "ko": "리뷰가 게시되었습니다!"
  },
  "Your feedback is now live. Thank you for helping the community grow.": {
    "en": "Your feedback is now live. Thank you for helping the community grow.",
    "th": "ความคิดเห็นของคุณถูกเผยแพร่แล้ว ขอบคุณสำหรับการมีส่วนร่วมให้ชุมชนของเราเติบโต",
    "es": "Tus comentarios ya están disponibles. Gracias por ayudar a crecer a la comunidad.",
    "ja": "フィードバックが反映されました。コミュニティの成長にご協力いただきありがとうございます。",
    "zh": "您的反馈已上线。感谢您帮助社区成长。",
    "ko": "피드백이 반영되었습니다. 커뮤니티 성장을 도와주셔서 감사합니다."
  },
  "Enrolled Students Only": {
    "en": "Enrolled Students Only",
    "th": "สำหรับนักเรียนที่ลงทะเบียนเท่านั้น",
    "es": "Solo para estudiantes inscritos",
    "ja": "受講生限定",
    "zh": "仅限已购课学生",
    "ko": "등록된 수강생 전용"
  },
  "Experience the curriculum to unlock the ability to share your feedback.": {
    "en": "Experience the curriculum to unlock the ability to share your feedback.",
    "th": "สัมผัสประสบการณ์หลักสูตรเพื่อปลดล็อกความสามารถในการแชร์ความคิดเห็นของคุณ",
    "es": "Experimenta el plan de estudios para desbloquear la capacidad de compartir tus comentarios.",
    "ja": "フィードバックを共有するには、まずカリキュラムを体験してください。",
    "zh": "体验课程以解锁分享反馈的能力。",
    "ko": "피드백을 공유할 수 있도록 먼저 커리큘럼을 경험해보세요."
  },
  "Enroll & Review": {
    "en": "Enroll & Review",
    "th": "ลงทะเบียนและเขียนรีวิว",
    "es": "Inscribirse y opinar",
    "ja": "登録してレビューを書く",
    "zh": "购课并评价",
    "ko": "수강 신청 및 리뷰 작성"
  },
  "Syncing Feedback...": {
    "en": "Syncing Feedback...",
    "th": "กำลังซิงค์ความคิดเห็น...",
    "es": "Sincronizando comentarios...",
    "ja": "フィードバックを同期中...",
    "zh": "正在同步反馈...",
    "ko": "피드백 동기화 중..."
  },
  "No feedback yet": {
    "en": "No feedback yet",
    "th": "ยังไม่มีความคิดเห็นในขณะนี้",
    "es": "Aún no hay comentarios",
    "ja": "レビューはまだありません",
    "zh": "暂无反馈",
    "ko": "아직 피드백이 없습니다"
  },
  "Be the pioneer and start the conversation.": {
    "en": "Be the pioneer and start the conversation.",
    "th": "เริ่มต้นเป็นคนแรกในการแชร์ความคิดเห็นกันเถอะ",
    "es": "Sé el pionero y comienza la conversación.",
    "ja": "最初のレビューを書いてみましょう。",
    "zh": "成为先驱并开始交流。",
    "ko": "첫 번째로 의견을 남겨보세요."
  },
  "Anonymous Student": {
    "en": "Anonymous Student",
    "th": "ผู้เรียนไม่ประสงค์ออกนาม",
    "es": "Estudiante anónimo",
    "ja": "匿名の受講生",
    "zh": "匿名学生",
    "ko": "익명의 수강생"
  },
  "Recently": {
    "en": "Recently",
    "th": "เมื่อเร็วๆ นี้",
    "es": "Recientemente",
    "ja": "最近",
    "zh": "最近",
    "ko": "최근"
  },
  "Verified": {
    "en": "Verified",
    "th": "ยืนยันแล้ว",
    "es": "Verificado",
    "ja": "認証済み",
    "zh": "已验证",
    "ko": "인증됨"
  },
  "Thank you. Our moderation team will review this course.": {
    "en": "Thank you. Our moderation team will review this course.",
    "th": "ขอบคุณสำหรับข้อมูล ทีมผู้ดูแลของเราจะทำการตรวจสอบหลักสูตรนี้",
    "es": "Gracias. Nuestro equipo de moderación revisará este curso.",
    "ja": "ありがとうございます。管理チームがこのコースを審査します。",
    "zh": "谢谢。我们的审核团队将审查这门课程。",
    "ko": "감사합니다. 모니터링 팀이 이 강의를 검토할 예정입니다."
  },
  "Failed to submit report": {
    "en": "Failed to submit report",
    "th": "ไม่สามารถส่งรายงานได้",
    "es": "Error al enviar el reporte",
    "ja": "通報の送信に失敗しました",
    "zh": "提交举报失败",
    "ko": "신고 제출에 실패했습니다"
  },
  "Report Course": {
    "en": "Report Course",
    "th": "รายงานหลักสูตร",
    "es": "Reportar curso",
    "ja": "コースを通報する",
    "zh": "举报课程",
    "ko": "강의 신고하기"
  },
  "Help us keep LearnLab safe. Why are you reporting this course?": {
    "en": "Help us keep LearnLab safe. Why are you reporting this course?",
    "th": "ช่วยเราดูแลความปลอดภัยใน LearnLab เหตุใดคุณจึงต้องการรายงานหลักสูตรนี้?",
    "es": "¿Ayúdanos a mantener seguro LearnLab. ¿Por qué estás reportando este curso?",
    "ja": "LearnLabの安全を維持するためにご協力ください。このコースを通報する理由は何ですか？",
    "zh": "帮助我们维护 LearnLab 的安全。您为什么要举报这门课程？",
    "ko": "LearnLab을 안전하게 유지할 수 있도록 도와주세요. 이 강의를 신고하는 이유는 무엇인가요?"
  },
  "Violation Reason": {
    "en": "Violation Reason",
    "th": "สาเหตุการละเมิด",
    "es": "Motivo de la violación",
    "ja": "違反の理由",
    "zh": "违规原因",
    "ko": "신고 사유"
  },
  "Additional Context": {
    "en": "Additional Context",
    "th": "รายละเอียดเพิ่มเติม",
    "es": "Contexto adicional",
    "ja": "追加のコンテキスト",
    "zh": "补充说明",
    "ko": "추가 설명"
  },
  "Provide specific details about the violation...": {
    "en": "Provide specific details about the violation...",
    "th": "โปรดระบุรายละเอียดเฉพาะเกี่ยวกับการละเมิด...",
    "es": "Proporciona detalles específicos sobre la violación...",
    "ja": "違反に関する具体的な詳細を入力してください...",
    "zh": "提供关于违规的具体细节...",
    "ko": "신고 내용에 대한 구체적인 내용을 제공해 주세요..."
  },
  "Cancel": {
    "en": "Cancel",
    "th": "ยกเลิก",
    "es": "Cancelar",
    "ja": "キャンセル",
    "zh": "取消",
    "ko": "취소"
  },
  "Smart Preview Mode": {
    "en": "Smart Preview Mode",
    "th": "โหมดดูตัวอย่างอัจฉริยะ",
    "es": "Modo de vista previa inteligente",
    "ja": "スマートプレビューモード",
    "zh": "智能预览模式",
    "ko": "스마트 미리보기 모드"
  },
  "Back to Editor": {
    "en": "Back to Editor",
    "th": "กลับไปที่หน้าแก้ไข",
    "es": "Volver al editor",
    "ja": "エディターに戻る",
    "zh": "返回编辑器",
    "ko": "편집기로 돌아가기"
  },
  "Professional Track": {
    "en": "Professional Track",
    "th": "หลักสูตรระดับมืออาชีพ",
    "es": "Ruta profesional",
    "ja": "プロフェッショナルトラック",
    "zh": "专业路径",
    "ko": "전문가 트랙"
  },
  "Beginner": {
    "en": "Beginner",
    "th": "เริ่มต้น",
    "es": "Principiante",
    "ja": "初級",
    "zh": "初级",
    "ko": "초급"
  },
  "Intermediate": {
    "en": "Intermediate",
    "th": "ปานกลาง",
    "es": "Intermedio",
    "ja": "中級",
    "zh": "中级",
    "ko": "중급"
  },
  "Advanced": {
    "en": "Advanced",
    "th": "ขั้นสูง",
    "es": "Avanzado",
    "ja": "上級",
    "zh": "高级",
    "ko": "고급"
  },
  "Premium Content": {
    "en": "Premium Content",
    "th": "เนื้อหาระดับพรีเมียม",
    "es": "Contenido premium",
    "ja": "プレミアムコンテンツ",
    "zh": "优质内容",
    "ko": "프리미엄 콘텐츠"
  },
  "Total Learners": {
    "en": "Total Learners",
    "th": "ผู้เรียนทั้งหมด",
    "es": "Total de estudiantes",
    "ja": "総受講者数",
    "zh": "学员总数",
    "ko": "총 수강생"
  },
  "Avg. Rating": {
    "en": "Avg. Rating",
    "th": "คะแนนเฉลี่ย",
    "es": "Calificación prom.",
    "ja": "平均評価",
    "zh": "平均评分",
    "ko": "평균 평점"
  },
  "Curriculum": {
    "en": "Curriculum",
    "th": "โครงสร้างหลักสูตร",
    "es": "Plan de estudios",
    "ja": "カリキュラム",
    "zh": "课程大纲",
    "ko": "커리큘럼"
  },
  "Lessons": {
    "en": "Lessons",
    "th": "บทเรียน",
    "es": "Lecciones",
    "ja": "レッスン",
    "zh": "课时",
    "ko": "레슨"
  },
  "Promo Video is being prepared by AI.": {
    "en": "Promo Video is being prepared by AI.",
    "th": "วิดีโอแนะนำตัวคอร์สกำลังสร้างโดย AI",
    "es": "El video promocional está siendo preparado por la IA.",
    "ja": "プロモーションビデオはAIによって準備中です。",
    "zh": "宣传视频正由AI准备中。",
    "ko": "홍보 영상이 AI에 의해 준비 중입니다."
  },
  "Preview Limit Reached": {
    "en": "Preview Limit Reached",
    "th": "ถึงขีดจำกัดการดูตัวอย่างแล้ว",
    "es": "Límite de vista previa alcanzado",
    "ja": "プレビュー制限に達しました",
    "zh": "已达到预览限制",
    "ko": "미리보기 한도에 도달했습니다"
  },
  "Enroll now to unlock the full lesson content.": {
    "en": "Enroll now to unlock the full lesson content.",
    "th": "ลงทะเบียนตอนนี้เพื่อเข้าถึงเนื้อหาบทเรียนทั้งหมด",
    "es": "Inscríbete ahora para desbloquear el contenido completo de la lección.",
    "ja": "今すぐ登録して、すべてのレッスン内容をアンロックしましょう。",
    "zh": "立即购课以解锁全部课时内容。",
    "ko": "지금 등록하여 전체 레슨 내용을 잠금 해제하세요."
  },
  "Unlock Full Access": {
    "en": "Unlock Full Access",
    "th": "ปลดล็อกการเข้าถึงทั้งหมด",
    "es": "Desbloquear acceso completo",
    "ja": "フルアクセスをアンロック",
    "zh": "解锁全部权限",
    "ko": "전체 액세스 잠금 해제"
  },
  "Verified Path": {
    "en": "Verified Path",
    "th": "เส้นทางที่ได้รับการรับรอง",
    "es": "Ruta verificada",
    "ja": "認証済みのパス",
    "zh": "验证路径",
    "ko": "인증된 경로"
  },
  "Official Certificate": {
    "en": "Official Certificate",
    "th": "ใบประกาศนียบัตรอย่างเป็นทางการ",
    "es": "Certificado oficial",
    "ja": "公式修了証",
    "zh": "官方证书",
    "ko": "공식 수료증"
  },
  "Course Curriculum": {
    "en": "Course Curriculum",
    "th": "โครงสร้างหลักสูตร",
    "es": "Plan de estudios del curso",
    "ja": "コースカリキュラム",
    "zh": "课程大纲",
    "ko": "강의 커리큘럼"
  },
  "Total Lessons": {
    "en": "Total Lessons",
    "th": "บทเรียนทั้งหมด",
    "es": "Total de lecciones",
    "ja": "総レッスン数",
    "zh": "总课时",
    "ko": "총 레슨 수"
  },
  "Lessons Included": {
    "en": "Lessons Included",
    "th": "บทเรียนที่รวมอยู่",
    "es": "Lecciones incluidas",
    "ja": "含まれるレッスン",
    "zh": "包含课时",
    "ko": "포함된 레슨"
  },
  "Enroll to watch this lesson": {
    "en": "Enroll to watch this lesson",
    "th": "กรุณาลงทะเบียนเรียนเพื่อดูบทเรียนนี้",
    "es": "Inscríbete para ver esta lección",
    "ja": "このレッスンを視聴するには登録してください",
    "zh": "请先购课以观看此课时",
    "ko": "이 레슨을 보려면 수강 신청을 해주세요"
  },
  "Free Preview": {
    "en": "Free Preview",
    "th": "ทดลองเรียนฟรี",
    "es": "Vista previa gratis",
    "ja": "無料プレビュー",
    "zh": "免费试听",
    "ko": "무료 미리보기"
  },
  "Video Content": {
    "en": "Video Content",
    "th": "บทเรียนวิดีโอ",
    "es": "Contenido de video",
    "ja": "ビデオコンテンツ",
    "zh": "视频内容",
    "ko": "비디오 콘텐츠"
  },
  "Quiz Content": {
    "en": "Quiz Content",
    "th": "บทเรียนควิซ",
    "es": "Contenido de cuestionario",
    "ja": "クイズコンテンツ",
    "zh": "测验内容",
    "ko": "퀴즈 콘텐츠"
  },
  "Text Content": {
    "en": "Text Content",
    "th": "บทความอ่าน",
    "es": "Contenido de texto",
    "ja": "テキストコンテンツ",
    "zh": "文本内容",
    "ko": "텍스트 콘텐츠"
  },
  "Slide Content": {
    "en": "Slide Content",
    "th": "สไลด์ประกอบ",
    "es": "Contenido de diapositivas",
    "ja": "スライドコンテンツ",
    "zh": "幻灯片内容",
    "ko": "슬라이드 콘텐츠"
  },
  "Access Granted": {
    "en": "Access Granted",
    "th": "ได้รับสิทธิ์เข้าเรียนแล้ว",
    "es": "Acceso concedido",
    "ja": "アクセス許可済み",
    "zh": "已获得权限",
    "ko": "액세스 권한 부여됨"
  },
  "Lifetime access is active.": {
    "en": "Lifetime access is active.",
    "th": "คุณมีสิทธิ์เข้าเรียนได้ตลอดชีพ",
    "es": "El acceso de por vida está activo.",
    "ja": "無期限アクセスが有効です。",
    "zh": "终身访问权限已激活。",
    "ko": "평생 액세스가 활성화되어 있습니다."
  },
  "One-time Payment": {
    "en": "One-time Payment",
    "th": "ชำระเงินครั้งเดียว",
    "es": "Pago único",
    "ja": "一括払い",
    "zh": "一次性付款",
    "ko": "일시불"
  },
  "Publish Review": {
    "en": "Publish Review",
    "th": "เผยแพร่ความคิดเห็น",
    "es": "Publicar Reseña",
    "ja": "レビューを公開",
    "zh": "发布评价",
    "ko": "리뷰 게시"
  },
  "Submit Report": {
    "en": "Submit Report",
    "th": "ส่งรายงาน",
    "es": "Enviar Reporte",
    "ja": "通報を送信",
    "zh": "提交举报",
    "ko": "신고 제출"
  },
  "Inappropriate content": {
    "en": "Inappropriate content",
    "th": "เนื้อหาไม่เหมาะสม",
    "es": "Contenido inapropiado",
    "ja": "不適切なコンテンツ",
    "zh": "不当内容",
    "ko": "부적절한 콘텐츠"
  },
  "Copyright infringement": {
    "en": "Copyright infringement",
    "th": "ละเมิดลิขสิทธิ์",
    "es": "Infracción de derechos de autor",
    "ja": "著作権侵害",
    "zh": "侵犯版权",
    "ko": "저작권 침해"
  },
  "Spam or misleading": {
    "en": "Spam or misleading",
    "th": "สแปมหรือทำให้เข้าใจผิด",
    "es": "Spam o engañoso",
    "ja": "スパムまたは誤解を招く内容",
    "zh": "垃圾内容或误导性信息",
    "ko": "스팸 또는 오도하는 정보"
  },
  "Harassment or hate speech": {
    "en": "Harassment or hate speech",
    "th": "การคุกคามหรือวาจาสร้างความเกลียดชัง",
    "es": "Acoso o discurso de odio",
    "ja": "嫌がらせまたはヘイトスピーチ",
    "zh": "骚扰或仇恨言论",
    "ko": "괴롭힘 또는 혐오 발언"
  },
  "Other violation": {
    "en": "Other violation",
    "th": "การละเมิดอื่นๆ",
    "es": "Otra violación",
    "ja": "その他の違反",
    "zh": "其他违规",
    "ko": "기타 신고"
  },
  "Copyright Violation": {
    "en": "Copyright Violation",
    "th": "การละเมิดลิขสิทธิ์",
    "es": "Infracción de derechos de autor",
    "ja": "著作権侵害",
    "zh": "侵犯版权",
    "ko": "저작권 침해"
  },
  "Spam or Misleading": {
    "en": "Spam or Misleading",
    "th": "สแปมหรือข้อมูลที่ทำให้เข้าใจผิด",
    "es": "Spam o engañoso",
    "ja": "スパムまたは誤解を招く内容",
    "zh": "垃圾内容或误导性信息",
    "ko": "스팸 또는 오도하는 정보"
  },
  "Harassment": {
    "en": "Harassment",
    "th": "การล่วงละเมิดหรือกลั่นแกล้ง",
    "es": "Acoso",
    "ja": "嫌がらせ",
    "zh": "骚扰",
    "ko": "괴롭힘"
  },
  "Other": {
    "en": "Other",
    "th": "อื่นๆ",
    "es": "Otro",
    "ja": "その他",
    "zh": "其他",
    "ko": "기타"
  }
};

const getCourseStrings = (key: string, lang: string) => {
  return coursePageStrings[key]?.[lang] ?? coursePageStrings[key]?.['en'] ?? key;
};

const getFlashSaleText = (price: number, lang: Language) => {
  switch (lang) {
    case "th":
      return `⚡ ลดราคาพิเศษ (ราคาปกติ: $${price})`;
    case "es":
      return `⚡ Venta Flash (Original: $${price})`;
    case "ja":
      return `⚡ フラッシュセール (元値: $${price})`;
    case "zh":
      return `⚡ 限时特惠 (原价: $${price})`;
    case "ko":
      return `⚡ 플래시 세일 (정가: $${price})`;
    default:
      return `⚡ Flash Sale (Original: $${price})`;
  }
};

const getPartnerDealText = (price: number, lang: Language) => {
  switch (lang) {
    case "th":
      return `🤝 แคมเปญพาร์ทเนอร์ (ปกติ: $${price})`;
    case "es":
      return `🤝 Trato de Socio (Original: $${price})`;
    case "ja":
      return `🤝 パートナーディール (元値: $${price})`;
    case "zh":
      return `🤝 合作伙伴特惠 (原价: $${price})`;
    case "ko":
      return `🤝 파트너 딜 (정가: $${price})`;
    default:
      return `🤝 Partner Deal (Original: $${price})`;
  }
};


const getSmartPreviewText = (lang: Language) => {
  switch (lang) {
    case "th":
      return (
        <>
          กำลังดูตัวอย่างหลักสูตรในฐานะ{" "}
          <span className="text-emerald-400">นักเรียนที่ลงทะเบียนเรียน</span>
        </>
      );
    case "es":
      return (
        <>
          Visualizando el curso como un{" "}
          <span className="text-emerald-400">estudiante inscrito</span>.
        </>
      );
    case "ja":
      return (
        <>
          <span className="text-emerald-400">受講生</span>としてコースをプレビュー中。
        </>
      );
    case "zh":
      return (
        <>
          正在以<span className="text-emerald-400">已购课学生</span>身份预览课程。
        </>
      );
    case "ko":
      return (
        <>
          <span className="text-emerald-400">등록된 수강생</span> 자격으로 강의를 미리 보는 중.
        </>
      );
    default:
      return (
        <>
          Viewing course as an{" "}
          <span className="text-emerald-400">enrolled student</span>.
        </>
      );
  }
};


export const Route = createFileRoute("/courses/$courseId/")({
  component: CourseDetail,
  head: ({ params }) => ({
    meta: [{ title: `Course — LearnLab` }],
  }),
});

// --- COMPONENT: Review Section ---
function ReviewSection({
  courseId,
  userId,
  isEnrolled,
}: {
  courseId: string;
  userId: string | undefined;
  isEnrolled: boolean;
}) {
  const { lang } = useI18n();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hoverRating, setHoverRating] = useState(0);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", courseId],
    queryFn: () => fetchReviewsByCourse(courseId),
  });

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1);
  }, [reviews]);

  const hasReviewed = useMemo(() => {
    return userId && reviews.some((r) => r.userId === userId);
  }, [reviews, userId]);

  const reviewMutation = useMutation({
    mutationFn: () =>
      createReview({
        course_id: courseId,
        user_id: userId!,
        rating,
        comment,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviews", courseId] });
      queryClient.invalidateQueries({ queryKey: ["courses", courseId] });
      toast.success(
        getCourseStrings("Review submitted! Thank you for your feedback.", lang),
      );
      setComment("");
    },
    onError: (err: any) => {
      toast.error(
        err.message || (getCourseStrings("Failed to submit review", lang)),
      );
    },
  });

  return (
    <section className="space-y-20 pt-24 border-t border-slate-100">
      {/* HEADER WITH STATS */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12">
        <div className="max-w-xl space-y-4">
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none">
            {getCourseStrings("Student Feedback", lang)}
          </h2>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            {getCourseStrings("Join thousands of students sharing their journey. Real feedback from real learners.", lang)}
          </p>
        </div>

        <div className="flex items-center gap-8 bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.03)]">
          <div className="text-center space-y-1 pr-8 border-r border-slate-100">
            <div className="text-5xl font-black text-slate-900 tracking-tighter">
              {averageRating}
            </div>
            <div className="flex gap-0.5 justify-center">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={cn(
                    "h-3 w-3",
                    s <= Math.round(Number(averageRating))
                      ? "text-amber-500 fill-current"
                      : "text-slate-200",
                  )}
                />
              ))}
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">
              {getCourseStrings("Average Rating", lang)}
            </p>
          </div>
          <div className="text-center space-y-1">
            <div className="text-5xl font-black text-slate-900 tracking-tighter">
              {reviews.length}
            </div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {getCourseStrings("Total Reviews", lang)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        {/* REVIEW FORM CARD */}
        <div className="lg:col-span-5">
          {isEnrolled && !hasReviewed ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-none bg-slate-900 text-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] rounded-[3rem] overflow-hidden sticky top-32">
                <div className="p-10 lg:p-12 space-y-12 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2" />

                  <div className="space-y-2 relative z-10">
                    <h4 className="text-2xl font-black tracking-tight">
                      {getCourseStrings("Rate your experience", lang)}
                    </h4>
                    <p className="text-slate-400 font-medium text-sm leading-relaxed">
                      {getCourseStrings("Your feedback helps instructors improve and helps other students make the right choice.", lang)}
                    </p>
                  </div>

                  <div className="space-y-6 relative z-10">
                    <div className="flex justify-between items-center">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                        {getCourseStrings("Overall Rating", lang)}
                      </Label>
                      <span className="text-2xl font-black text-amber-500">{rating}.0</span>
                    </div>
                    <div className="flex justify-between bg-white/5 p-6 rounded-[2rem] border border-white/5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(s)}
                          className="group relative transition-all active:scale-75"
                        >
                          <Star
                            className={cn(
                              "h-10 w-10 transition-all duration-300",
                              (hoverRating || rating) >= s
                                ? "text-amber-500 fill-current drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                : "text-white/10",
                            )}
                          />
                          {rating === s && (
                            <motion.div
                              layoutId="active-star"
                              className="absolute -inset-2 bg-amber-500/10 rounded-full -z-10 blur-md"
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      {getCourseStrings("Write your review", lang)}
                    </Label>
                    <Textarea
                      placeholder={
                        getCourseStrings("What did you think of the course quality, instructor, and content?", lang)
                      }
                      className="min-h-[180px] rounded-[2rem] border-white/10 bg-white/5 text-white placeholder:text-white/20 resize-none text-base p-8 focus-visible:ring-amber-500/20 focus-visible:border-amber-500/50 transition-all"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>

                  <Button
                    className="w-full h-18 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100"
                    onClick={() => reviewMutation.mutate()}
                    disabled={reviewMutation.isPending || !userId || !comment.trim()}
                  >
                    {reviewMutation.isPending ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : getCourseStrings("Publish Review", lang)}
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : hasReviewed ? (
            <div className="p-12 rounded-[3rem] bg-emerald-50 border border-emerald-100 text-center space-y-8 shadow-sm">
              <div className="h-24 w-24 rounded-[2rem] bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <div className="space-y-3">
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  {getCourseStrings("Review Published!", lang)}
                </p>
                <p className="text-slate-500 font-medium leading-relaxed">
                  {getCourseStrings("Your feedback is now live. Thank you for helping the community grow.", lang)}
                </p>
              </div>
            </div>
          ) : !isEnrolled ? (
            <div className="p-12 rounded-[3rem] bg-slate-50 border border-slate-100 text-center space-y-8">
              <div className="h-24 w-24 rounded-[2rem] bg-white border border-slate-100 text-slate-200 flex items-center justify-center mx-auto shadow-sm">
                <BrainCircuit className="h-12 w-12 opacity-20" />
              </div>
              <div className="space-y-3">
                <p className="text-xl font-black text-slate-900">
                  {getCourseStrings("Enrolled Students Only", lang)}
                </p>
                <p className="text-sm text-slate-400 font-medium leading-relaxed px-4">
                  {getCourseStrings("Experience the curriculum to unlock the ability to share your feedback.", lang)}
                </p>
              </div>
              <Button
                asChild
                className="h-14 px-10 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
              >
                <Link
                  to={userId ? "/checkout/$courseId" : "/login"}
                  params={userId ? { courseId } : undefined}
                >
                  {getCourseStrings("Enroll & Review", lang)}
                </Link>
              </Button>
            </div>
          ) : null}
        </div>

        {/* REVIEWS LIST */}
        <div className="lg:col-span-7 space-y-10">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-40 space-y-6">
              <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                {getCourseStrings("Syncing Feedback...", lang)}
              </p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="py-40 text-center border-2 border-dashed border-slate-100 rounded-[3rem] bg-slate-50/20 flex flex-col items-center gap-8">
              <div className="h-24 w-24 rounded-[2.5rem] bg-white flex items-center justify-center text-slate-100 shadow-sm">
                <Sparkles className="h-12 w-12" />
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-black text-slate-900 tracking-tight">
                  {getCourseStrings("No feedback yet", lang)}
                </p>
                <p className="text-slate-400 font-medium">
                  {getCourseStrings("Be the pioneer and start the conversation.", lang)}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              {reviews.map((r, idx) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <div className="group relative">
                    <div className="absolute -inset-4 rounded-[3.5rem] bg-slate-50 opacity-0 group-hover:opacity-100 transition-all duration-500 -z-10" />
                    <div className="p-2 space-y-8">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-5">
                          <div className="h-16 w-16 rounded-[1.5rem] bg-white border border-slate-100 flex items-center justify-center text-slate-900 font-black text-xl shadow-sm">
                            {r.user?.name?.[0] || "A"}
                          </div>
                          <div className="space-y-1">
                            <p className="font-black text-slate-900 text-lg leading-none">
                              {r.user?.name ||
                                (getCourseStrings("Anonymous Student", lang))}
                            </p>
                            <div className="flex items-center gap-3">
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className={cn(
                                      "h-3 w-3",
                                      r.rating >= s
                                        ? "text-amber-500 fill-current"
                                        : "text-slate-200",
                                    )}
                                  />
                                ))}
                              </div>
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                {r.createdAt
                                  ? new Date(r.createdAt).toLocaleDateString(undefined, {
                                      dateStyle: "long",
                                    })
                                  : getCourseStrings("Recently", lang)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-3 py-1.5 font-black text-[9px] uppercase tracking-widest rounded-lg">
                          {getCourseStrings("Verified", lang)}
                        </Badge>
                      </div>

                      <div className="relative">
                        <p className="text-slate-600 font-medium text-lg leading-relaxed italic">
                          "{r.comment}"
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ReportCourseDialog({
  courseId,
  userId,
}: {
  courseId: string;
  userId: string | undefined;
}) {
  const { lang } = useI18n();
  const [reason, setReason] = useState("Inappropriate content");
  const [description, setDescription] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const reportMutation = useMutation({
    mutationFn: () =>
      submitReport({
        course_id: courseId,
        reporter_id: userId!,
        reason,
        description,
        status: "pending",
      }),
    onSuccess: () => {
      toast.success(
        getCourseStrings("Thank you. Our moderation team will review this course.", lang),
      );
      setIsOpen(false);
      setDescription("");
    },
    onError: (err: any) => {
      toast.error(
        err.message || (getCourseStrings("Failed to submit report", lang)),
      );
    },
  });

  if (!userId) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-16 w-16 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-rose-500 transition-all shadow-sm group"
          title={getCourseStrings("Report Course", lang)}
        >
          <Flag className="h-5 w-5 group-hover:fill-rose-500/10" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white rounded-[2.5rem] border-slate-200 p-0 shadow-2xl text-slate-900 font-sans overflow-hidden">
        <div className="max-h-[85vh] overflow-y-auto p-8 custom-scrollbar">
          <DialogHeader className="space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 border border-rose-500/10">
              <Flag className="h-6 w-6" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">
              {getCourseStrings("Report Course", lang)}
            </DialogTitle>
            <DialogDescription className="text-base font-medium text-slate-500">
              {getCourseStrings("Help us keep LearnLab safe. Why are you reporting this course?", lang)}
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {getCourseStrings("Violation Reason", lang)}
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  "Inappropriate content",
                  "Copyright Violation",
                  "Spam or Misleading",
                  "Harassment",
                  "Other",
                ].map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border text-sm font-bold transition-all",
                      reason === r
                        ? "bg-rose-50 border-rose-200 text-rose-700"
                        : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    {getCourseStrings(r, lang)}
                    {reason === r && <CheckCircle2 className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {getCourseStrings("Additional Context", lang)}
              </Label>
              <Textarea
                placeholder={
                  getCourseStrings("Provide specific details about the violation...", lang)
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-rose-500/20"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 flex gap-3">
            <Button
              variant="ghost"
              className="rounded-xl h-12 flex-1 font-bold"
              onClick={() => setIsOpen(false)}
            >
              {getCourseStrings("Cancel", lang)}
            </Button>
            <Button
              className="rounded-xl h-12 flex-1 font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-200/50"
              onClick={() => reportMutation.mutate()}
              disabled={reportMutation.isPending}
            >
              {reportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : getCourseStrings("Submit Report", lang)}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- HELPERS: Media Validation ---
const validateMedia = async (file: File, type: "video" | "img"): Promise<boolean> => {
  try {
    const buffer = await file.slice(0, 4).arrayBuffer();
    const header = new Uint8Array(buffer);
    const hex = Array.from(header)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();

    if (hex === "25504446") {
      console.warn("Security Alert: PDF file disguised as media detected.");
      return false;
    }
  } catch (e) {
    console.error("Magic number check failed:", e);
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const media = document.createElement(type);
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve(false);
    }, 5000);
    const cleanup = (result: boolean) => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(result);
    };
    if (type === "img") {
      (media as HTMLImageElement).onload = () => cleanup(true);
    } else {
      (media as HTMLVideoElement).onloadedmetadata = () => cleanup(true);
      (media as HTMLVideoElement).oncanplay = () => cleanup(true);
      (media as HTMLVideoElement).load();
    }
    media.onerror = () => cleanup(false);
    media.src = url;
  });
};

const isVideoUrl = (urlString: string) => {
  try {
    const url = new URL(urlString);
    const path = url.pathname.toLowerCase();
    const isDirectVideo = /\.(mp4|webm|ogg|mov|m4v)$/i.test(path);
    const isPlatformVideo =
      url.hostname.includes("youtube.com") ||
      url.hostname.includes("youtu.be") ||
      url.hostname.includes("vimeo.com") ||
      url.hostname.includes("cloudinary.com") ||
      (url.hostname.includes("supabase.co") && path.includes("video"));
    return isDirectVideo || isPlatformVideo;
  } catch (e) {
    return false;
  }
};

const isValidUrl = (urlString: string) => {
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
};

const isImageUrl = (urlString: string) => {
  if (!isValidUrl(urlString)) return false;
  const url = new URL(urlString);
  return (
    /\.(jpeg|jpg|gif|png|webp|svg|bmp)/i.test(url.pathname) ||
    urlString.includes("pollinations.ai") ||
    urlString.includes("unsplash.com") ||
    urlString.includes("brave.com") ||
    urlString.includes("cloudinary.com") ||
    urlString.includes("fiverr") ||
    urlString.includes("google")
  );
};

function CourseDetail() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const { lang, t } = useI18n();

  const { data: course, isLoading: isLoadingCourse } = useQuery({
    queryKey: ["courses", courseId],
    queryFn: () => fetchCourseById(courseId),
  });
  const { data: modules = [] } = useQuery({
    queryKey: ["modules", courseId],
    queryFn: () => fetchModulesByCourse(courseId),
  });
  const { data: lessons = [] } = useQuery({
    queryKey: ["lessons", courseId],
    queryFn: () => fetchCurriculumByCourse(courseId),
  });
  const { data: isEnrolledFromDb } = useQuery({
    queryKey: ["enrollment", user?.id, courseId],
    queryFn: () => checkEnrollment(user!.id, courseId),
    enabled: !!user?.id,
  });

  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonVideo, setNewLessonVideo] = useState("");
  const [newLessonAttachment, setNewLessonAttachment] = useState("");
  const [newLessonBody, setNewLessonBody] = useState("");
  const [newLessonIsPreview, setNewLessonIsPreview] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [attachmentProgress, setAttachmentProgress] = useState(0);

  const simulateProgress = (setter: React.Dispatch<React.SetStateAction<number>>) => {
    setter(5);
    const interval = setInterval(() => {
      setter((prev: number) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 400);
    return interval;
  };
  const [isGeneratingAttachment, setIsGeneratingAttachment] = useState(false);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);

  const generateCourseMetadataMutation = useMutation({
    mutationFn: async (topic: string) => {
      setIsGeneratingMetadata(true);
      try {
        const result = await (generateCourseMetadata as any)({ data: { topic, userId: user?.id } });
        setEditedCourseTitle(result.title);
        setEditedCourseDescription(result.description);
        setEditedCourseCategory(result.category);
        toast.success("Course metadata generated!");
      } catch (err: any) {
        toast.error(err.message || "Metadata generation failed");
      } finally {
        setIsGeneratingMetadata(false);
      }
    },
  });

  const generateResourceMutation = useMutation({
    mutationFn: async ({
      title,
      content,
      isEditing,
    }: {
      title: string;
      content: string;
      isEditing: boolean;
    }) => {
      setIsGeneratingAttachment(true);
      try {
        // Provide more context to AI by including course title and existing body
        const aiContext = `${course?.title || ""}. ${content || ""}`.trim();

        const markdown = await (generateLessonResource as any)({
          data: { title, content: aiContext, userId: user?.id },
        });

        if (!markdown || markdown.trim().length < 50) {
          throw new Error(
            "AI returned insufficient content. Please try again with more lesson details.",
          );
        }

        // Create a File from the Markdown string
        const blob = new Blob([markdown], { type: "text/markdown" });
        const file = new File([blob], `${title.replace(/\s+/g, "_")}_resource.md`, {
          type: "text/markdown",
        });

        const publicUrl = await uploadLessonResource(courseId, file);

        // Extract the filename/path from the publicUrl to create our internal link
        const urlParts = publicUrl.split("/");
        const fileName = urlParts[urlParts.length - 1];
        const internalViewerUrl = `${window.location.origin}/verify/${courseId}/${fileName}`;

        if (isEditing) {
          setEditingLessonAttachment(internalViewerUrl);
        } else {
          setNewLessonAttachment(internalViewerUrl);
        }
        toast.success("AI Resource generated and uploaded!");
      } catch (err: any) {
        console.error("AI Resource Gen Error:", err);
        toast.error(err.message || "Resource generation failed");
      } finally {
        setIsGeneratingAttachment(false);
      }
    },
  });
  const [videoUploadType, setVideoUploadType] = useState<"link" | "file">("link");
  const [attachmentUploadType, setAttachmentUploadType] = useState<"link" | "file">("link");

  const handleAttachmentUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isEditing = false,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingAttachment(true);
    const interval = simulateProgress(setAttachmentProgress);
    try {
      const publicUrl = await uploadLessonResource(courseId, file);

      if (isEditing) {
        setEditingLessonAttachment(publicUrl);
      } else {
        setNewLessonAttachment(publicUrl);
      }
      setAttachmentProgress(100);
      toast.success("Resource uploaded successfully");
    } catch (err: any) {
      console.error("Attachment Upload Error:", err);
      toast.error(err.message || "Upload failed");
    } finally {
      clearInterval(interval);
      setTimeout(() => setIsUploadingAttachment(false), 500);
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // 1. MIME Type Check
    if (!file.type.startsWith("video/")) {
      toast.error("Invalid file type. Please upload a video (MP4, MOV, WEBM).");
      e.target.value = "";
      return;
    }

    // 2. Real Content Validation
    const isRealVideo = await validateMedia(file, "video");
    if (!isRealVideo) {
      toast.error("Security alert: File content is not a valid video. Upload rejected.");
      e.target.value = "";
      return;
    }

    setIsUploadingVideo(true);
    const interval = simulateProgress(setVideoProgress);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const path = `${courseId}/${fileName}`;

      const { signedUrl } = await import("@/lib/storage").then((m) =>
        m.getSignedUploadUrl("course-videos", path),
      );

      const response = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!response.ok) throw new Error("Upload failed");

      const {
        data: { publicUrl },
      } = supabase.storage.from("course-videos").getPublicUrl(path);
      setNewLessonVideo(publicUrl);
      setVideoProgress(100);
      toast.success("Video uploaded successfully via Presigned URL");
    } catch (err) {
      console.error(err);
      toast.error("Video upload failed");
    } finally {
      clearInterval(interval);
      setTimeout(() => setIsUploadingVideo(false), 500);
    }
  };

  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [editedCourseTitle, setEditedCourseTitle] = useState("");
  const [editedCourseDescription, setEditedCourseDescription] = useState("");
  const [editedCoursePrice, setEditedCoursePrice] = useState(0);
  const [editedCourseCategory, setEditedCourseCategory] = useState("");
  const [editedCourseLevel, setEditedCourseLevel] = useState("");
  const [editedCourseImageUrl, setEditedCourseImageUrl] = useState("");
  const [editedCoursePromoVideo, setEditedCoursePromoVideo] = useState("");
  const [isUploadingCourseImage, setIsUploadingCourseImage] = useState(false);
  const [courseImageUploadType, setCourseImageUploadType] = useState<"link" | "file">("link");
  const [isUploadingPromoVideo, setIsUploadingPromoVideo] = useState(false);
  const [promoVideoUploadType, setPromoVideoUploadType] = useState<"link" | "file">("link");

  const handlePromoVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // 1. MIME Type Check
    if (!file.type.startsWith("video/")) {
      toast.error("Invalid file type. Please upload a video (MP4, MOV, WEBM).");
      e.target.value = ""; // Clear the input
      return;
    }

    // 2. Real Content Validation
    const isRealVideo = await validateMedia(file, "video");
    if (!isRealVideo) {
      toast.error("Security alert: File content is not a valid video. Upload rejected.");
      e.target.value = ""; // Clear the input
      return;
    }

    setIsUploadingPromoVideo(true);
    try {
      const publicUrl = await uploadCoursePromoVideo(courseId, file);
      setEditedCoursePromoVideo(publicUrl);
      toast.success("Promo video uploaded successfully");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setIsUploadingPromoVideo(false);
    }
  };

  const handleCourseImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // 1. MIME Type Check
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file type. Please upload an image (JPG, PNG, WEBP).");
      e.target.value = ""; // Clear the input
      return;
    }

    // 2. Real Content Validation
    const isRealImage = await validateMedia(file, "img");
    if (!isRealImage) {
      toast.error("Security alert: File content is not a valid image. Upload rejected.");
      e.target.value = ""; // Clear the input
      return;
    }

    setIsUploadingCourseImage(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `courses/${user.id}-${Date.now()}.${fileExt}`;
      const publicUrl = await uploadFile("course-images", filePath, file);
      setEditedCourseImageUrl(publicUrl);
      toast.success("Image uploaded successfully");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setIsUploadingCourseImage(false);
    }
  };

  useEffect(() => {
    if (course) {
      setEditedCourseTitle(course.title);
      setEditedCourseDescription(course.description);
      setEditedCoursePrice(course.price);
      setEditedCourseCategory(course.category || "");
      setEditedCourseLevel(course.level || "Beginner");
      setEditedCourseImageUrl(course.imageUrl || "");
      setEditedCoursePromoVideo(course.promoVideoUrl || "");
    }
  }, [course]);

  const moveModule = (index: number, direction: "up" | "down") => {
    const newModules = [...modules];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newModules.length) return;

    [newModules[index], newModules[targetIndex]] = [newModules[targetIndex], newModules[index]];

    const updates = newModules.map((m, i) => ({ id: m.id, order_index: i + 1 }));
    reorderModulesMutation.mutate(updates);
  };

  const moveLesson = (lessonList: any[], index: number, direction: "up" | "down") => {
    const newLessons = [...lessonList];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newLessons.length) return;

    [newLessons[index], newLessons[targetIndex]] = [newLessons[targetIndex], newLessons[index]];

    const updates = newLessons.map((l, i) => ({ id: l.id, order_index: i + 1 }));
    reorderLessonsMutation.mutate(updates);
  };

  const isCreatorActual = user?.id === course?.creatorId || profile?.role === "admin";
  const isCreator = isCreatorActual && !isPreviewMode;
  const isEnrolledActual = !!isEnrolledFromDb;
  const isEnrolled = isEnrolledActual || (isCreatorActual && isPreviewMode);
  const canAccessContent = isCreatorActual || isEnrolledActual;

  const updateCourseMutation = useMutation({
    mutationFn: async (updates: any) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return (updateCourse as any)({
        data: {
          id: courseId,
          updates,
          token: session?.access_token,
          userId: user?.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses", courseId] });
      toast.success("Course updated successfully");
      setIsEditingCourse(false);
    },
    onError: (error: any) => {
      toast.error("Failed to update course: " + error.message);
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return (deleteCourse as any)({
        data: {
          id: courseId,
          token: session?.access_token,
          userId: user?.id,
        },
      });
    },
    onSuccess: () => {
      toast.success("Course deleted");
      navigate({ to: "/dashboard" });
    },
    onError: (err: any) => {
      toast.error("Failed to delete course: " + err.message);
    },
  });

  const reorderModulesMutation = useMutation({
    mutationFn: async (newOrder: { id: string; order_index: number }[]) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return (reorderModules as any)({
        data: {
          modules: newOrder,
          token: session?.access_token,
          userId: user?.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules", courseId] });
      toast.success("Sections reordered");
    },
  });

  const reorderLessonsMutation = useMutation({
    mutationFn: async (newOrder: { id: string; order_index: number }[]) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return (reorderLessons as any)({
        data: {
          lessons: newOrder,
          token: session?.access_token,
          userId: user?.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
      toast.success("Lessons reordered");
    },
  });

  const moduleMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return (createModule as any)({
        data: {
          data: { course_id: courseId, title: newModuleTitle, order_index: modules.length + 1 },
          token: session?.access_token,
          userId: user?.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules", courseId] });
      toast.success("Section added");
      setIsAddingModule(false);
      setNewModuleTitle("");
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return (deleteModule as any)({
        data: {
          id,
          token: session?.access_token,
          userId: user?.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules", courseId] });
      toast.success("Section deleted");
    },
  });

  const [isEditingLesson, setIsEditingLesson] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingLessonTitle, setEditingLessonTitle] = useState("");
  const [editingLessonVideo, setEditingLessonVideo] = useState("");
  const [editingLessonAttachment, setEditingLessonAttachment] = useState("");
  const [editingLessonBody, setEditingLessonBody] = useState("");
  const [editingLessonIsPreview, setEditingLessonIsPreview] = useState(false);

  const updateLessonMutation = useMutation({
    mutationFn: async (updates: any) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return (updateLesson as any)({
        data: {
          id: editingLessonId!,
          updates,
          token: session?.access_token,
          userId: user?.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
      toast.success("Lesson updated");
      setIsEditingLesson(false);
    },
  });

  const lessonMutation = useMutation({
    mutationFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return (createLesson as any)({
        data: {
          data: {
            course_id: courseId,
            module_id: selectedModuleId || null,
            title: newLessonTitle,
            video_url: newLessonVideo,
            attachment_url: newLessonAttachment,
            content_type: "video",
            body_text: newLessonBody,
            is_preview: newLessonIsPreview,
            order_index: lessons.filter((l: any) => l.moduleId === selectedModuleId).length + 1,
          },
          token: session?.access_token,
          userId: user?.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
      toast.success("Lesson added");
      setIsAddingLesson(false);
      setNewLessonTitle("");
      setNewLessonVideo("");
      setNewLessonAttachment("");
      setNewLessonBody("");
      setNewLessonIsPreview(false);
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (id: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return (deleteLesson as any)({
        data: {
          id,
          token: session?.access_token,
          userId: user?.id,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", courseId] });
      toast.success("Lesson deleted");
    },
  });

  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [isVideoExplicitlySelected, setIsVideoExplicitlySelected] = useState(false);
  const [hitPreviewLimit, setHitPreviewLimit] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);

  const getYouTubeId = (url: string | null) => {
    if (!url) return null;
    const trimmed = url.trim();
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = trimmed.match(regExp);
    if (match && match[2] && match[2].length === 11) return match[2];
    const parts = trimmed.split("/");
    const lastPart = parts[parts.length - 1]?.split(/[?&#]/)[0];
    return (lastPart?.length || 0) === 11 ? lastPart : null;
  };

  const activeVideoId = useMemo(() => getYouTubeId(activeVideoUrl), [activeVideoUrl]);

  const [signedVideoUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSigned() {
      if (!activeVideoUrl || activeVideoId) {
        setSignedUrl(null);
        return;
      }

      const storageInfo = parseStorageUrl(activeVideoUrl);
      if (storageInfo) {
        try {
          const url = await getSignedUrl(storageInfo.bucket, storageInfo.path);
          setSignedUrl(url);
        } catch (e) {
          setSignedUrl(null);
        }
      } else {
        setSignedUrl(activeVideoUrl);
      }
    }
    fetchSigned();
  }, [activeVideoUrl, activeVideoId]);

  useEffect(() => {
    // Priority 1: If user manually clicked a lesson, keep that video
    if (isVideoExplicitlySelected && activeVideoUrl) return;

    // Priority 2: Use Promo Video if available
    if (course?.promoVideoUrl) {
      setActiveVideoUrl(course.promoVideoUrl);
    }
    // Priority 3: Fallback to the first available preview or video (only if no promo)
    else if (lessons.length > 0 && !activeVideoUrl) {
      const firstPreview = lessons.find(
        (l: any) => l.contentType === "video" && l.videoUrl && l.isPreview,
      );
      const firstVideo = lessons.find((l: any) => l.contentType === "video" && l.videoUrl);
      if (firstPreview) setActiveVideoUrl(firstPreview.videoUrl);
      else if (firstVideo) setActiveVideoUrl(firstVideo.videoUrl);
    }
  }, [course?.promoVideoUrl, lessons, isVideoExplicitlySelected, activeVideoUrl]);

  // YouTube API for Course Detail Preview Limit
  useEffect(() => {
    if (!activeVideoId || canAccessContent) return;

    const initYT = () => {
      if (!(window as any).YT || !(window as any).YT.Player) return;

      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {
          // Ignore destruction errors
        }
      }

      ytPlayerRef.current = new (window as any).YT.Player("yt-promo-player", {
        videoId: activeVideoId,
        playerVars: { rel: 0, modestbranding: 1, autoplay: 0 },
        events: {
          onReady: () => {},
        },
      });
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initYT();
    } else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
      (window as any).onYouTubeIframeAPIReady = initYT;
    }

    return () => {
      if (ytPlayerRef.current) {
        try {
          // Check if the iframe is still in the document to avoid removeChild errors
          if (typeof ytPlayerRef.current.getIframe === "function") {
            const iframe = ytPlayerRef.current.getIframe();
            if (iframe && iframe.parentNode) {
              ytPlayerRef.current.destroy();
            }
          }
          ytPlayerRef.current = null;
        } catch (e) {
          console.debug("Failed to destroy YT player:", e);
        }
      }
    };
  }, [activeVideoId, canAccessContent]);

  // Preview Limit Interval for Course Detail
  useEffect(() => {
    if (canAccessContent) {
      setHitPreviewLimit(false);
      return;
    }

    const interval = setInterval(() => {
      let currentTime = 0;
      if (previewVideoRef.current) {
        currentTime = previewVideoRef.current.currentTime;
      } else if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === "function") {
        try {
          currentTime = ytPlayerRef.current.getCurrentTime();
        } catch (e) {
          console.debug("YT player time check failed", e);
        }
      }

      if (currentTime >= 60) {
        setHitPreviewLimit(true);
        if (previewVideoRef.current) {
          previewVideoRef.current.pause();
          previewVideoRef.current.currentTime = 60;
        }
        if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === "function") {
          ytPlayerRef.current.pauseVideo();
          ytPlayerRef.current.seekTo(60, true);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [canAccessContent, activeVideoUrl, lessons]);

  const isValidUrl = (url: string | null) => {
    if (!url) return false;
    const trimmed = url.trim().toLowerCase();
    if (
      trimmed === "" ||
      trimmed === "null" ||
      trimmed === "none" ||
      trimmed === "pending" ||
      trimmed === "undefined" ||
      trimmed === "video_url" ||
      trimmed.includes("placeholder")
    ) {
      return false;
    }
    return trimmed.startsWith("http") || trimmed.startsWith("/") || trimmed.startsWith("blob:");
  };

  if (isLoadingCourse)
    return (
      <SiteLayout>
        <div className="flex h-[80vh] items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
        </div>
      </SiteLayout>
    );

  if (!course)
    return (
      <SiteLayout>
        <div className="flex h-[80vh] flex-col items-center justify-center p-8 bg-background text-center">
          <div className="h-20 w-20 rounded-[2.5rem] bg-slate-50 flex items-center justify-center text-slate-300 mb-8 border border-slate-100">
            <BookOpen className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Course not found</h1>
          <p className="text-slate-500 mt-2 mb-10 max-sm">
            This course might have been set to private or deleted by the instructor.
          </p>
          <Button
            asChild
            className="rounded-2xl h-14 px-10 font-bold bg-primary text-white shadow-xl shadow-primary/20"
          >
            <Link to="/browse">Explore Library</Link>
          </Button>
        </div>
      </SiteLayout>
    );

  const firstLessonId = lessons[0]?.id || "";

  return (
    <SiteLayout>
      <div className="bg-background min-h-screen text-slate-900 font-sans selection:bg-primary/10 selection:text-primary overflow-x-hidden pb-32">
        {isPreviewMode && (
          <div className="bg-slate-900 text-white py-3 px-6 flex items-center justify-between sticky top-0 z-[100] shadow-2xl animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1">
                  {getCourseStrings("Smart Preview Mode", lang)}
                </p>
                <p className="text-xs font-medium text-slate-400">
                  getSmartPreviewText(lang)
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-5 rounded-lg border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs transition-all"
              onClick={() => setIsPreviewMode(false)}
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-2" />{" "}
              {getCourseStrings("Back to Editor", lang)}
            </Button>
          </div>
        )}
        <section className="relative border-b border-slate-100 bg-white overflow-hidden">
          <div className="absolute inset-0 opacity-[0.4] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none" />
          <div className="absolute top-0 right-0 w-[50%] h-full bg-primary/[0.03] blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />

          <div className="mx-auto max-w-7xl px-6 py-12 lg:py-16 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-6 text-left"
              >
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary/5 text-primary border border-primary/10 px-3 py-1 font-black uppercase tracking-widest text-[9px] rounded-lg shadow-none">
                    {course.category ||
                      (getCourseStrings("Professional Track", lang))}
                  </Badge>
                  <Badge
                    className={cn(
                      "border-none px-3 py-1 font-black uppercase tracking-widest text-[9px] rounded-lg shadow-none text-white",
                      course.level === "Beginner"
                        ? "bg-emerald-500"
                        : course.level === "Intermediate"
                          ? "bg-amber-500"
                          : "bg-rose-500",
                    )}
                  >
                    getCourseStrings(course.level || "Beginner", lang)
                  </Badge>
                  {isEnrolled && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-3 py-1 font-black uppercase tracking-widest text-[9px] rounded-lg shadow-none flex items-center gap-1.5 animate-in fade-in zoom-in duration-500">
                      <CheckCircle2 className="h-3 w-3" /> {t("alreadyEnrolled")}
                    </Badge>
                  )}
                  <div className="h-1 w-1 rounded-full bg-slate-200" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {getCourseStrings("Premium Content", lang)}
                  </span>
                </div>

                <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter text-slate-900 leading-[1.05]">
                  {course.title}
                </h1>

                <p className="text-slate-500 text-lg leading-relaxed max-w-xl font-medium">
                  {course.description}
                </p>

                <div className="flex flex-wrap items-center gap-8 py-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {getCourseStrings("Total Learners", lang)}
                    </span>
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                      <Users className="h-4 w-4 text-primary" />{" "}
                      {(course.students || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {getCourseStrings("Avg. Rating", lang)}
                    </span>
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                      <Star className="h-4 w-4 text-amber-500 fill-current" />{" "}
                      {course.rating && course.rating > 0 ? course.rating.toFixed(1) : "NEW"}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                      {getCourseStrings("Curriculum", lang)}
                    </span>
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                      <Clock className="h-4 w-4 text-primary" /> {lessons.length}{" "}
                      {getCourseStrings("Lessons", lang)}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <Button
                    asChild
                    size="lg"
                    className={cn(
                      "rounded-2xl h-16 px-10 font-black text-base shadow-2xl group transition-all hover:scale-[1.02] active:scale-95",
                      isEnrolled || isCreatorActual
                        ? "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
                        : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10",
                    )}
                  >
                    <Link
                      to={
                        isEnrolled || isCreatorActual
                          ? "/courses/$courseId/learn"
                          : user
                            ? "/checkout/$courseId"
                            : "/login"
                      }
                      params={
                        isEnrolled || isCreatorActual
                          ? { courseId }
                          : user
                            ? { courseId }
                            : undefined
                      }
                      search={isEnrolled || isCreatorActual ? { lessonId: undefined } : undefined}
                    >
                      {isEnrolled || isCreatorActual ? t("continueLearning") : t("enrollNow")}{" "}
                      <ChevronRight className="h-5 v-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                  <ReportCourseDialog courseId={courseId} userId={user?.id} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <div className="aspect-video rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] bg-slate-950 group relative">
                  {activeVideoId ? (
                    canAccessContent ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${activeVideoId}?rel=0&modestbranding=1&autoplay=0`}
                        className="absolute inset-0 w-full h-full border-0"
                        allowFullScreen
                      />
                    ) : (
                      <div id="yt-promo-player" className="absolute inset-0 w-full h-full" />
                    )
                  ) : isValidUrl(signedVideoUrl) ? (
                    <video
                      ref={previewVideoRef}
                      src={signedVideoUrl!}
                      controls
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-center px-8">
                      <div className="relative mb-4">
                        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                        <div className="relative h-16 w-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-primary shadow-2xl">
                          <BrainCircuit className="h-8 w-8 animate-pulse" />
                        </div>
                      </div>
                      <h3 className="text-white font-black text-sm tracking-tight mb-1">
                        วิดีโอกำลังอยู่ระหว่างการจัดเตรียม
                      </h3>
                      <p className="text-slate-400 text-[9px] font-medium max-w-xs leading-relaxed uppercase tracking-widest">
                        {getCourseStrings("Promo Video is being prepared by AI.", lang)}
                      </p>
                      <div className="mt-4 flex items-center gap-2">
                        <div className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                        <div className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                        <div className="h-1 w-1 rounded-full bg-primary animate-bounce" />
                      </div>
                    </div>
                  )}

                  {/* PREVIEW LIMIT OVERLAY */}
                  <AnimatePresence>
                    {hitPreviewLimit && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-8"
                      >
                        <div className="h-16 w-16 rounded-2xl bg-primary/20 border border-primary/20 flex items-center justify-center text-primary mb-6 shadow-[0_0_50px_rgba(var(--primary),0.3)]">
                          <Play className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-black text-white tracking-tight mb-2">
                          {getCourseStrings("Preview Limit Reached", lang)}
                        </h3>
                        <p className="text-slate-400 text-[10px] font-medium max-w-[200px] leading-relaxed mb-6 uppercase tracking-widest">
                          {getCourseStrings("Enroll now to unlock the full lesson content.", lang)}
                        </p>
                        <Button
                          asChild
                          className="rounded-xl h-12 px-8 bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-primary/20"
                        >
                          <Link
                            to={user ? "/checkout/$courseId" : "/login"}
                            params={user ? { courseId } : undefined}
                          >
                            {getCourseStrings("Unlock Full Access", lang)}
                          </Link>
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/10 rounded-[2.5rem]" />
                </div>
                <div className="absolute -bottom-6 -left-6 p-5 rounded-2xl bg-white border border-slate-100 shadow-2xl shadow-slate-200/50">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {getCourseStrings("Verified Path", lang)}
                      </p>
                      <p className="text-sm font-bold text-slate-900 leading-none mt-1">
                        {getCourseStrings("Official Certificate", lang)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-24 space-y-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            <div className="lg:col-span-8 space-y-20">
              {isCreator && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-primary/10 bg-primary/[0.01] shadow-none rounded-[2rem] overflow-hidden">
                    <CardContent className="p-8">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
                        <div className="flex items-center gap-6 text-left">
                          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-sm">
                            <Settings className="h-6 w-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 text-lg">Course Management</h3>
                            <p className="text-slate-500 text-sm font-medium">
                              Add modules, assessments, and lessons.
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                          {/* Group 1: Manage & Preview */}
                          <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-2xl border border-slate-100">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-xl font-bold h-10 px-4 hover:bg-white hover:text-primary transition-all text-slate-600"
                              onClick={() => setIsPreviewMode(true)}
                            >
                              <Eye className="h-4 w-4 mr-2" /> Preview
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-xl font-bold h-10 px-4 hover:bg-white hover:text-primary transition-all text-slate-600"
                              onClick={() => setIsEditingCourse(true)}
                            >
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </Button>
                          </div>

                          <div className="h-8 w-px bg-slate-200 hidden xl:block" />

                          {/* Group 2: Status Toggle */}
                          <div className="flex items-center gap-2">
                            {course.status?.toLowerCase() === "draft" ? (
                              <Button
                                size="sm"
                                disabled={updateCourseMutation.isPending}
                                className="rounded-xl font-bold h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                                onClick={() => {
                                  if (lessons.length === 0) {
                                    toast.error("ไม่สามารถเปิดขายได้เนื่องจากยังไม่มีบทเรียน");
                                    return;
                                  }
                                  updateCourseMutation.mutate({ status: "published" });
                                }}
                              >
                                {updateCourseMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                )}
                                Publish Course
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={updateCourseMutation.isPending}
                                className="rounded-xl font-bold h-11 px-6 border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shadow-sm"
                                onClick={() => {
                                  updateCourseMutation.mutate({ status: "draft" });
                                }}
                              >
                                {updateCourseMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4 mr-2" />
                                )}
                                Revert to Draft
                              </Button>
                            )}
                          </div>

                          <div className="h-8 w-px bg-slate-200 hidden xl:block" />

                          {/* Group 3: Creative Actions */}
                          <div className="flex items-center gap-2 ml-auto lg:ml-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl font-bold h-11 px-5 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm"
                              onClick={() => setIsAddingModule(true)}
                            >
                              <Plus className="h-4 w-4 mr-2" /> Section
                            </Button>
                            <Button
                              size="sm"
                              className="rounded-xl font-bold h-11 px-6 bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
                              onClick={() => setIsAddingLesson(true)}
                            >
                              <Plus className="h-4 w-4 mr-2" /> New Lesson
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <section className="space-y-10">
                <div className="flex items-center justify-between border-b border-slate-100 pb-8">
                  <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                    {getCourseStrings("Course Curriculum", lang)}
                  </h2>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
                    {lessons.length} {getCourseStrings("Total Lessons", lang)}
                  </span>
                </div>

                <div className="space-y-6">
                  {modules.map((module, mIdx) => {
                    const moduleLessons = lessons.filter((l: any) => l.moduleId === module.id);
                    return (
                      <Accordion key={module.id} type="single" collapsible className="w-full">
                        <AccordionItem
                          value={module.id}
                          className="border-slate-200 bg-white rounded-[2rem] mb-6 overflow-hidden shadow-sm hover:shadow-md transition-all"
                        >
                          <AccordionTrigger className="hover:no-underline py-8 px-10 group">
                            <div className="flex items-center gap-8 text-left flex-1">
                              <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-sm font-black text-slate-400 border border-slate-100 group-hover:border-primary/30 transition-colors shrink-0">
                                {mIdx + 1}
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-slate-900 text-xl leading-none mb-2 group-hover:text-primary transition-colors">
                                  {module.title}
                                </h4>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  {moduleLessons.length}{" "}
                                  {getCourseStrings("Lessons Included", lang)}
                                </span>
                              </div>
                            </div>
                            {isCreator && (
                              <div
                                className="flex items-center gap-1 mr-4 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-slate-300 hover:text-primary hover:bg-primary/5"
                                  onClick={() => moveModule(mIdx, "up")}
                                  disabled={mIdx === 0}
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-lg text-slate-300 hover:text-primary hover:bg-primary/5"
                                  onClick={() => moveModule(mIdx, "down")}
                                  disabled={mIdx === modules.length - 1}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 rounded-lg text-slate-300 hover:text-destructive hover:bg-destructive/5"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-white rounded-[2rem] border-slate-200 p-8">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-xl font-bold">
                                        Delete Section?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently remove "{module.title}" and all its
                                        lessons.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="mt-6 gap-2">
                                      <AlertDialogCancel className="rounded-xl h-10 font-bold">
                                        Cancel
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        className="rounded-xl h-10 font-bold bg-destructive text-white hover:bg-destructive/90"
                                        onClick={() => deleteModuleMutation.mutate(module.id)}
                                      >
                                        Delete Section
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            )}
                          </AccordionTrigger>
                          <AccordionContent className="p-0 border-t border-slate-100 bg-slate-50/30">
                            <div className="divide-y divide-slate-100">
                              {moduleLessons.map((lesson: any, lIdx: number) => (
                                <div
                                  key={lesson.id}
                                  onClick={() => {
                                    if (lesson.contentType === "video" && lesson.videoUrl) {
                                      if (lesson.isPreview || isEnrolled || isCreator) {
                                        setActiveVideoUrl(lesson.videoUrl);
                                        setIsVideoExplicitlySelected(true);
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                      } else {
                                        toast.error(
                                          getCourseStrings("Enroll to watch this lesson", lang),
                                        );
                                      }
                                    }
                                  }}
                                  className="flex items-center justify-between p-7 px-10 hover:bg-white transition-all group cursor-pointer text-left"
                                >
                                  <div className="flex items-center gap-6 min-w-0">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 group-hover:text-primary group-hover:border-primary/30 transition-all shadow-sm">
                                      {lesson.contentType === "video" ? (
                                        <PlayCircle className="h-5 w-5" />
                                      ) : (
                                        <FileText className="h-5 w-5" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-[17px] font-bold text-slate-800 group-hover:text-primary transition-colors flex items-center gap-3 leading-tight">
                                        {lesson.title}
                                        {lesson.isPreview && (
                                          <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-md">
                                            {getCourseStrings("Free Preview", lang)}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-1.5">
                                        <div className="h-1 w-1 rounded-full bg-slate-200" />
                                        {lesson.contentType === "video"
                                          ? getCourseStrings("Video Content", lang)
                                          : lesson.contentType === "pdf"
                                            ? "PDF Content"
                                            : lesson.contentType === "quiz"
                                              ? getCourseStrings("Quiz Content", lang)
                                              : lesson.contentType === "text"
                                                ? getCourseStrings("Text Content", lang)
                                                : getCourseStrings("Slide Content", lang)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    {isCreator && (
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-lg text-slate-300 hover:text-primary hover:bg-primary/5"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            moveLesson(moduleLessons, lIdx, "up");
                                          }}
                                          disabled={lIdx === 0}
                                        >
                                          <ChevronUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-lg text-slate-300 hover:text-primary hover:bg-primary/5"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            moveLesson(moduleLessons, lIdx, "down");
                                          }}
                                          disabled={lIdx === moduleLessons.length - 1}
                                        >
                                          <ChevronDown className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-10 w-10 rounded-xl text-slate-300 hover:text-primary hover:bg-primary/5"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingLessonId(lesson.id);
                                            setEditingLessonTitle(lesson.title);
                                            setEditingLessonVideo(lesson.videoUrl || "");
                                            setEditingLessonAttachment(lesson.attachmentUrl || "");
                                            setEditingLessonBody(lesson.bodyText || "");
                                            setEditingLessonIsPreview(lesson.isPreview);
                                            setIsEditingLesson(true);
                                          }}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-10 w-10 rounded-xl text-slate-300 hover:text-destructive hover:bg-destructive/5"
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent className="bg-white rounded-[2rem] border-slate-200 p-8">
                                            <AlertDialogHeader>
                                              <AlertDialogTitle className="text-xl font-bold">
                                                Delete Lesson?
                                              </AlertDialogTitle>
                                              <AlertDialogDescription>
                                                Are you sure you want to delete "{lesson.title}"?
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="mt-6 gap-2">
                                              <AlertDialogCancel className="rounded-xl h-10 font-bold">
                                                Cancel
                                              </AlertDialogCancel>
                                              <AlertDialogAction
                                                className="rounded-xl h-10 font-bold bg-destructive text-white hover:bg-destructive/90"
                                                onClick={() =>
                                                  deleteLessonMutation.mutate(lesson.id)
                                                }
                                              >
                                                Delete Lesson
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                        <Dialog>
                                          <DialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-10 px-5 font-bold text-[10px] uppercase tracking-widest text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                            >
                                              Assessment
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent className="max-w-3xl bg-white border-slate-200 text-slate-900 rounded-[2.5rem] p-10 shadow-2xl">
                                            <QuizEditor
                                              lessonId={lesson.id}
                                              courseTopic={course.title}
                                              objective={lesson.title}
                                            />
                                          </DialogContent>
                                        </Dialog>
                                      </div>
                                    )}
                                    <Link
                                      to="/courses/$courseId/lessons/$lessonId"
                                      params={{ courseId, lessonId: lesson.id }}
                                      className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-primary hover:bg-primary/5 transition-all"
                                    >
                                      <ChevronRight className="h-5 w-5" />
                                    </Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="lg:col-span-4">
              <div className="sticky top-28 space-y-8">
                <Card className="border-slate-200 bg-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] rounded-[2.5rem] overflow-hidden relative group">
                  <div className="absolute inset-x-0 top-0 h-2.5 bg-gradient-to-r from-primary to-indigo-400" />
                  <CardContent className="p-10 space-y-10 relative">
                    {canAccessContent ? (
                      <div className="space-y-8">
                        <div className="flex items-center gap-5">
                          <div className="h-14 w-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
                            <CheckCircle2 className="h-7 w-7" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 leading-none">
                              {getCourseStrings("Access Granted", lang)}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-2">
                              {getCourseStrings("Lifetime access is active.", lang)}
                            </p>
                          </div>
                        </div>
                        <Button
                          asChild
                          className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-base shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
                        >
                          <Link
                            to="/courses/$courseId/learn"
                            params={{ courseId }}
                            search={{ lessonId: firstLessonId }}
                          >
                            {t("continueLearning")}
                          </Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-10">
                        <div className="space-y-3">
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            {getCourseStrings("One-time Payment", lang)}
                          </p>
                          <div className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                              <span className="text-6xl font-bold text-slate-900 tracking-tighter">
                                ${getCourseEffectivePrice(course)}
                              </span>
                              <span className="text-sm font-bold text-slate-400 uppercase">
                                USD
                              </span>
                            </div>
                            {(isSaleActive(course) || course.isCampaignActive) && (
                              <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-2">
                                {isSaleActive(course)
                                  ? getFlashSaleText(course.price, lang)
                                  : getPartnerDealText(course.price, lang)}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          asChild
                          className="w-full h-18 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xl shadow-2xl shadow-slate-900/10 transition-all hover:scale-[1.02] active:scale-95"
                        >
                          <Link
                            to={user ? "/checkout/$courseId" : "/login"}
                            params={user ? { courseId } : undefined}
                          >
                            {t("enrollNow")}
                          </Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <ReviewSection courseId={courseId} userId={user?.id} isEnrolled={!!isEnrolled} />
        </div>

        <Dialog open={isAddingModule} onOpenChange={setIsAddingModule}>
          <DialogContent className="max-w-md bg-white border-slate-200 text-slate-900 rounded-[2.5rem] p-10 shadow-2xl">
            <DialogHeader className="mb-10 text-left">
              <DialogTitle className="text-3xl font-black leading-tight">
                Create Section
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-8 text-left">
              <div className="space-y-3">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Section Title
                </Label>
                <Input
                  placeholder="e.g. Fundamental Logic"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  className="h-14 bg-slate-50 border-slate-200 rounded-2xl focus-visible:ring-primary/50 text-base"
                />
              </div>
              <Button
                className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl shadow-primary/20"
                onClick={() => moduleMutation.mutate()}
                disabled={moduleMutation.isPending || !newModuleTitle}
              >
                Save Section
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddingLesson} onOpenChange={setIsAddingLesson}>
          <DialogContent className="max-w-lg bg-white border-slate-200 text-slate-900 rounded-[2.5rem] p-10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="mb-10 text-left">
              <DialogTitle className="text-3xl font-black tracking-tight leading-none">
                Add New Lesson
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-8 text-left">
              <div className="space-y-3">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Parent Module
                </Label>
                <select
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 h-14 text-base font-medium outline-none focus:ring-2 focus:ring-primary/20"
                  value={selectedModuleId || ""}
                  onChange={(e) => setSelectedModuleId(e.target.value || null)}
                >
                  <option value="">General Track</option>
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Lesson Title
                </Label>
                <Input
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  className="h-14 bg-slate-50 border-slate-200 rounded-2xl focus-visible:ring-primary/50 text-base"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Video Content
                  </Label>
                  <div className="flex items-center gap-2 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setVideoUploadType("link")}
                      className={cn(
                        "px-2 py-1 rounded-md transition-colors font-bold",
                        videoUploadType === "link"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-secondary",
                      )}
                    >
                      Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoUploadType("file")}
                      className={cn(
                        "px-2 py-1 rounded-md transition-colors font-bold",
                        videoUploadType === "file"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-secondary",
                      )}
                    >
                      File
                    </button>
                  </div>
                </div>
                {videoUploadType === "link" ? (
                  <Input
                    value={newLessonVideo}
                    onChange={(e) => setNewLessonVideo(e.target.value)}
                    className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-mono text-sm"
                    placeholder="https://youtube.com/..."
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoFileUpload}
                        disabled={isUploadingVideo}
                        className="h-14 bg-slate-50 border-slate-200 rounded-2xl file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      />
                      {isUploadingVideo && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                    </div>
                    {isUploadingVideo && (
                      <div className="space-y-1 mt-1">
                        <Progress value={videoProgress} className="h-1.5" />
                        <p className="text-[9px] font-black uppercase text-primary animate-pulse">
                          Uploading Video Content... {videoProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {newLessonVideo && videoUploadType === "file" && (
                  <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                    <CheckCircle2 className="h-3 w-3" /> Video ready to save
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Learning Resource (PDF, GitHub, Slides)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 rounded-lg border-indigo-200 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-100 font-bold text-[9px] uppercase tracking-widest gap-1.5"
                      onClick={() => {
                        const isEdit = !!editingLessonId;
                        generateResourceMutation.mutate({
                          title: isEdit ? editingLessonTitle : newLessonTitle,
                          content: isEdit ? editingLessonBody : newLessonBody,
                          isEditing: isEdit,
                        });
                      }}
                      disabled={
                        isGeneratingAttachment ||
                        (editingLessonId
                          ? !editingLessonTitle || !editingLessonBody || !editingLessonVideo
                          : !newLessonTitle || !newLessonBody || !newLessonVideo)
                      }
                    >
                      {isGeneratingAttachment ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Generate with AI
                    </Button>
                    <div className="h-4 w-px bg-slate-200" />
                    <div className="flex items-center gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setAttachmentUploadType("link")}
                        className={cn(
                          "px-2 py-1 rounded-md transition-colors font-bold",
                          attachmentUploadType === "link"
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        Link
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttachmentUploadType("file")}
                        className={cn(
                          "px-2 py-1 rounded-md transition-colors font-bold",
                          attachmentUploadType === "file"
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        File
                      </button>
                    </div>
                  </div>
                </div>
                {attachmentUploadType === "link" ? (
                  <Input
                    value={newLessonAttachment}
                    onChange={(e) => setNewLessonAttachment(e.target.value)}
                    className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-mono text-sm"
                    placeholder="https://github.com/... or PDF link"
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        onChange={(e) => handleAttachmentUpload(e, false)}
                        disabled={isUploadingAttachment}
                        className="h-14 bg-slate-50 border-slate-200 rounded-2xl file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      />
                      {isUploadingAttachment && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                    </div>
                    {isUploadingAttachment && (
                      <div className="space-y-1 mt-1">
                        <Progress value={attachmentProgress} className="h-1.5" />
                        <p className="text-[9px] font-black uppercase text-primary animate-pulse">
                          Uploading Resource... {attachmentProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Lesson Content
                </Label>
                <Textarea
                  value={newLessonBody}
                  onChange={(e) => setNewLessonBody(e.target.value)}
                  className="min-h-[150px] bg-slate-50 border-slate-200 rounded-2xl font-mono text-sm"
                  placeholder="Enter lesson text content..."
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Free Preview</Label>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Allow students to watch this video without enrolling.
                  </p>
                </div>
                <Switch checked={newLessonIsPreview} onCheckedChange={setNewLessonIsPreview} />
              </div>
              <Button
                className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl shadow-primary/20 mt-4"
                onClick={() => lessonMutation.mutate()}
                disabled={
                  lessonMutation.isPending ||
                  !newLessonTitle ||
                  isUploadingVideo ||
                  isUploadingAttachment
                }
              >
                Save Lesson
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditingLesson} onOpenChange={setIsEditingLesson}>
          <DialogContent className="max-w-2xl bg-white border-slate-200 text-slate-900 rounded-[2.5rem] p-10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="mb-10 text-left">
              <DialogTitle className="text-3xl font-black tracking-tight leading-none">
                Edit Lesson
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 text-left">
              <div className="space-y-3">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Lesson Title
                </Label>
                <Input
                  value={editingLessonTitle}
                  onChange={(e) => setEditingLessonTitle(e.target.value)}
                  className="h-14 bg-slate-50 border-slate-200 rounded-2xl focus-visible:ring-primary/50 text-base"
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  YouTube URL
                </Label>
                <Input
                  value={editingLessonVideo}
                  onChange={(e) => setEditingLessonVideo(e.target.value)}
                  className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-mono text-sm"
                  placeholder="https://youtube.com/..."
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    Learning Resource (PDF, GitHub, Slides)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 rounded-lg border-indigo-200 bg-indigo-50/50 text-indigo-600 hover:bg-indigo-100 font-bold text-[9px] uppercase tracking-widest gap-1.5"
                      onClick={() => {
                        const isEdit = !!editingLessonId;
                        generateResourceMutation.mutate({
                          title: isEdit ? editingLessonTitle : newLessonTitle,
                          content: isEdit ? editingLessonBody : newLessonBody,
                          isEditing: isEdit,
                        });
                      }}
                      disabled={
                        isGeneratingAttachment ||
                        (editingLessonId
                          ? !editingLessonTitle || !editingLessonBody || !editingLessonVideo
                          : !newLessonTitle || !newLessonBody || !newLessonVideo)
                      }
                    >
                      {isGeneratingAttachment ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Generate with AI
                    </Button>
                    <div className="h-4 w-px bg-slate-200" />
                    <div className="flex items-center gap-2 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setAttachmentUploadType("link")}
                        className={cn(
                          "px-2 py-1 rounded-md transition-colors font-bold",
                          attachmentUploadType === "link"
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        Link
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttachmentUploadType("file")}
                        className={cn(
                          "px-2 py-1 rounded-md transition-colors font-bold",
                          attachmentUploadType === "file"
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        File
                      </button>
                    </div>
                  </div>
                </div>
                {attachmentUploadType === "link" ? (
                  <Input
                    value={editingLessonAttachment}
                    onChange={(e) => setEditingLessonAttachment(e.target.value)}
                    className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-mono text-sm"
                    placeholder="https://github.com/... or PDF link"
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4">
                      <Input
                        type="file"
                        onChange={(e) => handleAttachmentUpload(e, true)}
                        disabled={isUploadingAttachment}
                        className="h-14 bg-slate-50 border-slate-200 rounded-2xl file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      />
                      {isUploadingAttachment && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                    </div>
                    {isUploadingAttachment && (
                      <div className="space-y-1 mt-1">
                        <Progress value={attachmentProgress} className="h-1.5" />
                        <p className="text-[9px] font-black uppercase text-primary animate-pulse">
                          Uploading Resource... {attachmentProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  Lesson Content
                </Label>
                <Textarea
                  value={editingLessonBody}
                  onChange={(e) => setEditingLessonBody(e.target.value)}
                  className="min-h-[200px] bg-slate-50 border-slate-200 rounded-2xl font-mono text-sm"
                  placeholder="Enter lesson text content..."
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold">Free Preview</Label>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Allow students to watch this video without enrolling.
                  </p>
                </div>
                <Switch
                  checked={editingLessonIsPreview}
                  onCheckedChange={setEditingLessonIsPreview}
                />
              </div>
              <Button
                className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-lg shadow-xl shadow-primary/20 mt-4"
                onClick={() =>
                  updateLessonMutation.mutate({
                    title: editingLessonTitle,
                    video_url: editingLessonVideo,
                    attachment_url: editingLessonAttachment,
                    body_text: editingLessonBody,
                    is_preview: editingLessonIsPreview,
                  })
                }
                disabled={
                  updateLessonMutation.isPending || !editingLessonTitle || isUploadingAttachment
                }
              >
                {updateLessonMutation.isPending ? "Saving..." : "Save Lesson"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditingCourse} onOpenChange={setIsEditingCourse}>
          <DialogContent className="max-w-xl bg-white border-slate-200 text-slate-900 rounded-[2.5rem] p-10 shadow-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="mb-10 text-left">
              <DialogTitle className="text-3xl font-black leading-tight">
                Course Settings
              </DialogTitle>
              <DialogDescription>Update your course metadata and pricing.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 text-left">
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  Course Title
                </Label>
                <Input
                  value={editedCourseTitle}
                  onChange={(e) => setEditedCourseTitle(e.target.value)}
                  className="rounded-xl border-slate-200 bg-slate-50/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  Description
                </Label>
                <Textarea
                  value={editedCourseDescription}
                  onChange={(e) => setEditedCourseDescription(e.target.value)}
                  className="rounded-xl border-slate-200 bg-slate-50/50 min-h-[100px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Price (USD)
                  </Label>
                  <Input
                    type="number"
                    value={editedCoursePrice}
                    onChange={(e) => setEditedCoursePrice(Number(e.target.value))}
                    className="rounded-xl border-slate-200 bg-slate-50/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Category
                  </Label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 h-10 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                    value={editedCourseCategory}
                    onChange={(e) => setEditedCourseCategory(e.target.value)}
                  >
                    {COURSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Difficulty Level
                  </Label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 h-10 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20"
                    value={editedCourseLevel}
                    onChange={(e) => setEditedCourseLevel(e.target.value)}
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Thumbnail Image
                  </Label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setCourseImageUploadType("link")}
                      className={cn(
                        "px-2 py-1 rounded-md transition-colors font-bold",
                        courseImageUploadType === "link"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-secondary",
                      )}
                    >
                      Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setCourseImageUploadType("file")}
                      className={cn(
                        "px-2 py-1 rounded-md transition-colors font-bold",
                        courseImageUploadType === "file"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-secondary",
                      )}
                    >
                      File
                    </button>
                  </div>
                </div>
                {courseImageUploadType === "link" ? (
                  <Input
                    placeholder="https://images.unsplash.com/..."
                    value={editedCourseImageUrl}
                    onChange={(e) => setEditedCourseImageUrl(e.target.value)}
                    className="rounded-xl border-slate-200 bg-slate-50/50"
                  />
                ) : (
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleCourseImageUpload}
                      disabled={isUploadingCourseImage}
                      className="rounded-xl border-slate-200 bg-slate-50/50 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                    {isUploadingCourseImage && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                    Promo Video
                  </Label>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPromoVideoUploadType("link")}
                      className={cn(
                        "px-2 py-1 rounded-md transition-colors font-bold",
                        promoVideoUploadType === "link"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-secondary",
                      )}
                    >
                      Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromoVideoUploadType("file")}
                      className={cn(
                        "px-2 py-1 rounded-md transition-colors font-bold",
                        promoVideoUploadType === "file"
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-secondary",
                      )}
                    >
                      File
                    </button>
                  </div>
                </div>
                {promoVideoUploadType === "link" ? (
                  <Input
                    placeholder="https://youtube.com/watch?v=..."
                    value={editedCoursePromoVideo}
                    onChange={(e) => setEditedCoursePromoVideo(e.target.value)}
                    className="rounded-xl border-slate-200 bg-slate-50/50"
                  />
                ) : (
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept="video/*"
                      onChange={handlePromoVideoUpload}
                      disabled={isUploadingPromoVideo}
                      className="rounded-xl border-slate-200 bg-slate-50/50 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                    {isUploadingPromoVideo && (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 space-y-3">
                <Button
                  className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-base shadow-xl shadow-primary/20"
                  onClick={async () => {
                    const session = await getCurrentSession();
                    if (!session || !user) {
                      toast.error("Session expired. Please log in again.");
                      void navigate({ to: "/login", search: { mode: "login" } as any });
                      return;
                    }

                    // --- HARDENED VALIDATION ---
                    const cleanTitle = editedCourseTitle.trim();
                    if (!cleanTitle || cleanTitle.length < 5) {
                      return toast.error("Course title must be at least 5 characters long.");
                    }

                    if (cleanTitle.length > 80) {
                      return toast.error("Course title is too long (max 80 characters).");
                    }

                    // Disallow Emojis and weird special characters
                    const titleRegex = /^[\u0E00-\u0E7F\w\s\-,.!?'()&:]+$/;
                    if (!titleRegex.test(cleanTitle)) {
                      return toast.error(
                        "Course title contains invalid characters. Please use only letters, numbers, and basic punctuation.",
                      );
                    }

                    const numericPrice = Number(editedCoursePrice);
                    if (isNaN(numericPrice) || numericPrice < 0) {
                      return toast.error("Price must be a valid positive number or 0.");
                    }

                    if (numericPrice > 999999) {
                      return toast.error("Price is too high. Maximum is 999,999.");
                    }

                    if (!editedCourseCategory) {
                      return toast.error("Please select a category.");
                    }

                    const cleanDescription = editedCourseDescription.trim();
                    if (cleanDescription.length < 20) {
                      return toast.error("Description should be at least 20 characters.");
                    }

                    // Link & Content Validation (Unconditional for all media)
                    if (editedCourseImageUrl) {
                      if (!isValidUrl(editedCourseImageUrl)) {
                        return toast.error("Thumbnail URL is not properly formatted.");
                      }
                      if (!isImageUrl(editedCourseImageUrl)) {
                        return toast.error("Thumbnail must point to a valid image file.");
                      }
                    }

                    if (editedCoursePromoVideo) {
                      if (!isValidUrl(editedCoursePromoVideo)) {
                        return toast.error("Promo Video URL is not properly formatted.");
                      }
                      if (!isVideoUrl(editedCoursePromoVideo)) {
                        return toast.error(
                          "Promo Video must point to a valid video platform or file.",
                        );
                      }
                    }

                    const finalPrice = Math.round(numericPrice * 100) / 100;

                    updateCourseMutation.mutate({
                      title: cleanTitle,
                      description: cleanDescription,
                      price: finalPrice,
                      category: editedCourseCategory,
                      level: editedCourseLevel,
                      imageUrl: editedCourseImageUrl,
                      promoVideoUrl: editedCoursePromoVideo,
                    });
                  }}
                  disabled={updateCourseMutation.isPending}
                >
                  Save Changes
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full h-14 rounded-2xl text-destructive hover:text-destructive hover:bg-destructive/5 font-bold"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete Course
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white rounded-[2rem] border-slate-200 p-10">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-2xl font-black">
                        Are you sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-500 font-medium text-base">
                        This will permanently delete your course and all content.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-8 gap-3">
                      <AlertDialogCancel className="rounded-xl h-12 font-bold border-slate-200">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="rounded-xl h-12 font-bold bg-destructive text-white hover:bg-destructive/90"
                        onClick={() => deleteCourseMutation.mutate()}
                      >
                        Delete Course
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SiteLayout>
  );
}
