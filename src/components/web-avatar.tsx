import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@tanstack/react-router";

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
  { name: "Volley", emoji: "🏐" },
];

const WEB_AVATAR_SCRIPT_ID = "webavatar-jssdk";
const WEB_AVATAR_SCRIPT_URL = "https://webavatar.didthat.cc/chat-widget.js";

type WebAvatarApi = {
  connect?: () => void | Promise<void>;
  disconnect?: () => void | Promise<void>;
};

declare global {
  interface Window {
    ChatWidgetConfig?: {
      mode: string;
      widgetId: string;
      avatarUrl: string;
      greetingInstruction: string;
      enableBubble: string;
      cameraOffset: string;
      container?: HTMLElement | null;
    };
    WebAvatar?: WebAvatarApi;
    __bcwInitialized?: unknown;
    BotnoiChatWidget?: unknown;
    BotnoiLiveProvider?: unknown;
  }
}

/**
 * WebAvatar Component — SSR-safe
 *
 * หลักการแก้ปัญหา Avatar หยุดทำงาน:
 * - ไม่ลบ webpackChunk หรือ runtime ของเว็บไซต์
 * - ป้องกันการโหลด SDK ซ้ำหลายตัวพร้อมกัน
 * - ยกเลิก timer เก่าก่อน restart ทุกครั้ง
 * - reconnect เมื่อกลับมาออนไลน์หรือกลับมาที่แท็บ
 * - cleanup เฉพาะทรัพยากรของ WebAvatar
 */
export function WebAvatar() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  // Dragging state
  const [boxPos, setBoxPos] = useState({ x: 0, y: 0 });
  const [boxSize] = useState({ width: 320, height: 480 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Avatar refs
  const containerRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const operationIdRef = useRef(0);
  const selectedAvatarRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    selectedAvatarRef.current = selectedAvatar;
  }, [selectedAvatar]);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const removeAvatarScript = useCallback(() => {
    const scripts = document.querySelectorAll<HTMLScriptElement>(
      `script[src*="webavatar.didthat.cc/chat-widget.js"]`,
    );

    scripts.forEach((script) => script.remove());
    scriptRef.current = null;
  }, []);

  const clearKnownAvatarGlobals = useCallback(() => {
    // ลบเฉพาะ global ของ WebAvatar เท่านั้น
    // ห้ามลบ webpackChunk เพราะอาจทำให้ตัวเว็บไซต์พัง
    delete window.WebAvatar;
    delete window.__bcwInitialized;
    delete window.BotnoiChatWidget;
    delete window.BotnoiLiveProvider;
  }, []);

  const disconnectAvatar = useCallback(async () => {
    try {
      await window.WebAvatar?.disconnect?.();
    } catch (error) {
      console.warn("WebAvatar disconnect failed:", error);
    }
  }, []);

  const clearAvatarContainer = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.replaceChildren();
    }
  }, []);

  const setAvatarConfig = useCallback((avatar: string) => {
    window.ChatWidgetConfig = {
      mode: "realtime-fullscreen",
      widgetId: "learn-lab",
      avatarUrl: avatar,
      greetingInstruction:
        "กรุณาทักทายผู้ใช้เป็นภาษาไทย ด้วยน้ำเสียงอบอุ่น เป็นมิตร และพูดสั้นกระชับ",
      enableBubble: "true",
      cameraOffset: "0,0,0",
      container: containerRef.current,
    };
  }, []);

  const appendAvatarScript = useCallback(
    (operationId: number) => {
      if (!containerRef.current) return;

      // ป้องกัน script ซ้ำ
      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[src*="webavatar.didthat.cc/chat-widget.js"]`,
      );

      if (existingScript) {
        scriptRef.current = existingScript;
        return;
      }

      const script = document.createElement("script");
      script.id = WEB_AVATAR_SCRIPT_ID;
      script.src = WEB_AVATAR_SCRIPT_URL;
      script.async = true;

      script.onload = () => {
        if (operationId !== operationIdRef.current) return;
        console.info("WebAvatar SDK loaded successfully");
      };

      script.onerror = () => {
        if (operationId !== operationIdRef.current) return;
        console.error("Unable to load WebAvatar SDK");
      };

      scriptRef.current = script;
      document.body.appendChild(script);
    },
    [],
  );

  const startAvatar = useCallback(
    (avatar: string) => {
      if (!containerRef.current) return;

      const operationId = ++operationIdRef.current;
      setAvatarConfig(avatar);
      appendAvatarScript(operationId);
    },
    [appendAvatarScript, setAvatarConfig],
  );

  const restartAvatar = useCallback(
    async (avatar: string) => {
      if (!containerRef.current) return;

      clearRestartTimer();
      const operationId = ++operationIdRef.current;

      await disconnectAvatar();

      // หากมีคำสั่ง restart ใหม่เข้ามาระหว่างรอ ให้หยุดคำสั่งเก่า
      if (operationId !== operationIdRef.current) return;

      removeAvatarScript();
      clearKnownAvatarGlobals();
      clearAvatarContainer();

      restartTimerRef.current = window.setTimeout(() => {
        if (
          operationId !== operationIdRef.current ||
          !containerRef.current ||
          selectedAvatarRef.current !== avatar
        ) {
          return;
        }

        setAvatarConfig(avatar);
        appendAvatarScript(operationId);
        restartTimerRef.current = null;
      }, 350);
    },
    [
      appendAvatarScript,
      clearAvatarContainer,
      clearKnownAvatarGlobals,
      clearRestartTimer,
      disconnectAvatar,
      removeAvatarScript,
      setAvatarConfig,
    ],
  );

  const reconnectAvatar = useCallback(async () => {
    const avatar = selectedAvatarRef.current;
    if (!avatar || !containerRef.current) return;

    try {
      if (window.WebAvatar?.connect) {
        setAvatarConfig(avatar);
        await window.WebAvatar.connect();
        return;
      }
    } catch (error) {
      console.warn("WebAvatar reconnect failed; restarting SDK:", error);
    }

    await restartAvatar(avatar);
  }, [restartAvatar, setAvatarConfig]);

  const disableWebAvatar = useCallback(async () => {
    clearRestartTimer();
    ++operationIdRef.current;

    await disconnectAvatar();
    removeAvatarScript();
    clearKnownAvatarGlobals();
    clearAvatarContainer();

    selectedAvatarRef.current = null;
    setSelectedAvatar(null);
  }, [
    clearAvatarContainer,
    clearKnownAvatarGlobals,
    clearRestartTimer,
    disconnectAvatar,
    removeAvatarScript,
  ]);

  // Initial position + global event listeners
  useEffect(() => {
    if (!mounted) return;

    setBoxPos({
      x: Math.max(0, window.innerWidth - boxSize.width - 20),
      y: Math.max(0, window.innerHeight - boxSize.height - 20),
    });

    const handleNavigate = (event: Event) => {
      event.preventDefault();

      const customEvent = event as CustomEvent<{ target?: string }>;
      const target = customEvent.detail?.target;

      if (!target) {
        console.warn("WebAvatar navigation target is missing");
        return;
      }

      try {
        const url = new URL(target, window.location.origin);

        if (url.origin === window.location.origin) {
          const internalPath = `${url.pathname}${url.search}${url.hash}`;

          router.history.push(internalPath);
          return;
        }

        window.location.assign(target);
      } catch (error) {
        console.error("Avatar navigation failed:", error);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDragging.current || !boxRef.current) return;

      const maxX = Math.max(0, window.innerWidth - boxRef.current.offsetWidth);
      const maxY = Math.max(0, window.innerHeight - boxRef.current.offsetHeight);

      const newX = Math.min(
        maxX,
        Math.max(0, event.clientX - dragStart.current.x),
      );
      const newY = Math.min(
        maxY,
        Math.max(0, event.clientY - dragStart.current.y),
      );

      setBoxPos({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
      if (!isDragging.current) return;

      isDragging.current = false;
      document.body.style.userSelect = "auto";
    };

    window.addEventListener("webavatar-navigate", handleNavigate, {
      capture: true,
    });
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("webavatar-navigate", handleNavigate, {
        capture: true,
      });
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      document.body.style.userSelect = "auto";
    };
  }, [boxSize.height, boxSize.width, mounted, router]);

  // Start/restart when the user selects an avatar
  useEffect(() => {
    if (!mounted || !selectedAvatar || !containerRef.current) return;

    void restartAvatar(selectedAvatar);
  }, [mounted, restartAvatar, selectedAvatar]);

  // ซ่อน Subtitle/Caption ที่ WebAvatar SDK สร้างขึ้น
  useEffect(() => {
    if (!mounted || !selectedAvatar || !containerRef.current) return;
    const container = document.body;

    const hideSubtitle = () => {
      const selectors = [
        '[class*="subtitle" i]',
        '[class*="caption" i]',
        '[class*="transcript" i]',
        '[class*="speech-bubble" i]',
        '[class*="message-bubble" i]',
        '[id*="subtitle" i]',
        '[id*="caption" i]',
        '[id*="transcript" i]',
        '[aria-live="polite"]',
        '[aria-live="assertive"]',
      ];

      container.querySelectorAll<HTMLElement>(selectors.join(",")).forEach(
        (element) => {
          element.style.setProperty("display", "none", "important");
          element.style.setProperty("visibility", "hidden", "important");
          element.style.setProperty("opacity", "0", "important");
          element.style.setProperty("pointer-events", "none", "important");
        },
      );
    };

    hideSubtitle();

    const observer = new MutationObserver(() => {
      hideSubtitle();
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [mounted, selectedAvatar]);

  // Recover after internet reconnection or returning to the tab
  useEffect(() => {
    if (!mounted) return;

    const handleOnline = () => {
      if (selectedAvatarRef.current) {
        void reconnectAvatar();
      }
    };

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        selectedAvatarRef.current
      ) {
        void reconnectAvatar();
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [mounted, reconnectAvatar]);

  // Final cleanup when the component unmounts
  useEffect(() => {
    if (!mounted) return;

    return () => {
      clearRestartTimer();
      ++operationIdRef.current;

      void disconnectAvatar();
      removeAvatarScript();
      clearKnownAvatarGlobals();
      clearAvatarContainer();
    };
  }, [
    clearAvatarContainer,
    clearKnownAvatarGlobals,
    clearRestartTimer,
    disconnectAvatar,
    mounted,
    removeAvatarScript,
  ]);

  const handleSelectAvatar = (avatar: string) => {
    setIsModalOpen(false);

    // เลือกตัวเดิมอีกครั้ง = สั่ง reconnect
    if (selectedAvatarRef.current === avatar) {
      void reconnectAvatar();
      return;
    }

    setSelectedAvatar(avatar);
  };

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;

    if (
      event.button !== 0 ||
      target.tagName.toLowerCase() === "button" ||
      target.closest("button")
    ) {
      return;
    }

    isDragging.current = true;
    dragStart.current = {
      x: event.clientX - boxPos.x,
      y: event.clientY - boxPos.y,
    };
    document.body.style.userSelect = "none";
  };

  const isActive = selectedAvatar !== null;

  // SSR guard
  if (!mounted) return null;

  return (
    <>
      <style>{`
        #custom-avatar-box canvas {
          background: transparent !important;
        }

        .web-avatar-controls {
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .web-avatar-box:hover .web-avatar-controls,
        .web-avatar-controls:focus-within {
          opacity: 1;
        }
      `}</style>

      {!isActive && (
        <button
          onClick={() => setIsModalOpen(true)}
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 99999,
            background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
            color: "white",
            fontWeight: 600,
            padding: "14px 24px",
            borderRadius: "9999px",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow:
              "0 10px 25px -5px rgba(79, 70, 229, 0.4), 0 8px 10px -6px rgba(79, 70, 229, 0.2)",
            fontSize: "14px",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(event) => {
            event.currentTarget.style.transform = "translateY(-2px)";
            event.currentTarget.style.boxShadow =
              "0 15px 30px -5px rgba(79, 70, 229, 0.5), 0 10px 15px -6px rgba(79, 70, 229, 0.3)";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.transform = "translateY(0)";
            event.currentTarget.style.boxShadow =
              "0 10px 25px -5px rgba(79, 70, 229, 0.4), 0 8px 10px -6px rgba(79, 70, 229, 0.2)";
          }}
        >
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          เปิดใช้งานผู้ช่วย Avatar
        </button>
      )}

      {isActive && (
        <div
          ref={boxRef}
          className="web-avatar-box"
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
          onMouseEnter={(event) => {
            event.currentTarget.style.borderColor =
              "rgba(107, 114, 128, 0.5)";
            event.currentTarget.style.borderStyle = "dashed";
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.borderColor = "transparent";
            event.currentTarget.style.borderStyle = "solid";
          }}
        >
          <div
            className="web-avatar-controls"
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              display: "flex",
              gap: "8px",
              zIndex: 50,
            }}
          >
            <button
              onClick={(event) => {
                event.stopPropagation();
                setIsModalOpen(true);
              }}
              style={{
                width: "32px",
                height: "32px",
                background: "rgba(0,0,0,0.5)",
                color: "white",
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(4px)",
              }}
              title="เปลี่ยนตัวละคร"
              aria-label="เปลี่ยนตัวละคร"
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation();
                void disableWebAvatar();
              }}
              style={{
                width: "32px",
                height: "32px",
                background: "rgba(239,68,68,0.8)",
                color: "white",
                borderRadius: "50%",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(4px)",
              }}
              title="ปิดใช้งาน"
              aria-label="ปิดใช้งาน Avatar"
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div
            ref={containerRef}
            id="custom-avatar-box"
            style={{
              flex: 1,
              width: "100%",
              height: "100%",
              position: "relative",
              overflow: "hidden",
              background: "transparent",
            }}
          />
        </div>
      )}

      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="avatar-dialog-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "24px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              width: "100%",
              maxWidth: "720px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              maxHeight: "85vh",
            }}
          >
            <div
              style={{
                padding: "24px",
                borderBottom: "1px solid #f3f4f6",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#fafbfc",
              }}
            >
              <div>
                <h2
                  id="avatar-dialog-title"
                  style={{
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "#1f2937",
                    margin: 0,
                  }}
                >
                  เลือกผู้ช่วย Avatar ของคุณ
                </h2>
                <p
                  style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    marginTop: "4px",
                  }}
                >
                  คลิกที่ตัวละครเพื่อเริ่มการสนทนาได้ทันที
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  color: "#9ca3af",
                  padding: "8px",
                  borderRadius: "50%",
                  border: "none",
                  cursor: "pointer",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="ปิดหน้าต่างเลือก Avatar"
              >
                <svg
                  width="24"
                  height="24"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div style={{ padding: "24px", overflowY: "auto" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: "16px",
                }}
              >
                {AVATARS.map(({ name, emoji }) => {
                  const isSelected = selectedAvatar === name;

                  return (
                    <button
                      key={name}
                      onClick={() => handleSelectAvatar(name)}
                      style={{
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "16px",
                        borderRadius: "16px",
                        border: `2px solid ${isSelected ? "#6366f1" : "#f3f4f6"
                          }`,
                        background: isSelected ? "#eef2ff" : "white",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: isSelected
                          ? "0 4px 15px -3px rgba(99, 102, 241, 0.3)"
                          : "none",
                      }}
                      onMouseEnter={(event) => {
                        if (!isSelected) {
                          event.currentTarget.style.borderColor = "#a5b4fc";
                          event.currentTarget.style.boxShadow =
                            "0 4px 15px -3px rgba(0,0,0,0.1)";
                          event.currentTarget.style.transform =
                            "translateY(-2px)";
                        }
                      }}
                      onMouseLeave={(event) => {
                        if (!isSelected) {
                          event.currentTarget.style.borderColor = "#f3f4f6";
                          event.currentTarget.style.boxShadow = "none";
                          event.currentTarget.style.transform = "translateY(0)";
                        }
                      }}
                    >
                      <div
                        style={{
                          width: "80px",
                          height: "80px",
                          marginBottom: "16px",
                          borderRadius: "12px",
                          overflow: "hidden",
                          background: "#f9fafb",
                          padding: "8px",
                          border: "1px solid #f3f4f6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "48px",
                        }}
                      >
                        {emoji}
                      </div>

                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: isSelected ? "#4338ca" : "#374151",
                        }}
                      >
                        {name}
                      </span>

                      {isSelected && (
                        <div
                          style={{
                            position: "absolute",
                            top: "12px",
                            right: "12px",
                            color: "white",
                            background: "#6366f1",
                            borderRadius: "50%",
                            width: "20px",
                            height: "20px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <svg
                            width="12"
                            height="12"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
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