import { useEffect, useState, useRef, useCallback } from "react";

const AVATARS = [
  { name: "Botnoi", emoji: "🤖" },
  { name: "Blossom", emoji: "🌸" },
  { name: "Bocchi", emoji: "🎸" },
  { name: "Formal_outfit", emoji: "👔" },
  { name: "Kitagawa", emoji: "✨" },
  { name: "Prez", emoji: "👑" },
  { name: "Private", emoji: "🕵️" },
  { name: "sample", emoji: "📦" },
  { name: "Scientist", emoji: "🧑‍🔬" },
  { name: "TMGS", emoji: "🎮" },
  { name: "TrackField", emoji: "🏃" },
  { name: "Volley", emoji: "🏐" }
];

/**
 * WebAvatar Component — Fully SSR-Safe
 * 
 * This component must NOT use any hooks that require Router context at the 
 * module/render level (like useNavigate) because TanStack Start renders 
 * this on the server where Router context may not be available.
 * 
 * Instead, we use window.location for any navigation needs.
 */
export function WebAvatar() {
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  // Dragging state
  const [boxPos, setBoxPos] = useState({ x: 0, y: 0 });
  const [boxSize] = useState({ width: 320, height: 480 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

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
      enableBubble: "true",
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

    // Listen for navigate event (use window.location instead of useNavigate for SSR safety)
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ target: string }>;
      if (customEvent.detail && customEvent.detail.target) {
        const target = customEvent.detail.target;
        try {
          const url = new URL(target, window.location.origin);
          if (url.origin === window.location.origin) {
            window.location.href = url.pathname + url.search + url.hash;
          } else {
            window.location.href = target;
          }
        } catch {
          window.location.href = target;
        }
      }
    };

    window.addEventListener("webavatar-navigate", handleNavigate);

    // Global pointer events for dragging
    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging.current && boxRef.current) {
        const newX = e.clientX - dragStart.current.x;
        const newY = e.clientY - dragStart.current.y;
        setBoxPos({ x: newX, y: newY });
      }
    };

    const handlePointerUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.userSelect = "auto";
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("webavatar-navigate", handleNavigate);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [mounted]);

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

        // 4. อัปเดต window.ChatWidgetConfig
        if (!(window as any).ChatWidgetConfig) {
          (window as any).ChatWidgetConfig = {
            widgetId: "learn-lab",
            greetingInstruction: "",
            enableBubble: "true",
            cameraOffset: "0,0,0"
          };
        }
        (window as any).ChatWidgetConfig.mode = "realtime-fullscreen";
        (window as any).ChatWidgetConfig.container = containerRef.current;
        (window as any).ChatWidgetConfig.avatarUrl = selectedAvatar;

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

  const disableWebAvatar = useCallback(() => {
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
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      setSelectedAvatar(null);
    }, 150);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    if (!mounted) return;
    return () => {
      disableWebAvatar();
    };
  }, [mounted, disableWebAvatar]);

  const handleSelectAvatar = (avatar: string) => {
    setIsModalOpen(false);
    setSelectedAvatar(avatar);
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
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 99999,
            background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
            color: 'white',
            fontWeight: 600,
            padding: '14px 24px',
            borderRadius: '9999px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4), 0 8px 10px -6px rgba(79, 70, 229, 0.2)',
            fontSize: '14px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 15px 30px -5px rgba(79, 70, 229, 0.5), 0 10px 15px -6px rgba(79, 70, 229, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(79, 70, 229, 0.4), 0 8px 10px -6px rgba(79, 70, 229, 0.2)';
          }}
        >
          <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          เปิดใช้งานผู้ช่วย Avatar
        </button>
      )}

      {/* 2. Active State: Naked Draggable/Resizable Container */}
      {isActive && (
        <div
          ref={boxRef}
          onPointerDown={handleDragStart}
          style={{
            position: "fixed",
            left: `${boxPos.x}px`,
            top: `${boxPos.y}px`,
            width: `${boxSize.width}px`,
            height: `${boxSize.height}px`,
            zIndex: 99999,
            resize: "both",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            background: "transparent",
            cursor: "move",
            border: "1px solid transparent",
            transition: "border-color 0.2s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(107, 114, 128, 0.5)'; e.currentTarget.style.borderStyle = 'dashed'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.borderStyle = 'solid'; }}
        >
          {/* Subtle controls on hover */}
          <div style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            display: 'flex',
            gap: '8px',
            zIndex: 50,
            opacity: 0,
            transition: 'opacity 0.2s ease',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
              style={{
                width: '32px', height: '32px',
                background: 'rgba(0,0,0,0.5)', color: 'white',
                borderRadius: '50%', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)',
              }}
              title="เปลี่ยนตัวละคร"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); disableWebAvatar(); }}
              style={{
                width: '32px', height: '32px',
                background: 'rgba(239,68,68,0.8)', color: 'white',
                borderRadius: '50%', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(4px)',
              }}
              title="ปิดใช้งาน"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* WebAvatar injection container */}
          <div
            ref={containerRef}
            id="custom-avatar-box"
            style={{ flex: 1, width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: 'transparent' }}
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
                  const emoji = avatarData.emoji;
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
                      <div style={{
                        width: '80px', height: '80px', marginBottom: '16px',
                        borderRadius: '12px', overflow: 'hidden',
                        background: '#f9fafb', padding: '8px',
                        border: '1px solid #f3f4f6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '48px',
                      }}>
                        {emoji}
                      </div>

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
