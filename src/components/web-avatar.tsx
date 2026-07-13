import { useEffect, useState, useRef, useCallback } from "react";
import { Bot, RefreshCw, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

const AVATARS = [
  { name: "Botnoi", image: "/avatars/Botnoi.png" },
  { name: "Blossom", image: "/avatars/Blossom.png" },
  { name: "Bocchi", image: "/avatars/Bocchi.png" },
  { name: "Formal_outfit", image: "/avatars/Formal_outfit.png" },
  { name: "Kitagawa", image: "/avatars/Kitagawa.png" },
  { name: "Prez", image: "/avatars/Prez.png" },
  { name: "Private", image: "/avatars/Private.png" },
  { name: "sample", image: "/avatars/sample.png" },
  { name: "Scientist", image: "/avatars/Scientist.png" },
  { name: "TMGS", image: "/avatars/TMGS.png" },
  { name: "TrackField", image: "/avatars/TrackField.png" },
  { name: "Volley", image: "/avatars/Volley.png" }
];

/**
 * WebAvatar Component — SPA Optimized
 * Uses TanStack Router for navigation to prevent hard reloads that disconnect WebAudio.
 */
export function WebAvatar() {
  const navigate = useNavigate({ strict: false });
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  // Restore avatar from localStorage after mount
  useEffect(() => {
    if (mounted) {
      const savedAvatar = localStorage.getItem("webavatar_selected");
      if (savedAvatar) {
        setSelectedAvatar(savedAvatar);
      }
    }
  }, [mounted]);

  // Dragging & Resizing state
  const [boxPos, setBoxPos] = useState({ x: 0, y: 0 });
  const [boxSize, setBoxSize] = useState({ width: 320, height: 480 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const isResizing = useRef(false);
  const resizeStart = useRef({ w: 0, h: 0, x: 0, y: 0 });
  const rafId = useRef<number | null>(null);

  // Ref for the React Component Lifecycle
  const containerRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // CRITICAL: Only render on client side. This prevents SSR hydration issues.
  useEffect(() => {
    setMounted(true);

    // Define default window config (from friend's code)
    (window as any).ChatWidgetConfig = {
      mode: "realtime-widget",
      widgetId: "learn-lab",
      avatarUrl: "Botnoi",
      greetingInstruction: "กรุณาทักทายผู้ใช้เป็นภาษาไทย ด้วยน้ำเสียงอบอุ่น เป็นมิตร และพูดสั้นกระชับ",
      enableBubble: "false",
      showBubble: false,
      showText: false,
      cameraOffset: "0,0,0"
    };
  }, []);
  // Set initial position + global event listeners (client-only)
  useEffect(() => {
    if (!mounted) return;

    // Set initial position to bottom-right corner
    setBoxPos({
      x: window.innerWidth - 320 - 20,
      y: window.innerHeight - 480 - 20
    });

    // Listen for navigate event (use SPA routing to prevent WebAudio disconnect)
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ target: string }>;
      if (customEvent.detail && customEvent.detail.target) {
        const target = customEvent.detail.target;
        try {
          const url = new URL(target, window.location.origin);
          if (url.origin === window.location.origin) {
            navigate({ to: url.pathname + url.search + url.hash as any });
          } else {
            window.location.href = target;
          }
        } catch {
          window.location.href = target;
        }
      }
    };

    window.addEventListener("webavatar-navigate", handleNavigate);

    // Global pointer events for dragging and resizing (120FPS Optimized with requestAnimationFrame)
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current && !isResizing.current) return;
      
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      
      rafId.current = requestAnimationFrame(() => {
        if (isDragging.current && boxRef.current) {
          const newX = e.clientX - dragStart.current.x;
          const newY = e.clientY - dragStart.current.y;
          
          // Direct DOM update (no React re-render)
          boxRef.current.style.left = `${newX}px`;
          boxRef.current.style.top = `${newY}px`;
          
        } else if (isResizing.current && boxRef.current) {
          const newW = Math.max(resizeStart.current.w + (e.clientX - resizeStart.current.x), 200);
          const newH = Math.max(resizeStart.current.h + (e.clientY - resizeStart.current.y), 300);
          
          // Direct DOM update (no React re-render)
          boxRef.current.style.width = `${newW}px`;
          boxRef.current.style.height = `${newH}px`;
        }
      });
    };

    const handlePointerUp = () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
      if (isDragging.current && boxRef.current) {
        isDragging.current = false;
        document.body.style.userSelect = "auto";
        // Sync final position to state
        setBoxPos({ 
          x: parseInt(boxRef.current.style.left || "0", 10), 
          y: parseInt(boxRef.current.style.top || "0", 10) 
        });
      }
      
      if (isResizing.current && boxRef.current) {
        isResizing.current = false;
        document.body.style.userSelect = "auto";
        // Sync final size to state
        setBoxSize({ 
          width: parseInt(boxRef.current.style.width || "0", 10), 
          height: parseInt(boxRef.current.style.height || "0", 10) 
        });
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("webavatar-navigate", handleNavigate);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [mounted, navigate]);

  // Strict React Way: Handle Avatar Selection Lifecycle
  useEffect(() => {
    if (!mounted || !selectedAvatar || !containerRef.current) return;

    const initAvatar = () => {
      // 1. ตรวจสอบและเคลียร์ของเก่า
      if ((window as any).WebAvatar) {
        try {
          (window as any).WebAvatar.disconnect();
        } catch (e) {
          console.error("Failed to disconnect WebAvatar:", e);
        }
      }

      // หน่วงเวลาให้ disconnect ทำงานเสร็จ
      setTimeout(() => {
        // ล้าง Global Objects ที่ขัดขวางการโหลดซ้ำทั้งหมด (CRITICAL FIX)
        const widgetGlobals = [
          "WebAvatar",
          "__bcwInitialized",
          "BotnoiChatWidget",
          "BotnoiLiveProvider"
        ];
        widgetGlobals.forEach(g => delete (window as any)[g]);

        Object.keys(window).forEach(k => {
          if (k.startsWith("webpackChunk")) delete (window as any)[k];
        });

        // 2. ลบ Script tag เดิมออกจาก DOM
        document.querySelectorAll('script[src*="chat-widget.js"]').forEach(s => s.remove());

        // 3. ล้าง DOM ภายใน
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }

        // 4. อัปเดต window.ChatWidgetConfig (บังคับเซ็ตใหม่ทุกครั้งป้องกันบั๊กลืม Context แล้วพูดจีน)
        (window as any).ChatWidgetConfig = {
          mode: "realtime-fullscreen",
          widgetId: "learn-lab",
          avatarUrl: selectedAvatar,
          greetingInstruction: "กรุณาทักทายผู้ใช้เป็นภาษาไทย ด้วยน้ำเสียงอบอุ่น เป็นมิตร และพูดสั้นกระชับ",
          enableBubble: "false",
          showBubble: false,
          showText: false,
          cameraOffset: "0,0,0",
          container: containerRef.current
        };

        // 5. สร้างและ append tag script ใหม่ พร้อม Cache Buster
        const script = document.createElement("script");
        script.id = `webavatar-jssdk-${Date.now()}`;
        script.src = `https://webavatar.didthat.cc/chat-widget.js?t=${Date.now()}`;
        script.async = true;
        document.body.appendChild(script);
      }, 150);
    };

    initAvatar();
  }, [mounted, selectedAvatar]);

  const cleanupScript = useCallback(() => {
    if ((window as any).WebAvatar) {
      try {
        (window as any).WebAvatar.disconnect();
      } catch (e) {
        console.error("Failed to disconnect WebAvatar:", e);
      }
    }
    setTimeout(() => {
      const widgetGlobals = ["WebAvatar", "__bcwInitialized", "BotnoiChatWidget", "BotnoiLiveProvider"];
      widgetGlobals.forEach(g => delete (window as any)[g]);
      document.querySelectorAll('script[src*="chat-widget.js"]').forEach(s => s.remove());
    }, 150);
  }, []);

  const disableWebAvatar = useCallback(() => {
    cleanupScript();
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      setSelectedAvatar(null);
      localStorage.removeItem("webavatar_selected");
    }, 150);
  }, [cleanupScript]);

  // Cleanup on unmount (Don't clear localStorage or state here, just script)
  useEffect(() => {
    if (!mounted) return;
    return () => {
      cleanupScript();
    };
  }, [mounted, cleanupScript]);

  const handleSelectAvatar = (avatar: string) => {
    setIsModalOpen(false);
    setSelectedAvatar(avatar);
    localStorage.setItem("webavatar_selected", avatar);
  };

  const handleDragStart = (e: React.PointerEvent) => {
    // Only start drag if it's the primary button and not clicking a control button
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'button' || target.closest('button')) {
      return;
    }
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - boxPos.x,
      y: e.clientY - boxPos.y
    };
    document.body.style.userSelect = "none";
  };

  const isActive = selectedAvatar !== null;

  // SSR Guard: Return null on server, render only on client
  if (!mounted) return null;

  return (
    <>
      <style>{`
        /* Force canvas inside custom-avatar-box to be transparent */
        #custom-avatar-box canvas {
          background: transparent !important;
        }
      `}</style>

      {/* 1. Initial State: Show "เปิดใช้งานผู้ช่วย Avatar" only when script is NOT loaded */}
      {!isActive && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="fixed bottom-6 right-6 z-[99999] flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm transition-all duration-300 shadow-xl shadow-teal-500/20 hover:-translate-y-1 bg-gradient-to-r from-teal-400 to-emerald-500 hover:shadow-teal-500/40"
        >
          <Bot className="w-5 h-5" />
          เปิดใช้งานผู้ช่วย Avatar
        </button>
      )}

      {/* 2. Active State: Naked Draggable/Resizable Container */}
      {isActive && (
        <div
          ref={boxRef}
          onPointerDown={handleDragStart}
          className="group"
          style={{
            position: "fixed",
            left: `${boxPos.x}px`,
            top: `${boxPos.y}px`,
            width: `${boxSize.width}px`,
            height: `${boxSize.height}px`,
            zIndex: 99999,
            overflow: "visible",
            display: "flex",
            flexDirection: "column",
            background: "transparent",
            cursor: "move",
            willChange: "left, top, width, height", // Force GPU Acceleration
          }}
        >
          {/* Canva-style Wrapper and Handles */}
          <div className="absolute inset-0 border border-indigo-400 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-indigo-400 rounded-full" />
            <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-indigo-400 rounded-full" />
            <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-indigo-400 rounded-full" />
            
            {/* Custom Resize Handle (Bottom Right) */}
            <div 
              onPointerDown={(e) => {
                e.stopPropagation();
                isResizing.current = true;
                resizeStart.current = {
                  w: boxSize.width,
                  h: boxSize.height,
                  x: e.clientX,
                  y: e.clientY
                };
                document.body.style.userSelect = "none";
              }}
              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-indigo-400 rounded-full cursor-nwse-resize pointer-events-auto" 
            />
          </div>

          {/* Floating Toolbar (Horizontal) */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex flex-row items-center gap-2 bg-white px-2 py-1 rounded-md shadow-sm border border-slate-200 opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
            <button
              onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
              className="flex flex-row items-center gap-1.5 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-md transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> เปลี่ยนอวตาร
            </button>
            <div className="w-px h-3.5 bg-slate-200" />
            <button
              onClick={(e) => { e.stopPropagation(); disableWebAvatar(); }}
              className="flex flex-row items-center gap-1.5 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" /> ปิดใช้งาน
            </button>
          </div>

          {/* Force hide Speech Bubble just in case config fails */}
          <style>{`
            [class*="bubble" i], [class*="speech" i] {
               display: none !important;
            }
          `}</style>

          {/* WebAvatar injection container */}
          <div
            ref={containerRef}
            id="custom-avatar-box"
            style={{ flex: 1, width: '100%', height: '100%', position: 'relative', overflow: 'visible', background: 'transparent' }}
          />
        </div>
      )}

      {/* 3. Modal: Avatar Selection Grid */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            width: '100%',
            maxWidth: '720px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh',
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #f3f4f6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fafbfc',
            }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937', margin: 0 }}>
                  เลือกผู้ช่วย Avatar ของคุณ
                </h2>
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>คลิกที่ตัวละครเพื่อเริ่มการสนทนาได้ทันที</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  color: '#9ca3af', padding: '8px', borderRadius: '50%',
                  border: 'none', cursor: 'pointer', background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '16px',
              }}>
                {AVATARS.map((avatarData) => {
                  const avatar = avatarData.name;
                  const image = avatarData.image;
                  const isSelected = selectedAvatar === avatar;

                  return (
                    <button
                      key={avatar}
                      onClick={() => handleSelectAvatar(avatar)}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        borderRadius: '16px',
                        border: `2px solid ${isSelected ? '#6366f1' : '#f3f4f6'}`,
                        background: isSelected ? '#eef2ff' : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 4px 15px -3px rgba(99, 102, 241, 0.3)' : 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#a5b4fc';
                          e.currentTarget.style.boxShadow = '0 4px 15px -3px rgba(0,0,0,0.1)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#f3f4f6';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      <img 
                        src={image} 
                        alt={avatar} 
                        className="w-full h-28 object-contain mx-auto mb-4" 
                      />

                      <span style={{
                        fontSize: '14px', fontWeight: 700,
                        color: isSelected ? '#4338ca' : '#374151',
                      }}>
                        {avatar}
                      </span>

                      {isSelected && (
                        <div style={{
                          position: 'absolute', top: '12px', right: '12px',
                          color: 'white', background: '#6366f1',
                          borderRadius: '50%', width: '20px', height: '20px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
