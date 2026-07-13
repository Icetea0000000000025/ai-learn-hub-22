import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { ParticleBackground } from "./ui/particle-background";

export function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col relative">
      <ParticleBackground />
      <div className="sticky top-0 z-50 w-full flex flex-col">
        <SiteHeader />
      </div>
      <main className="flex-1 relative z-10 overflow-x-hidden">{children}</main>
      <SiteFooter />
    </div>
  );
}
