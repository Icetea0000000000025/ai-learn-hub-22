import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site-layout";
import { useI18n } from "@/lib/i18n";
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

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error(
        lang === "th"
          ? "โปรดเข้าสู่ระบบหรือสร้างบัญชีเพื่อส่งข้อความ"
          : "Please login or create an account to send a message.",
      );
      navigate({ to: "/login", search: { mode: "login", redirect: "/about" } as any });
      return;
    }

    setIsSending(true);
    try {
      await createSupportThread(user.id, `Contact Inquiry: ${contactName}`, contactMessage);
      toast.success(
        lang === "th"
          ? "ได้รับข้อความแล้ว! ระบบได้สร้างตั๋วความช่วยเหลือสำหรับคุณแล้ว"
          : "Message received! A support ticket has been created for you.",
      );
      setContactMessage("");
      setContactOpen(false);
    } catch (err: any) {
      toast.error(
        (lang === "th" ? "ไม่สามารถส่งข้อความได้: " : "Failed to send message: ") + err.message,
      );
    } finally {
      setIsSending(false);
    }
  };

  const faqs =
    lang === "th"
      ? [
          {
            question: "เริ่มต้นเรียนอย่างไร?",
            answer:
              "เพียงแค่เรียกดูคลังหลักสูตรของเรา เลือกคอร์สที่คุณสนใจ และชำระเงิน เมื่อลงทะเบียนสำเร็จแล้ว คอร์สจะแสดงในแดชบอร์ดของคุณทันที",
          },
          {
            question: "ฉันสามารถสร้างคอร์สของตัวเองบน LearnLab ได้หรือไม่?",
            answer:
              "ได้! หากบัญชีของคุณมีสิทธิ์เป็น 'ผู้สร้าง' (Creator) คุณสามารถเข้าถึงสตูดิโอ 'สร้างคอร์ส' ซึ่งผู้ช่วย AI ของเราจะช่วยออกแบบ โครงสร้าง และเผยแพร่คอร์สของคุณได้ภายในไม่กี่นาที",
          },
          {
            question: "บัญชีองค์กร (Organization) คืออะไร?",
            answer:
              "บัญชีองค์กรได้รับการออกแบบมาสำหรับทีมและธุรกิจ ช่วยให้คุณซื้อสิทธิ์เข้าเรียนเป็นกลุ่มและกระจายสิทธิ์ไปยังพนักงานของคุณ พร้อมติดตามความค้าวหน้าในการเรียนรู้ของพวกเขา",
          },
          {
            question: "ฉันจะได้รับใบประกาศนียบัตรได้อย่างไร?",
            answer:
              "ใบประกาศนียบัตรจะถูกสร้างขึ้นโดยอัตโนมัติเมื่อคุณเรียนจบหลักสูตร 100% คุณสามารถเรียกดู ดาวน์โหลด และยืนยันความถูกต้องได้จากแดชบอร์ดของคุณ",
          },
          {
            question: "รองรับช่องทางการชำระเงินใดบ้าง?",
            answer:
              "เรารองรับบัตรเครดิตหลักๆ และ PromptPay ผ่าน Stripe ทุกการทำรายการปลอดภัยและได้รับการเข้ารหัสอย่างแน่นหนา",
          },
        ]
      : [
          {
            question: "How do I get started as a Learner?",
            answer:
              "Simply browse our course catalog, select a course you're interested in, and proceed to checkout. Once enrolled, the course will appear in your Dashboard instantly.",
          },
          {
            question: "Can I create my own courses on LearnLab?",
            answer:
              "Yes! If your account has the 'Creator' role, you can access the 'Create' studio where our AI assistant will help you design, structure, and publish your course in minutes.",
          },
          {
            question: "What is an Organization account?",
            answer:
              "Organization accounts are designed for teams and businesses. They allow you to purchase licenses in bulk and distribute them to your members while tracking their learning progress.",
          },
          {
            question: "How do I receive my certificate?",
            answer:
              "Certificates are automatically generated once you complete 100% of a course's lessons. You can view, download, and verify them from your Dashboard.",
          },
          {
            question: "What payment methods do you support?",
            answer:
              "We support major credit cards and PromptPay via Stripe. All transactions are secure and encrypted.",
          },
        ];

  const supportItems = [
    {
      icon: HelpCircle,
      title: lang === "th" ? "ศูนย์ช่วยเหลือ" : "Help Center",
      desc:
        lang === "th"
          ? "ค้นหาคำตอบสำหรับคำถามที่พบบ่อยเกี่ยวกับบัญชี การชำระเงิน และการเรียนรู้"
          : "Find quick answers to common questions about accounts, payments, and learning.",
      action: lang === "th" ? "สำรวจคำถามที่พบบ่อย" : "Explore FAQs",
      onClick: () => faqRef.current?.scrollIntoView({ behavior: "smooth" }),
    },
    {
      icon: MessageSquare,
      title: lang === "th" ? "ฝ่ายบริการช่วยเหลือ" : "Live Support",
      desc:
        lang === "th"
          ? "ต้องการความช่วยเหลือเพิ่มเติม? พูดคุยกับทีมงานของเราหรือส่งตั๋วคำขอช่วยเหลือจากแดชบอร์ดของคุณ"
          : "Need hands-on help? Chat with our team or open a ticket from your dashboard.",
      action: lang === "th" ? "เปิดตั๋วความช่วยเหลือ" : "Open Ticket",
      onClick: () => {
        if (!user) {
          toast.info(
            lang === "th"
              ? "โปรดเข้าสู่ระบบเพื่อเข้าใช้งานฝ่ายช่วยเหลือ"
              : "Please login to access live support.",
          );
          navigate({ to: "/login", search: { mode: "login", redirect: "/about" } as any });
        } else {
          toast.success(
            lang === "th"
              ? "กำลังนำคุณไปยังฝ่ายสนับสนุน..."
              : "Redirecting to your Support Desk...",
          );
          navigate({ to: "/dashboard" });
        }
      },
    },
    {
      icon: Mail,
      title: lang === "th" ? "ติดต่อเรา" : "Contact Us",
      desc:
        lang === "th"
          ? `สำหรับความร่วมมือทางธุรกิจ หรือข้อเสนอแนะทั่วไป ติดต่อเราที่ ${displayEmail}`
          : `For partnerships, enterprise inquiries, or general feedback, drop us a line at ${displayEmail}`,
      action: lang === "th" ? "ส่งอีเมลหาเรา" : "Email Team",
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
              <Sparkles className="h-3 w-3" /> {lang === "th" ? "ภารกิจของเรา" : "Our Mission"}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl lg:text-7xl font-black tracking-tighter text-slate-900 leading-[0.9]"
            >
              {lang === "th" ? "เกี่ยวกับ" : "About"}{" "}
              <span className="text-primary italic">{siteName}</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg lg:text-xl text-slate-600 font-medium leading-relaxed"
            >
              {lang === "th"
                ? "เรากำลังสร้างเส้นทางที่เร็วที่สุดในการเปลี่ยนความเชี่ยวชาญของมนุษย์ให้เป็นการศึกษาดิจิทัลที่เป็นระบบ"
                : "We are building the fastest way to turn human expertise into structured digital education."}
              <br />
              {lang === "th"
                ? `${siteName} ช่วยเพิ่มพลังให้ผู้สร้างด้วย AI เพื่อออกแบบ เผยแพร่ และขยายขนาดคอร์สที่ผู้เรียนตั้งใจเรียนจนจบจริง`
                : `${siteName} empowers creators with AI to design, publish, and scale courses that learners actually finish.`}
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
                    {lang === "th" ? (
                      <>
                        ติดต่อ <span className="text-primary italic">เรา</span>
                      </>
                    ) : (
                      <>
                        Get in <span className="text-primary italic">Touch</span>
                      </>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 font-medium">
                    {lang === "th"
                      ? "มีคำถามหรือข้อเสนอแนะ? ส่งข้อความหาเราแล้วเราจะตอบกลับโดยเร็วที่สุด"
                      : "Have a question or proposal? Send us a message and we'll reply as soon as possible."}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                        {lang === "th" ? "ชื่อ-นามสกุล" : "Full Name"}
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
                        {lang === "th" ? "ที่อยู่อีเมล" : "Email Address"}
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
                      {lang === "th" ? "ข้อความของคุณ" : "Your Message"}
                    </Label>
                    <Textarea
                      required
                      placeholder={
                        lang === "th"
                          ? "เราจะช่วยคุณได้อย่างไรในวันนี้?"
                          : "How can we help you today?"
                      }
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
                        {lang === "th" ? "ส่งข้อความ" : "Send Message"}
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
                {lang === "th" ? "คำถามที่" : "Frequently Asked"}{" "}
                <span className="text-primary">{lang === "th" ? "พบบ่อย" : "Questions"}</span>
              </h2>
              <p className="text-slate-500 font-medium">
                {lang === "th"
                  ? "ทุกสิ่งที่คุณต้องการรู้เกี่ยวกับแพลตฟอร์ม"
                  : "Everything you need to know about the platform."}
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
                  {lang === "th" ? "การกระจายความเชี่ยวชาญผ่าน" : "Democratizing expertise through"}{" "}
                  <span className="text-primary">
                    {lang === "th" ? "ปัญญาประดิษฐ์อัจฉริยะ" : "Intelligence."}
                  </span>
                </h2>
                <div className="space-y-6">
                  {[
                    {
                      icon: Zap,
                      label: lang === "th" ? "ประสิทธิภาพของ AI" : "AI Efficiency",
                      desc:
                        lang === "th"
                          ? "ใช้เวลาน้อยลงในการจัดโครงสร้าง มีเวลาสอนมากขึ้น"
                          : "Spend less time structuring, more time teaching.",
                    },
                    {
                      icon: ShieldCheck,
                      label: lang === "th" ? "ตรวจสอบคุณภาพแล้ว" : "Quality Verified",
                      desc:
                        lang === "th"
                          ? "ทุกเส้นทางได้รับการปรับแต่งเพื่อให้เกิดผลลัพธ์การเรียนรู้ที่แท้จริง"
                          : "Every path is optimized for real learning outcomes.",
                    },
                    {
                      icon: Globe,
                      label: lang === "th" ? "การเข้าถึงทั่วโลก" : "Global Reach",
                      desc:
                        lang === "th"
                          ? "เสริมพลังให้กับผู้สอนในกว่า 40 ประเทศทั่วโลก"
                          : "Empowering educators across 40+ countries.",
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
                  {lang === "th" ? "ก่อตั้งเมื่อปี" : "ESTABLISHED"}
                </div>
                <div className="h-px bg-white/10 w-1/2 mx-auto" />
                <p className="text-sm text-slate-300 leading-relaxed font-medium">
                  {lang === "th"
                    ? "ก่อตั้งด้วยภารกิจที่เรียบง่าย: เพื่อให้การสอนระดับโลกเข้าถึงได้โดยทุกคน ทุกหนทุกแห่ง ทันที"
                    : "Founded with a simple mission: to make world-class teaching accessible to everyone, everywhere, instantly."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
