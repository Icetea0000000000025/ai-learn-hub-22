import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, CreditCard, Lock, ChevronLeft } from "lucide-react";
import { fetchCourseById, isSaleActive, getCourseEffectivePrice } from "@/lib/courses";
import { enrollInCourse, checkEnrollment } from "@/lib/enrollments";
import { useAuth, getCurrentSession } from "@/lib/auth";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";

export const Route = createFileRoute("/checkout/$courseId")({
  beforeLoad: async ({ location }) => {
    const session = await getCurrentSession();
    if (!session)
      throw redirect({
        to: "/login",
        search: { mode: "login", redirect: location.href },
      });
  },
  component: CheckoutPage,
  head: () => ({ meta: [{ title: "Checkout — LearnLab" }] }),
});

import { createPaymentRecord } from "@/lib/payments";
import { validateCoupon, incrementCouponUsage, type Coupon } from "@/lib/coupons";
import { Ticket, Tag, Loader2, CheckCircle2 } from "lucide-react";

import { createStripeCheckoutSession } from "@/lib/stripe";
import { loadStripe } from "@stripe/stripe-js";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/config";
import { checkCourseLicense, claimOrganizationSeat } from "@/lib/organizations";
import { Building2 } from "lucide-react";

function CheckoutPage() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["courses", courseId],
    queryFn: () => fetchCourseById(courseId),
  });

  const { data: isEnrolled } = useQuery({
    queryKey: ["enrollment", user?.id, courseId],
    queryFn: () => checkEnrollment(user!.id, courseId),
    enabled: !!user?.id,
  });

  const { data: availablePackage, isLoading: loadingPackage } = useQuery({
    queryKey: ["org-package", user?.id, courseId],
    queryFn: () => checkCourseLicense(user!.id, courseId),
    enabled: !!user?.id,
  });

  const basePrice = course ? getCourseEffectivePrice(course) : 0;

  const discountInfo = useMemo(() => {
    if (!appliedCoupon) return { amount: 0, final: basePrice };

    if (appliedCoupon.discountType === "percentage") {
      const reduction = basePrice * (appliedCoupon.discountAmount / 100);
      return {
        amount: reduction,
        final: Math.max(0, basePrice - reduction),
        isPercentage: true,
      };
    }

    return {
      amount: appliedCoupon.discountAmount,
      final: Math.max(0, basePrice - appliedCoupon.discountAmount),
      isPercentage: false,
    };
  }, [basePrice, appliedCoupon]);

  const finalPrice = discountInfo.final;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;

    // Stacking Prevention: If one is already applied, we replace it.
    // The user's requirement is to not allow "ซ้อน" (stacking).
    // My logic replaces, which is a form of clearing the old one.

    setIsValidating(true);
    try {
      const coupon = await validateCoupon(couponCode);
      setAppliedCoupon(coupon);
      toast.success(`คูปอง "${coupon.code}" ถูกนำมาใช้งานแล้ว`);
      setCouponCode(""); // Clear input after success
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "คูปองไม่ถูกต้อง");
      // Keep old coupon if new one is invalid
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.info("ยกเลิกการใช้คูปองแล้ว");
  };

  const handleOrgEnroll = async () => {
    if (!user || !availablePackage) return;
    setIsProcessing(true);
    try {
      await (claimOrganizationSeat as any)({
        data: { userId: user.id, courseId, orgId: (availablePackage as any).organization_id },
      });
      toast.success("Successfully enrolled via organization seat!");
      queryClient.invalidateQueries({ queryKey: ["enrollment", user.id, courseId] });
      void navigate({ to: "/courses/$courseId/learn", params: { courseId } });
    } catch (err) {
      toast.error("Failed to claim seat: " + (err instanceof Error ? err.message : "Error"));
      setIsProcessing(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !course) return;

    setIsProcessing(true);
    try {
      const { url } = await (createStripeCheckoutSession as any)({
        data: {
          courseId,
          userId: user.id,
          courseTitle: course.title,
          amount: finalPrice,
          couponId: appliedCoupon?.id,
        },
      });

      if (url) {
        // Use window.top to break out of Lovable preview iframe.
        // In production (not iframed), window.top === window, so behavior is unchanged.
        try {
          const top = window.top ?? window;
          top.location.href = url;
        } catch {
          // Cross-origin iframe access denied — fall back to opening in a new tab.
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (err) {
      console.error("Stripe session creation failed:", err);
      toast.error("Payment failed: " + (err instanceof Error ? err.message : "Please try again."));
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (isEnrolled && !isLoading) {
      void navigate({
        to: "/courses/$courseId/learn",
        params: { courseId },
        search: { lessonId: undefined },
      });
    }
  }, [isEnrolled, isLoading, courseId, navigate]);

  if (isLoading) return <div className="p-20 text-center">Loading checkout...</div>;
  if (!course) return <div className="p-20 text-center">Course not found</div>;
  if (isEnrolled) return <div className="p-20 text-center">Redirecting to learning...</div>;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Button variant="ghost" asChild className="mb-6 -ml-2 gap-2">
          <Link to="/courses/$courseId" params={{ courseId }}>
            <ChevronLeft className="h-4 w-4" /> Back to Course
          </Link>
        </Button>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left: Payment Form */}
          <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>

            {/* B2B Promo */}
            {availablePackage && (
              <Card className="border-indigo-500 bg-indigo-50 shadow-xl shadow-indigo-100 overflow-hidden relative">
                <div className="absolute -right-4 -top-4 text-indigo-100">
                  <Building2 className="h-24 w-24" />
                </div>
                <CardHeader className="relative z-10">
                  <CardTitle className="text-indigo-900 flex items-center gap-2">
                    <Building2 className="h-5 w-5" /> Enterprise Access
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10 space-y-4">
                  <p className="text-sm text-indigo-700 font-medium">
                    Your organization has available seats for this course. You can enroll for free.
                  </p>
                  <Button
                    onClick={handleOrgEnroll}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      "Claim Organization Seat"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              <Card className="overflow-hidden border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2rem]">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                  <CardTitle className="flex items-center gap-3 text-xl font-black">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <CreditCard className="h-5 w-5" />
                    </div>
                    Select Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-1 gap-4">
                    {/* PromptPay Option */}
                    <div className="relative group cursor-pointer" onClick={() => {}}>
                      <div className="flex items-center justify-between p-6 rounded-3xl border-2 border-primary bg-primary/5 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden p-2">
                            <img
                              src="https://upload.wikimedia.org/wikipedia/commons/c/c5/PromptPay-logo.png"
                              alt="PromptPay"
                              className="object-contain"
                            />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 leading-none mb-1">
                              PromptPay QR
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Instant Activation
                            </p>
                          </div>
                        </div>
                        <div className="h-6 w-6 rounded-full border-2 border-primary flex items-center justify-center">
                          <div className="h-3 w-3 rounded-full bg-primary" />
                        </div>
                      </div>
                    </div>

                    {/* Card Option */}
                    <div className="relative group cursor-not-allowed opacity-60">
                      <div className="flex items-center justify-between p-6 rounded-3xl border-2 border-slate-100 bg-white transition-all">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                            <CreditCard className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-none mb-1">
                              Credit / Debit Card
                            </p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Visa, Mastercard, JCB
                            </p>
                          </div>
                        </div>
                        <div className="h-6 w-6 rounded-full border-2 border-slate-200" />
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest px-8">
                    You will be redirected to Stripe's secure portal to complete your {finalPrice}{" "}
                    THB payment.
                  </p>
                </CardContent>
                <CardFooter className="p-8 pt-0">
                  <Button
                    onClick={handlePayment}
                    className="w-full h-16 rounded-2xl text-lg font-black shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98] group"
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-3" />
                        Securing Connection...
                      </>
                    ) : (
                      <>
                        Pay Now via Stripe
                        <ChevronLeft className="h-5 w-5 ml-2 rotate-180 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Coupon Section */}
            <Card className="border-dashed border-2 bg-primary/5">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <Ticket className="h-4 w-4" />
                  Have a Coupon?
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="bg-background font-mono"
                  />
                  <Button
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={isValidating || !couponCode}
                    className="font-bold"
                  >
                    {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
                {appliedCoupon && (
                  <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 p-3 rounded-lg animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex items-center gap-2 text-green-700 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      Coupon "{appliedCoupon.code}" Applied!
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-green-700 font-bold text-xs">
                        {appliedCoupon.discountType === "percentage"
                          ? `-${appliedCoupon.discountAmount}%`
                          : `-$${appliedCoupon.discountAmount}`}
                      </span>
                      <button
                        onClick={handleRemoveCoupon}
                        className="text-green-700 hover:text-green-900 transition-colors"
                        title="Remove Coupon"
                      >
                        <Tag className="h-3 w-3 rotate-180" />
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-6 opacity-40 grayscale">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg"
                alt="Visa"
                className="h-6"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg"
                alt="Mastercard"
                className="h-8"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg"
                alt="PayPal"
                className="h-6"
              />
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Order Summary</h2>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-4">
                  <div className="h-16 w-24 bg-muted rounded overflow-hidden shrink-0">
                    {course.imageUrl && (
                      <img src={course.imageUrl} className="w-full h-full object-cover" alt="" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm line-clamp-2">{course.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Lifetime Access</p>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Course Price</span>
                    <span>${basePrice.toLocaleString()}</span>
                  </div>
                  {course && (isSaleActive(course) || course.isCampaignActive) && (
                    <div className="flex justify-between text-indigo-600 text-[10px] font-bold uppercase tracking-widest">
                      <span>
                        {isSaleActive(course) ? "⚡ Flash Sale Applied" : "🤝 Partner Deal Applied"}
                      </span>
                      <span>Save ${(course.price - basePrice).toLocaleString()}</span>
                    </div>
                  )}
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600 font-medium">
                      <span>
                        Discount{" "}
                        {appliedCoupon.discountType === "percentage"
                          ? `(${appliedCoupon.discountAmount}%)`
                          : ""}
                      </span>
                      <span>
                        -$
                        {discountInfo.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span className="text-primary">
                      $
                      {finalPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 p-4 rounded-b-xl flex gap-3">
                <ShieldCheck className="h-8 w-8 text-primary shrink-0" />
                <div className="text-[10px] leading-relaxed text-muted-foreground">
                  Your purchase is protected by our <strong>30-day money-back guarantee</strong>. If
                  you're not satisfied, we'll refund your money — no questions asked.
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
