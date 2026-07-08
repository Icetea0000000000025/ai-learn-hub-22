import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { useI18n } from "@/lib/i18n";
import type { Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  MessageSquare,
  HelpCircle,
  Sparkles,
  Globe,
  ShieldCheck,
  Zap,
  ChevronRight,
  Plus,
  Minus,
  Send,
  Loader2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createSupportThread } from "@/lib/support";

// ---------------------------------------------------------------------------
// Per-language string table for the About page
// ---------------------------------------------------------------------------
const aboutStrings: Record<Language, Record<string, string>> = {
  en: {
    ourMission: "Our Mission",
    aboutHeading: "About",
    heroParagraph1:
      "We are building the fastest way to turn human expertise into structured digital education.",
    heroParagraph2Template:
      "{siteName} empowers creators with AI to design, publish, and scale courses that learners actually finish.",

    // Support cards
    helpCenterTitle: "Help Center",
    helpCenterDesc:
      "Find quick answers to common questions about accounts, payments, and learning.",
    helpCenterAction: "Explore FAQs",

    liveSupportTitle: "Live Support",
    liveSupportDesc:
      "Need hands-on help? Chat with our team or open a ticket from your dashboard.",
    liveSupportAction: "Open Ticket",

    contactUsTitle: "Contact Us",
    contactUsDescTemplate:
      "For partnerships, enterprise inquiries, or general feedback, drop us a line at {email}",
    contactUsAction: "Email Team",

    // Toast / navigation messages
    toastLoginRequired: "Please login or create an account to send a message.",
    toastMessageReceived:
      "Message received! A support ticket has been created for you.",
    toastFailedPrefix: "Failed to send message: ",
    toastLoginForSupport: "Please login to access live support.",
    toastRedirectingSupport: "Redirecting to your Support Desk...",

    // FAQ section
    faqHeading1: "Frequently Asked",
    faqHeading2: "Questions",
    faqSubheading: "Everything you need to know about the platform.",

    faqQ1: "How do I get started as a Learner?",
    faqA1:
      "Simply browse our course catalog, select a course you're interested in, and proceed to checkout. Once enrolled, the course will appear in your Dashboard instantly.",
    faqQ2: "Can I create my own courses on LearnLab?",
    faqA2:
      "Yes! If your account has the 'Creator' role, you can access the 'Create' studio where our AI assistant will help you design, structure, and publish your course in minutes.",
    faqQ3: "What is an Organization account?",
    faqA3:
      "Organization accounts are designed for teams and businesses. They allow you to purchase licenses in bulk and distribute them to your members while tracking their learning progress.",
    faqQ4: "How do I receive my certificate?",
    faqA4:
      "Certificates are automatically generated once you complete 100% of a course's lessons. You can view, download, and verify them from your Dashboard.",
    faqQ5: "What payment methods do you support?",
    faqA5:
      "We support major credit cards and PromptPay via Stripe. All transactions are secure and encrypted.",

    // Contact modal
    modalTitle1: "Get in",
    modalTitle2: "Touch",
    modalDescription:
      "Have a question or proposal? Send us a message and we'll reply as soon as possible.",
    labelFullName: "Full Name",
    labelEmailAddress: "Email Address",
    labelYourMessage: "Your Message",
    placeholderMessage: "How can we help you today?",
    sendMessage: "Send Message",

    // Why / democratizing section
    whyHeading1: "Democratizing expertise through",
    whyHeading2: "Intelligence.",
    feat1Label: "AI Efficiency",
    feat1Desc: "Spend less time structuring, more time teaching.",
    feat2Label: "Quality Verified",
    feat2Desc: "Every path is optimized for real learning outcomes.",
    feat3Label: "Global Reach",
    feat3Desc: "Empowering educators across 40+ countries.",
    established: "ESTABLISHED",
    foundedMission:
      "Founded with a simple mission: to make world-class teaching accessible to everyone, everywhere, instantly.",
  },

  th: {
    ourMission: "ภารกิจของเรา",
    aboutHeading: "เกี่ยวกับ",
    heroParagraph1:
      "เรากำลังสร้างเส้นทางที่เร็วที่สุดในการเปลี่ยนความเชี่ยวชาญของมนุษย์ให้เป็นการศึกษาดิจิทัลที่เป็นระบบ",
    heroParagraph2Template:
      "{siteName} ช่วยเพิ่มพลังให้ผู้สร้างด้วย AI เพื่อออกแบบ เผยแพร่ และขยายขนาดคอร์สที่ผู้เรียนตั้งใจเรียนจนจบจริง",

    helpCenterTitle: "ศูนย์ช่วยเหลือ",
    helpCenterDesc:
      "ค้นหาคำตอบสำหรับคำถามที่พบบ่อยเกี่ยวกับบัญชี การชำระเงิน และการเรียนรู้",
    helpCenterAction: "สำรวจคำถามที่พบบ่อย",

    liveSupportTitle: "ฝ่ายบริการช่วยเหลือ",
    liveSupportDesc:
      "ต้องการความช่วยเหลือเพิ่มเติม? พูดคุยกับทีมงานของเราหรือส่งตั๋วคำขอช่วยเหลือจากแดชบอร์ดของคุณ",
    liveSupportAction: "เปิดตั๋วความช่วยเหลือ",

    contactUsTitle: "ติดต่อเรา",
    contactUsDescTemplate:
      "สำหรับความร่วมมือทางธุรกิจ หรือข้อเสนอแนะทั่วไป ติดต่อเราที่ {email}",
    contactUsAction: "ส่งอีเมลหาเรา",

    toastLoginRequired: "โปรดเข้าสู่ระบบหรือสร้างบัญชีเพื่อส่งข้อความ",
    toastMessageReceived:
      "ได้รับข้อความแล้ว! ระบบได้สร้างตั๋วความช่วยเหลือสำหรับคุณแล้ว",
    toastFailedPrefix: "ไม่สามารถส่งข้อความได้: ",
    toastLoginForSupport: "โปรดเข้าสู่ระบบเพื่อเข้าใช้งานฝ่ายช่วยเหลือ",
    toastRedirectingSupport: "กำลังนำคุณไปยังฝ่ายสนับสนุน...",

    faqHeading1: "คำถามที่",
    faqHeading2: "พบบ่อย",
    faqSubheading: "ทุกสิ่งที่คุณต้องการรู้เกี่ยวกับแพลตฟอร์ม",

    faqQ1: "เริ่มต้นเรียนอย่างไร?",
    faqA1:
      "เพียงแค่เรียกดูคลังหลักสูตรของเรา เลือกคอร์สที่คุณสนใจ และชำระเงิน เมื่อลงทะเบียนสำเร็จแล้ว คอร์สจะแสดงในแดชบอร์ดของคุณทันที",
    faqQ2: "ฉันสามารถสร้างคอร์สของตัวเองบน LearnLab ได้หรือไม่?",
    faqA2:
      "ได้! หากบัญชีของคุณมีสิทธิ์เป็น 'ผู้สร้าง' (Creator) คุณสามารถเข้าถึงสตูดิโอ 'สร้างคอร์ส' ซึ่งผู้ช่วย AI ของเราจะช่วยออกแบบ โครงสร้าง และเผยแพร่คอร์สของคุณได้ภายในไม่กี่นาที",
    faqQ3: "บัญชีองค์กร (Organization) คืออะไร?",
    faqA3:
      "บัญชีองค์กรได้รับการออกแบบมาสำหรับทีมและธุรกิจ ช่วยให้คุณซื้อสิทธิ์เข้าเรียนเป็นกลุ่มและกระจายสิทธิ์ไปยังพนักงานของคุณ พร้อมติดตามความค้าวหน้าในการเรียนรู้ของพวกเขา",
    faqQ4: "ฉันจะได้รับใบประกาศนียบัตรได้อย่างไร?",
    faqA4:
      "ใบประกาศนียบัตรจะถูกสร้างขึ้นโดยอัตโนมัติเมื่อคุณเรียนจบหลักสูตร 100% คุณสามารถเรียกดู ดาวน์โหลด และยืนยันความถูกต้องได้จากแดชบอร์ดของคุณ",
    faqQ5: "รองรับช่องทางการชำระเงินใดบ้าง?",
    faqA5:
      "เรารองรับบัตรเครดิตหลักๆ และ PromptPay ผ่าน Stripe ทุกการทำรายการปลอดภัยและได้รับการเข้ารหัสอย่างแน่นหนา",

    modalTitle1: "ติดต่อ",
    modalTitle2: "เรา",
    modalDescription:
      "มีคำถามหรือข้อเสนอแนะ? ส่งข้อความหาเราแล้วเราจะตอบกลับโดยเร็วที่สุด",
    labelFullName: "ชื่อ-นามสกุล",
    labelEmailAddress: "ที่อยู่อีเมล",
    labelYourMessage: "ข้อความของคุณ",
    placeholderMessage: "เราจะช่วยคุณได้อย่างไรในวันนี้?",
    sendMessage: "ส่งข้อความ",

    whyHeading1: "การกระจายความเชี่ยวชาญผ่าน",
    whyHeading2: "ปัญญาประดิษฐ์อัจฉริยะ",
    feat1Label: "ประสิทธิภาพของ AI",
    feat1Desc: "ใช้เวลาน้อยลงในการจัดโครงสร้าง มีเวลาสอนมากขึ้น",
    feat2Label: "ตรวจสอบคุณภาพแล้ว",
    feat2Desc: "ทุกเส้นทางได้รับการปรับแต่งเพื่อให้เกิดผลลัพธ์การเรียนรู้ที่แท้จริง",
    feat3Label: "การเข้าถึงทั่วโลก",
    feat3Desc: "เสริมพลังให้กับผู้สอนในกว่า 40 ประเทศทั่วโลก",
    established: "ก่อตั้งเมื่อปี",
    foundedMission:
      "ก่อตั้งด้วยภารกิจที่เรียบง่าย: เพื่อให้การสอนระดับโลกเข้าถึงได้โดยทุกคน ทุกหนทุกแห่ง ทันที",
  },

  es: {
    ourMission: "Nuestra Misión",
    aboutHeading: "Acerca de",
    heroParagraph1:
      "Estamos construyendo la forma más rápida de convertir la experiencia humana en educación digital estructurada.",
    heroParagraph2Template:
      "{siteName} empodera a los creadores con IA para diseñar, publicar y escalar cursos que los alumnos realmente terminan.",

    helpCenterTitle: "Centro de Ayuda",
    helpCenterDesc:
      "Encuentra respuestas rápidas a preguntas comunes sobre cuentas, pagos y aprendizaje.",
    helpCenterAction: "Explorar preguntas frecuentes",

    liveSupportTitle: "Soporte en Vivo",
    liveSupportDesc:
      "¿Necesitas ayuda práctica? Chatea con nuestro equipo o abre un ticket desde tu panel.",
    liveSupportAction: "Abrir Ticket",

    contactUsTitle: "Contáctanos",
    contactUsDescTemplate:
      "Para asociaciones, consultas empresariales o comentarios generales, escríbenos a {email}",
    contactUsAction: "Enviar Correo",

    toastLoginRequired:
      "Por favor inicia sesión o crea una cuenta para enviar un mensaje.",
    toastMessageReceived:
      "¡Mensaje recibido! Se ha creado un ticket de soporte para ti.",
    toastFailedPrefix: "Error al enviar el mensaje: ",
    toastLoginForSupport: "Por favor inicia sesión para acceder al soporte en vivo.",
    toastRedirectingSupport: "Redirigiendo a tu Servicio de Soporte...",

    faqHeading1: "Preguntas",
    faqHeading2: "Frecuentes",
    faqSubheading: "Todo lo que necesitas saber sobre la plataforma.",

    faqQ1: "¿Cómo empiezo como Estudiante?",
    faqA1:
      "Simplemente navega por nuestro catálogo de cursos, selecciona uno que te interese y procede al pago. Una vez inscrito, el curso aparecerá en tu Panel al instante.",
    faqQ2: "¿Puedo crear mis propios cursos en LearnLab?",
    faqA2:
      "¡Sí! Si tu cuenta tiene el rol 'Creador', puedes acceder al estudio 'Crear' donde nuestro asistente de IA te ayudará a diseñar, estructurar y publicar tu curso en minutos.",
    faqQ3: "¿Qué es una cuenta de Organización?",
    faqA3:
      "Las cuentas de Organización están diseñadas para equipos y empresas. Te permiten comprar licencias en masa y distribuirlas a tus miembros mientras haces seguimiento de su progreso.",
    faqQ4: "¿Cómo recibo mi certificado?",
    faqA4:
      "Los certificados se generan automáticamente una vez que completas el 100% de las lecciones de un curso. Puedes verlos, descargarlos y verificarlos desde tu Panel.",
    faqQ5: "¿Qué métodos de pago aceptan?",
    faqA5:
      "Aceptamos las principales tarjetas de crédito y PromptPay a través de Stripe. Todas las transacciones son seguras y están cifradas.",

    modalTitle1: "Ponte en",
    modalTitle2: "Contacto",
    modalDescription:
      "¿Tienes una pregunta o propuesta? Envíanos un mensaje y te responderemos lo antes posible.",
    labelFullName: "Nombre Completo",
    labelEmailAddress: "Dirección de Correo",
    labelYourMessage: "Tu Mensaje",
    placeholderMessage: "¿En qué podemos ayudarte hoy?",
    sendMessage: "Enviar Mensaje",

    whyHeading1: "Democratizando la experiencia a través de la",
    whyHeading2: "Inteligencia.",
    feat1Label: "Eficiencia de IA",
    feat1Desc: "Menos tiempo en la estructura, más tiempo enseñando.",
    feat2Label: "Calidad Verificada",
    feat2Desc: "Cada ruta está optimizada para resultados de aprendizaje reales.",
    feat3Label: "Alcance Global",
    feat3Desc: "Empoderando a educadores en más de 40 países.",
    established: "FUNDADO",
    foundedMission:
      "Fundado con una misión simple: hacer que la enseñanza de clase mundial sea accesible para todos, en todas partes, al instante.",
  },

  ja: {
    ourMission: "私たちのミッション",
    aboutHeading: "について",
    heroParagraph1:
      "私たちは、人間の専門知識を構造化されたデジタル教育に変える最速の方法を構築しています。",
    heroParagraph2Template:
      "{siteName}はAIでクリエイターを支援し、学習者が本当に修了できるコースを設計・公開・スケールします。",

    helpCenterTitle: "ヘルプセンター",
    helpCenterDesc:
      "アカウント・支払い・学習に関するよくある質問への回答を見つけましょう。",
    helpCenterAction: "FAQを見る",

    liveSupportTitle: "ライブサポート",
    liveSupportDesc:
      "直接サポートが必要ですか？チームとチャットするか、ダッシュボードからチケットを開いてください。",
    liveSupportAction: "チケットを開く",

    contactUsTitle: "お問い合わせ",
    contactUsDescTemplate:
      "パートナーシップ・法人向けのお問い合わせ・ご意見は {email} までご連絡ください",
    contactUsAction: "メールを送る",

    toastLoginRequired:
      "メッセージを送信するにはログインまたはアカウントを作成してください。",
    toastMessageReceived:
      "メッセージを受信しました！サポートチケットが作成されました。",
    toastFailedPrefix: "メッセージの送信に失敗しました: ",
    toastLoginForSupport: "ライブサポートにアクセスするにはログインしてください。",
    toastRedirectingSupport: "サポートデスクに移動しています...",

    faqHeading1: "よくある",
    faqHeading2: "質問",
    faqSubheading: "プラットフォームについて知っておくべきすべてのこと。",

    faqQ1: "学習者としてどうやって始めますか？",
    faqA1:
      "コースカタログを閲覧し、興味のあるコースを選択してチェックアウトしてください。登録が完了すると、コースはすぐにダッシュボードに表示されます。",
    faqQ2: "LearnLabで自分のコースを作成できますか？",
    faqA2:
      "はい！アカウントに「クリエイター」ロールがある場合、「作成」スタジオにアクセスでき、AIアシスタントが数分でコースの設計・構造化・公開をお手伝いします。",
    faqQ3: "組織アカウントとは何ですか？",
    faqA3:
      "組織アカウントはチームや企業向けに設計されています。ライセンスを一括購入してメンバーに配布し、学習の進捗を追跡できます。",
    faqQ4: "修了証はどのように受け取りますか？",
    faqA4:
      "コースのレッスンを100%修了すると、修了証が自動的に生成されます。ダッシュボードから表示・ダウンロード・確認ができます。",
    faqQ5: "対応している支払い方法は何ですか？",
    faqA5:
      "主要なクレジットカードとStripe経由のPromptPayに対応しています。すべての取引は安全で暗号化されています。",

    modalTitle1: "お",
    modalTitle2: "問い合わせ",
    modalDescription:
      "ご質問やご提案はありますか？メッセージをお送りください。できる限り早くご返信します。",
    labelFullName: "氏名",
    labelEmailAddress: "メールアドレス",
    labelYourMessage: "メッセージ",
    placeholderMessage: "本日はどのようにお手伝いできますか？",
    sendMessage: "メッセージを送る",

    whyHeading1: "AIを通じて専門知識を",
    whyHeading2: "民主化する。",
    feat1Label: "AI効率化",
    feat1Desc: "構造化に費やす時間を減らし、教えることに集中できます。",
    feat2Label: "品質保証済み",
    feat2Desc: "すべての学習パスは実際の学習成果に最適化されています。",
    feat3Label: "グローバルリーチ",
    feat3Desc: "40カ国以上の教育者を支援しています。",
    established: "設立",
    foundedMission:
      "シンプルなミッションのもとに設立されました：世界クラスの教育を、すべての人に、どこでも、即座にアクセスできるようにする。",
  },

  zh: {
    ourMission: "我们的使命",
    aboutHeading: "关于",
    heroParagraph1:
      "我们正在构建将人类专业知识转化为结构化数字教育的最快途径。",
    heroParagraph2Template:
      "{siteName}借助AI赋能创作者，设计、发布并扩展学习者真正能完成的课程。",

    helpCenterTitle: "帮助中心",
    helpCenterDesc: "查找有关账户、付款和学习的常见问题的快速解答。",
    helpCenterAction: "浏览常见问题",

    liveSupportTitle: "在线支持",
    liveSupportDesc: "需要实时帮助？与我们的团队聊天或从仪表板提交工单。",
    liveSupportAction: "提交工单",

    contactUsTitle: "联系我们",
    contactUsDescTemplate:
      "如需合作、企业咨询或一般反馈，请发送邮件至 {email}",
    contactUsAction: "发送邮件",

    toastLoginRequired: "请登录或创建账户以发送消息。",
    toastMessageReceived: "消息已收到！已为您创建支持工单。",
    toastFailedPrefix: "发送消息失败：",
    toastLoginForSupport: "请登录以访问在线支持。",
    toastRedirectingSupport: "正在跳转到您的支持中心...",

    faqHeading1: "常见",
    faqHeading2: "问题",
    faqSubheading: "您需要了解的关于平台的一切。",

    faqQ1: "作为学习者如何开始？",
    faqA1:
      "只需浏览我们的课程目录，选择您感兴趣的课程并结账。注册成功后，课程将立即显示在您的仪表板中。",
    faqQ2: "我可以在LearnLab上创建自己的课程吗？",
    faqA2:
      "可以！如果您的账户具有\"创作者\"角色，您可以访问\"创建\"工作室，我们的AI助手将在数分钟内帮助您设计、构建和发布课程。",
    faqQ3: "什么是组织账户？",
    faqA3:
      "组织账户专为团队和企业设计，允许您批量购买许可证并分发给成员，同时跟踪他们的学习进度。",
    faqQ4: "如何获取我的证书？",
    faqA4:
      "完成课程100%的课时后，证书将自动生成。您可以从仪表板查看、下载和验证证书。",
    faqQ5: "支持哪些付款方式？",
    faqA5:
      "我们通过Stripe支持主要信用卡和PromptPay。所有交易均安全加密。",

    modalTitle1: "联系",
    modalTitle2: "我们",
    modalDescription: "有问题或建议？发送消息给我们，我们将尽快回复。",
    labelFullName: "全名",
    labelEmailAddress: "电子邮件地址",
    labelYourMessage: "您的消息",
    placeholderMessage: "今天我们能为您做什么？",
    sendMessage: "发送消息",

    whyHeading1: "通过人工智能实现",
    whyHeading2: "专业知识民主化。",
    feat1Label: "AI效率",
    feat1Desc: "减少结构化时间，增加教学时间。",
    feat2Label: "质量认证",
    feat2Desc: "每条学习路径都针对真实学习成果进行了优化。",
    feat3Label: "全球覆盖",
    feat3Desc: "赋能全球40多个国家的教育者。",
    established: "成立于",
    foundedMission:
      "以简单的使命创立：让世界级教学对所有人、在任何地方、即时可得。",
  },

  ko: {
    ourMission: "우리의 미션",
    aboutHeading: "소개",
    heroParagraph1:
      "우리는 인간의 전문 지식을 구조화된 디지털 교육으로 전환하는 가장 빠른 방법을 구축하고 있습니다.",
    heroParagraph2Template:
      "{siteName}은 AI로 크리에이터를 지원하여 학습자가 실제로 완료하는 코스를 설계, 게시 및 확장합니다.",

    helpCenterTitle: "도움말 센터",
    helpCenterDesc: "계정, 결제, 학습에 관한 일반적인 질문에 대한 빠른 답변을 찾아보세요.",
    helpCenterAction: "FAQ 보기",

    liveSupportTitle: "실시간 지원",
    liveSupportDesc:
      "직접적인 도움이 필요하신가요? 팀과 채팅하거나 대시보드에서 티켓을 여세요.",
    liveSupportAction: "티켓 열기",

    contactUsTitle: "문의하기",
    contactUsDescTemplate:
      "파트너십, 기업 문의 또는 일반 피드백은 {email}로 연락해 주세요",
    contactUsAction: "이메일 보내기",

    toastLoginRequired: "메시지를 보내려면 로그인하거나 계정을 만드세요.",
    toastMessageReceived: "메시지를 받았습니다! 지원 티켓이 생성되었습니다.",
    toastFailedPrefix: "메시지 전송 실패: ",
    toastLoginForSupport: "실시간 지원에 접근하려면 로그인하세요.",
    toastRedirectingSupport: "지원 데스크로 이동 중...",

    faqHeading1: "자주 묻는",
    faqHeading2: "질문",
    faqSubheading: "플랫폼에 대해 알아야 할 모든 것.",

    faqQ1: "학습자로서 어떻게 시작하나요?",
    faqA1:
      "코스 카탈로그를 탐색하여 관심 있는 코스를 선택하고 결제를 진행하세요. 등록이 완료되면 코스가 즉시 대시보드에 표시됩니다.",
    faqQ2: "LearnLab에서 내 코스를 만들 수 있나요?",
    faqA2:
      "네! 계정에 '크리에이터' 역할이 있는 경우 '만들기' 스튜디오에 접근할 수 있으며, AI 어시스턴트가 몇 분 안에 코스를 설계, 구성 및 게시하는 것을 도와드립니다.",
    faqQ3: "조직 계정이란 무엇인가요?",
    faqA3:
      "조직 계정은 팀과 기업을 위해 설계되었습니다. 라이선스를 대량 구매하여 구성원에게 배포하고 학습 진행 상황을 추적할 수 있습니다.",
    faqQ4: "수료증은 어떻게 받나요?",
    faqA4:
      "코스의 레슨을 100% 완료하면 수료증이 자동으로 생성됩니다. 대시보드에서 보기, 다운로드, 확인이 가능합니다.",
    faqQ5: "어떤 결제 방법을 지원하나요?",
    faqA5:
      "Stripe를 통해 주요 신용카드와 PromptPay를 지원합니다. 모든 거래는 안전하고 암호화되어 있습니다.",

    modalTitle1: "연락",
    modalTitle2: "하기",
    modalDescription:
      "질문이나 제안이 있으신가요? 메시지를 보내주시면 최대한 빨리 답변 드리겠습니다.",
    labelFullName: "성명",
    labelEmailAddress: "이메일 주소",
    labelYourMessage: "메시지",
    placeholderMessage: "오늘 어떻게 도와드릴까요?",
    sendMessage: "메시지 보내기",

    whyHeading1: "AI를 통한 전문 지식의",
    whyHeading2: "민주화.",
    feat1Label: "AI 효율성",
    feat1Desc: "구조화에 시간을 덜 쓰고 가르치는 데 더 많은 시간을 투자하세요.",
    feat2Label: "품질 인증",
    feat2Desc: "모든 학습 경로는 실제 학습 성과를 위해 최적화되어 있습니다.",
    feat3Label: "글로벌 도달",
    feat3Desc: "40개 이상의 국가에서 교육자를 지원하고 있습니다.",
    established: "설립",
    foundedMission:
      "간단한 미션으로 설립되었습니다: 세계 최고 수준의 교육을 모든 사람이, 어디서나, 즉시 접근할 수 있도록.",
  },
};

export const Route = createFileRoute("/about")({
  component: About,
  head: () => ({ meta: [{ title: "About & Support — LearnLab" }] }),
});

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-200 py-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left group"
      >
        <span
          className={cn(
            "text-lg font-bold transition-colors",
            isOpen ? "text-primary" : "text-slate-900 group-hover:text-primary/70",
          )}
        >
          {question}
        </span>
        <div
          className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center transition-all",
            isOpen
              ? "bg-primary text-white rotate-180"
              : "bg-slate-100 text-slate-500 group-hover:bg-slate-200",
          )}
        >
          {isOpen ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pt-4 text-slate-500 leading-relaxed max-w-3xl">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function About() {
  const { lang, t } = useI18n();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const faqRef = useRef<HTMLDivElement>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Form State
  const [contactName, setContactName] = useState(profile?.name || "");
  const [contactEmail, setContactEmail] = useState(profile?.email || "");
  const [contactMessage, setContactMessage] = useState("");

  const { data: branding } = useQuery({
    queryKey: ["platform-branding"],
    queryFn: async () => {
      const { data } = await supabase
        .from("system_settings")
        .select("*")
        .eq("key", "site_branding")
        .maybeSingle();
      return (data?.value as any) || { name: "LearnLab", logo_url: "" };
    },
  });

  const siteName = branding?.name || "LearnLab";
  const displayEmail = `support@${siteName.toLowerCase().replace(/\s+/g, "")}.com`;

  // ---------------------------------------------------------------------------
  // Localisation helper
  // ---------------------------------------------------------------------------
  const s = (key: string): string =>
    (aboutStrings[lang as Language]?.[key] ?? aboutStrings.en[key]) as string;

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error(s("toastLoginRequired"));
      navigate({ to: "/login", search: { mode: "login", redirect: "/about" } as any });
      return;
    }

    setIsSending(true);
    try {
      await createSupportThread(user.id, `Contact Inquiry: ${contactName}`, contactMessage);
      toast.success(s("toastMessageReceived"));
      setContactMessage("");
      setContactOpen(false);
    } catch (err: any) {
      toast.error(s("toastFailedPrefix") + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const faqs = [
    { question: s("faqQ1"), answer: s("faqA1") },
    { question: s("faqQ2"), answer: s("faqA2") },
    { question: s("faqQ3"), answer: s("faqA3") },
    { question: s("faqQ4"), answer: s("faqA4") },
    { question: s("faqQ5"), answer: s("faqA5") },
  ];

  const supportItems = [
    {
      icon: HelpCircle,
      title: s("helpCenterTitle"),
      desc: s("helpCenterDesc"),
      action: s("helpCenterAction"),
      onClick: () => faqRef.current?.scrollIntoView({ behavior: "smooth" }),
    },
    {
      icon: MessageSquare,
      title: s("liveSupportTitle"),
      desc: s("liveSupportDesc"),
      action: s("liveSupportAction"),
      onClick: () => {
        if (!user) {
          toast.info(s("toastLoginForSupport"));
          navigate({ to: "/login", search: { mode: "login", redirect: "/about" } as any });
        } else {
          toast.success(s("toastRedirectingSupport"));
          navigate({ to: "/dashboard" });
        }
      },
    },
    {
      icon: Mail,
      title: s("contactUsTitle"),
      desc: s("contactUsDescTemplate").replace("{email}", displayEmail),
      action: s("contactUsAction"),
      onClick: () => setContactOpen(true),
    },
  ];

  return (
    <SiteLayout>
      <div className="relative bg-zinc-50 min-h-screen">
        {/* Decorative Background */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-6 py-20 lg:py-32">
          {/* Hero Section */}
          <div className="text-center space-y-6 max-w-3xl mx-auto mb-24">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em]"
            >
              <Sparkles className="h-3 w-3" /> {s("ourMission")}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl lg:text-7xl font-black tracking-tighter text-slate-900 leading-[0.9]"
            >
              {s("aboutHeading")}{" "}
              <span className="text-primary italic">{siteName}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg lg:text-xl text-slate-600 font-medium leading-relaxed"
            >
              {s("heroParagraph1")}
              <br />
              {s("heroParagraph2Template").replace("{siteName}", siteName)}
            </motion.p>
          </div>

          {/* Core Values / Support Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-32">
            {supportItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <Card className="h-full border-slate-200/60 shadow-xl shadow-slate-200/20 bg-white/50 backdrop-blur-sm group hover:border-primary/30 transition-all rounded-[2.5rem] overflow-hidden">
                  <CardContent className="p-8 flex flex-col h-full">
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-primary/10 transition-all">
                      <item.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-1">
                      {item.desc}
                    </p>
                    <Button
                      variant="ghost"
                      onClick={item.onClick}
                      className="w-fit p-0 h-auto font-black text-[10px] uppercase tracking-widest text-primary hover:bg-transparent group/btn"
                    >
                      {item.action}{" "}
                      <ChevronRight className="h-3 w-3 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Contact Modal */}
          <Dialog open={contactOpen} onOpenChange={setContactOpen}>
            <DialogContent className="max-w-xl bg-white rounded-[3rem] p-0 border-border shadow-2xl overflow-hidden">
              <div className="relative p-10 lg:p-14">
                {/* Modal Background Detail */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[4rem] -z-10" />

                <DialogHeader className="mb-10 text-left space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                    <Mail className="h-6 w-6" />
                  </div>
                  <DialogTitle className="text-3xl font-black tracking-tight text-slate-900">
                    {s("modalTitle1")} <span className="text-primary italic">{s("modalTitle2")}</span>
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 font-medium">
                    {s("modalDescription")}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        {s("labelFullName")}
                      </Label>
                      <Input
                        required
                        placeholder="John Doe"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        {s("labelEmailAddress")}
                      </Label>
                      <Input
                        required
                        type="email"
                        placeholder="john@example.com"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        className="rounded-2xl h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      {s("labelYourMessage")}
                    </Label>
                    <Textarea
                      required
                      placeholder={s("placeholderMessage")}
                      rows={4}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      className="rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all resize-none p-4"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSending}
                    className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 group"
                  >
                    {isSending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        {s("sendMessage")}
                        <Send className="ml-2 h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </DialogContent>
          </Dialog>

          {/* FAQ Section */}
          <div ref={faqRef} className="mb-32 scroll-mt-24">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl font-black tracking-tight text-slate-900 italic">
                {s("faqHeading1")}{" "}
                <span className="text-primary">{s("faqHeading2")}</span>
              </h2>
              <p className="text-slate-500 font-medium">
                {s("faqSubheading")}
              </p>
            </div>
            <div className="max-w-3xl mx-auto bg-white rounded-[3rem] border border-slate-200/60 p-8 lg:p-12 shadow-xl shadow-slate-200/20">
              {faqs.map((f, i) => (
                <FAQItem key={i} question={f.question} answer={f.answer} />
              ))}
            </div>
          </div>

          {/* Why Section */}
          <div className="bg-slate-900 rounded-[3rem] p-10 lg:p-20 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
              <div className="space-y-8">
                <h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                  {s("whyHeading1")}{" "}
                  <span className="text-primary">
                    {s("whyHeading2")}
                  </span>
                </h2>
                <div className="space-y-6">
                  {[
                    {
                      icon: Zap,
                      label: s("feat1Label"),
                      desc: s("feat1Desc"),
                    },
                    {
                      icon: ShieldCheck,
                      label: s("feat2Label"),
                      desc: s("feat2Desc"),
                    },
                    {
                      icon: Globe,
                      label: s("feat3Label"),
                      desc: s("feat3Desc"),
                    },
                  ].map((feat, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="mt-1 h-5 w-5 rounded bg-white/10 flex items-center justify-center shrink-0">
                        <feat.icon className="h-3 w-3 text-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-sm">{feat.label}</p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 rounded-3xl border border-white/10 p-8 flex flex-col justify-center text-center space-y-6">
                <div className="text-5xl font-black tracking-tighter">2026</div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                  {s("established")}
                </div>
                <div className="h-px bg-white/10 w-1/2 mx-auto" />
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  {s("foundedMission")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
