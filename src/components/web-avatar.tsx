import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

export function WebAvatar() {
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Define window config
    (window as any).ChatWidgetConfig = {
      mode: "realtime-widget",
      widgetId: "learn-lab",
      avatarUrl: "Botnoi",
      greetingInstruction: "กรุณาทักทายผู้ใช้เป็นภาษาไทย ด้วยน้ำเสียงอบอุ่น เป็นมิตร และพูดสั้นกระชับ",
      enableBubble: "true",
      cameraOffset: "0,0,0"
    };

    // 2. Load JSSDK script
    const scriptId = "webavatar-jssdk";
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://webavatar.didthat.cc/chat-widget.js";
      script.async = true;
      document.body.appendChild(script);
    }

    // 3. Listen for navigate event to integrate with TanStack Router
    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<{ target: string }>;
      if (customEvent.detail && customEvent.detail.target) {
        customEvent.preventDefault();
        const target = customEvent.detail.target;
        try {
          const url = new URL(target, window.location.origin);
          if (url.origin === window.location.origin) {
            // Internal navigation
            const path = url.pathname + url.search + url.hash;
            void navigate({ to: path });
          } else {
            // External navigation (not typical, fallback to location)
            window.location.href = target;
          }
        } catch (err) {
          // Fallback if URL parsing fails
          void navigate({ to: target });
        }
      }
    };

    window.addEventListener("webavatar-navigate", handleNavigate);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("webavatar-navigate", handleNavigate);
      // Clean up WebAvatar JSSDK resources when component unmounts
      if ((window as any).WebAvatar) {
        try {
          (window as any).WebAvatar.disconnect();
        } catch (e) {
          console.error("Failed to disconnect WebAvatar:", e);
        }
      }
      
      const scriptToRemove = document.getElementById(scriptId);
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
      
      delete (window as any).ChatWidgetConfig;
    };
  }, [navigate]);

  return null;
}
