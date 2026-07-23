import { useEffect, useState, useRef, useCallback } from "react";
import { Bot, RefreshCw, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { pushDebugLog } from "@/lib/debug";

const AVATARS = [
  { name: "Botnoi", image: "/avatars/Botnoi.png", widgetId: "learn-lab" },
  { name: "Blossom", image: "/avatars/Blossom.png", widgetId: "learn-lab-blossom" },
  { name: "Bocchi", image: "/avatars/Bocchi.png", widgetId: "learn-lab-bocchi" },
  { name: "Formal_outfit", image: "/avatars/Formal_outfit.png", widgetId: "learn-lab-tuxedo" },
  { name: "Kitagawa", image: "/avatars/Kitagawa.png", widgetId: "learn-lab-girl" },
  { name: "Prez", image: "/avatars/Prez.png", widgetId: "learn-lab-girl" },
  { name: "Private", image: "/avatars/Private.png", widgetId: "learn-lab-girl" },
  { name: "sample", image: "/avatars/sample.png", widgetId: "learn-lab-girl-purple" },
  { name: "Scientist", image: "/avatars/Scientist.png", widgetId: "learn-lab-uncle" },
  { name: "TMGS", image: "/avatars/TMGS.png", widgetId: "learn-lab-TMGS" },
  { name: "TrackField", image: "/avatars/TrackField.png", widgetId: "learn-lab-TrackField" },
  { name: "Volley", image: "/avatars/Volley.png", widgetId: "learn-lab-Volley" }
];

/**
 * WebAvatar Component — SPA Optimized
 * Uses TanStack Router for navigation to prevent hard reloads that disconnect WebAudio.
 */
export function WebAvatar() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [isAvatarEnabled, setIsAvatarEnabled] = useState(false);

  // Restore avatar from localStorage after mount
  useEffect(() => {
    pushDebugLog(`<WebAvatar /> mounted, initial isModalOpen: ${isModalOpen}, selectedAvatar: ${selectedAvatar}`);
    if (mounted) {
      const savedAvatar = localStorage.getItem("webavatar_selected");
      const isActive = sessionStorage.getItem("webavatar_active_session");
      // อวตารต้องไม่เปิดเองในครั้งแรก ต้องรอผู้ใช้กดเปิด (isActive === "true")
      if (savedAvatar && isActive === "true") {
        setSelectedAvatar(savedAvatar);
        setIsAvatarEnabled(true);
      }
    }
    return () => {
      pushDebugLog(`<WebAvatar /> unmounted!`);
    };
  }, [mounted]);

  // Dragging & Resizing state
  const [boxPos, setBoxPos] = useState({ x: 0, y: 0 });
  const [boxSize, setBoxSize] = useState({ width: 320, height: 480 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const isResizing = useRef(false);
  const resizeStart = useRef({ w: 0, h: 0, x: 0, y: 0 });

  // Ref for the React Component Lifecycle
  const containerRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // --- CONNECTION TRACKERS FOR FORCE CLEANUP ---
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).__rtcTrackerInstalled) {
      (window as any).__rtcTrackerInstalled = true;
      (window as any).__activeRTCs = new Set();
      (window as any).__activeSockets = new Set();
      (window as any).__activeMediaStreams = new Set();
      
      // 1. Track WebRTC
      const OriginalRTC = window.RTCPeerConnection;
      if (OriginalRTC) {
        class TrackedRTC extends OriginalRTC {
          constructor(...args: any[]) {
            super(...(args as [any]));
            (window as any).__activeRTCs.add(this);
            this.addEventListener('iceconnectionstatechange', () => {
              if (this.iceConnectionState === 'closed' || this.iceConnectionState === 'failed') {
                (window as any).__activeRTCs.delete(this);
              }
            });
          }
        }
        window.RTCPeerConnection = TrackedRTC as any;
      }

      // 2. Track WebSocket (Exclude local dev servers like Vite HMR)
      const OriginalWebSocket = window.WebSocket;
      class TrackedWebSocket extends OriginalWebSocket {
        constructor(...args: any[]) {
          super(...(args as [any]));
          const url = args[0]?.toString() || '';
          if (!url.includes('localhost') && !url.includes('127.0.0.1') && !url.includes('192.168')) {
            (window as any).__activeSockets.add(this);
            this.addEventListener('close', () => {
              (window as any).__activeSockets.delete(this);
            });
          }
        }
      }
      window.WebSocket = TrackedWebSocket as any;

      // 3. Track MediaStreams (Microphone/Camera)
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = async (constraints) => {
          try {
            const stream = await originalGetUserMedia(constraints);
            (window as any).__activeMediaStreams.add(stream);
            return stream;
          } catch (e) {
            throw e;
          }
        };
      }
    }
  }, []);
  // ---------------------------------------------

  // --- TEMPORARY LOGGING INTERCEPTORS ---
  useEffect(() => {
    // Intercept fetch for token
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] && (args[0] as Request).url ? (args[0] as Request).url : '');
      if (url.includes('generateavatartoken') || url.includes('token')) {
        const timestamp = new Date().toISOString();
        const widgetConfig = (window as any).ChatWidgetConfig;
        const widgetId = widgetConfig ? widgetConfig.widgetId : 'unknown';
        pushDebugLog(`[DEBUG-TOKEN] Token request started at ${timestamp}`, { widgetId, url });
        try {
          const res = await originalFetch.apply(this, args);
          const clonedRes = res.clone();
          const text = await clonedRes.text();
          pushDebugLog(`[DEBUG-TOKEN] Token response at ${new Date().toISOString()}`, { status: res.status, body: text });
          return res;
        } catch (e) {
          pushDebugLog(`[DEBUG-TOKEN] Token request error`, e);
          throw e;
        }
      }
      return originalFetch.apply(this, args);
    };

    // Intercept clicks on call button
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Class name based on chat-widget.js minified strings or common keywords
      if (target.closest('.bcw-rt-call-btn-wrap') || target.closest('.bcw-rt-call-btn') || target.closest('[id*="call"]')) {
        pushDebugLog(`[DEBUG-CLICK] Call button clicked at ${new Date().toISOString()}`);
      }
    };
    document.addEventListener('click', handleGlobalClick, true);

    return () => {
      window.fetch = originalFetch;
      document.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);
  // --------------------------------------

  // CRITICAL: Only render on client side. This prevents SSR hydration issues.
  useEffect(() => {
    setMounted(true);

    // Define default window config (from friend's code)
    (window as any).ChatWidgetConfig = {
      mode: "realtime-widget",
      widgetId: "learn-lab",
      avatarUrl: "Botnoi",
      greetingInstruction: "คุณคือผู้ช่วยของแพลตฟอร์มการเรียนรู้ \nหน้าที่คือแนะนำการใช้งาน \nให้ตอบสั้นๆกระชับและสุภาพ",
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
      e.preventDefault();
      e.stopPropagation();
      if (e.stopImmediatePropagation) {
        e.stopImmediatePropagation();
      }

      const customEvent = e as CustomEvent<any>;
      pushDebugLog(`webavatar-navigate event received`, customEvent.detail);

      if (customEvent.detail && customEvent.detail.target) {
        const target = customEvent.detail.target;
        try {
          const url = new URL(target, window.location.origin);
          pushDebugLog(`Calling navigate() to: ${url.pathname}`);
          navigate({ to: url.pathname as any });
        } catch (err) {
          pushDebugLog(`Calling navigate() to fallback: ${target}`);
          navigate({ to: target as any });
        }
      }
    };

    window.addEventListener("webavatar-navigate", handleNavigate, { capture: true });

    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging.current) {
        setBoxPos({
          x: e.clientX - dragStart.current.x,
          y: e.clientY - dragStart.current.y
        });
      } else if (isResizing.current) {
        const newWidth = Math.max(280, resizeStart.current.w - (e.clientX - resizeStart.current.x));
        const newHeight = Math.max(320, resizeStart.current.h - (e.clientY - resizeStart.current.y));

        setBoxSize({ width: newWidth, height: newHeight });
        setBoxPos(prev => ({
          x: prev.x + (boxSize.width - newWidth),
          y: prev.y + (boxSize.height - newHeight)
        }));
      }
    };

    const handlePointerUp = () => {
      isDragging.current = false;
      isResizing.current = false;
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("webavatar-navigate", handleNavigate, { capture: true });
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [mounted, navigate, boxSize.width, boxSize.height]);

  // Strict React Way: Handle Avatar Selection Lifecycle (as per Section 2 of Integration Guide)
  useEffect(() => {
    pushDebugLog(`Avatar selection state evaluated:`, { selectedAvatar, isAvatarEnabled, mounted });

    if (!mounted || !isAvatarEnabled || !selectedAvatar || !containerRef.current) {
      return;
    }

    let isCancelled = false;

    const initAvatar = () => {
      if (isCancelled) return;
      
      pushDebugLog(`[DEBUG-INIT] initAvatar() called at ${new Date().toISOString()} for: ${selectedAvatar}`);
      
      // 1. ล้าง DOM เก่าทิ้ง
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }

      // 2. ล้าง Script tag ตัวเก่า และ Global Objects เพื่อให้สคริปต์โหลดใหม่ได้สมบูรณ์
      document.getElementById('webavatar-jssdk')?.remove();
      const widgetGlobals = ["WebAvatar", "__bcwInitialized", "BotnoiChatWidget", "BotnoiLiveProvider"];
      widgetGlobals.forEach(g => delete (window as any)[g]);
      Object.keys(window).forEach(k => {
        if (k.startsWith("webpackChunk")) delete (window as any)[k];
      });

      // 3. สร้างคอนฟิกใหม่  window.ChatWidgetConfig
      const avatarConfig = AVATARS.find(a => a.name === selectedAvatar);
      (window as any).ChatWidgetConfig = {
        mode: "realtime-fullscreen",
        widgetId: avatarConfig?.widgetId || "learn-lab",
        avatarUrl: selectedAvatar,
        greetingInstruction: "คุณคือผู้ช่วยของแพลตฟอร์มการเรียนรู้ \nหน้าที่คือแนะนำการใช้งาน \nให้ตอบสั้นๆกระชับและสุภาพ",
        enableBubble: "false",
        showBubble: false,
        showText: false,
        cameraOffset: "0,0,0",
        container: containerRef.current
      };

      // 4. โหลดสคริปต์ใหม่ ตามคู่มือ Section 2 (ไม่ใช้ Date.now() cache buster เพื่อลดปัญหา script ซ้ำซ้อน)
      const script = document.createElement("script");
      script.id = 'webavatar-jssdk';
      script.src = 'https://webavatar.didthat.cc/chat-widget.js';
      script.async = true;
      pushDebugLog(`[DEBUG-INJECT] Injecting chat-widget.js script tag`);
      document.body.appendChild(script);
    };

    // หน่วงเวลาเล็กน้อยให้ teardown ของรอบก่อนหน้าทำงานให้เสร็จก่อนสร้างตัวใหม่
    const timer = setTimeout(initAvatar, 300);

    // Teardown: เรียก disconnect() และบังคับตัดการเชื่อมต่อทั้งหมด ตอนเปลี่ยน avatar หรือ unmount
    return () => {
      isCancelled = true;
      clearTimeout(timer);

      // 1. Official disconnect
      if ((window as any).WebAvatar) {
        try {
          pushDebugLog(`[DEBUG-TEARDOWN] window.WebAvatar.disconnect() called`);
          (window as any).WebAvatar.disconnect();
        } catch (e) {
          console.error("Failed to disconnect WebAvatar:", e);
        }
      }

      // 2. Undocumented fallback disconnects
      try { (window as any).BotnoiChatWidget?.endCall?.(); } catch(e) {}
      try { (window as any).BotnoiLiveProvider?.disconnect?.(); } catch(e) {}

      // 3. Force Kill WebRTC Connections
      if ((window as any).__activeRTCs) {
        (window as any).__activeRTCs.forEach((pc: RTCPeerConnection) => {
          try { pc.close(); } catch(e) {}
        });
        (window as any).__activeRTCs.clear();
      }

      // 4. Force Kill WebSockets
      if ((window as any).__activeSockets) {
        (window as any).__activeSockets.forEach((ws: WebSocket) => {
          try { ws.close(); } catch(e) {}
        });
        (window as any).__activeSockets.clear();
      }

      // 5. Force Stop Media Elements and Microphone
      document.querySelectorAll('audio, video').forEach(m => {
        const media = m as HTMLMediaElement;
        media.pause();
        media.srcObject = null;
        media.remove();
      });

      if ((window as any).__activeMediaStreams) {
        (window as any).__activeMediaStreams.forEach((stream: MediaStream) => {
          stream.getTracks().forEach(track => {
            try { track.stop(); track.enabled = false; } catch(e) {}
          });
        });
        (window as any).__activeMediaStreams.clear();
      }
    };
  }, [mounted, isAvatarEnabled, selectedAvatar]);

  const cleanupScript = useCallback(() => {
    pushDebugLog(`cleanupScript() started`);
    if ((window as any).WebAvatar) {
      try {
        pushDebugLog(`window.WebAvatar.disconnect() called by cleanupScript`);
        (window as any).WebAvatar.disconnect();
      } catch (e) {
        console.error("Failed to disconnect WebAvatar:", e);
      }
    }
    
    // Force Kill All Connections
    try { (window as any).BotnoiChatWidget?.endCall?.(); } catch(e) {}
    if ((window as any).__activeRTCs) {
      (window as any).__activeRTCs.forEach((pc: RTCPeerConnection) => { try { pc.close(); } catch(e) {} });
      (window as any).__activeRTCs.clear();
    }
    if ((window as any).__activeSockets) {
      (window as any).__activeSockets.forEach((ws: WebSocket) => { try { ws.close(); } catch(e) {} });
      (window as any).__activeSockets.clear();
    }
    document.querySelectorAll('audio, video').forEach(m => {
      const media = m as HTMLMediaElement;
      media.pause();
      media.srcObject = null;
      media.remove();
    });
    
    if ((window as any).__activeMediaStreams) {
      (window as any).__activeMediaStreams.forEach((stream: MediaStream) => {
        stream.getTracks().forEach(track => {
          try { track.stop(); track.enabled = false; } catch(e) {}
        });
      });
      (window as any).__activeMediaStreams.clear();
    }

    setTimeout(() => {
      const widgetGlobals = ["WebAvatar", "__bcwInitialized", "BotnoiChatWidget", "BotnoiLiveProvider"];
      widgetGlobals.forEach(g => delete (window as any)[g]);
      document.getElementById('webavatar-jssdk')?.remove();
    }, 300); // Allow more time for WebRTC to cleanly disconnect
  }, []);

  const disableWebAvatar = useCallback(() => {
    pushDebugLog(`disableWebAvatar() started`);
    setIsAvatarEnabled(false);
    cleanupScript();
    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      setSelectedAvatar(null);
      // เราเก็บ webavatar_selected ไว้ เผื่อเปิดใหม่จะได้จำตัวล่าสุด
      sessionStorage.removeItem("webavatar_active_session");
    }, 150);
  }, [cleanupScript]);

  useEffect(() => {
    if (!mounted) return;
    return () => {
      // ไม่เรียก cleanupScript() ตอน unmount เพื่อป้องกันเสียงถูกตัดเวลาเปลี่ยนหน้า SPA
    };
  }, [mounted]);

  const handleSelectAvatar = (avatar: string) => {
    setIsModalOpen(false);
    setIsAvatarEnabled(true);
    sessionStorage.setItem("webavatar_active_session", "true");
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
