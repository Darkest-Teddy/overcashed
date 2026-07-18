"use client";

import { useEffect } from "react";

/**
 * Loops ambient office music under the co-op game. Browsers block autoplay
 * with sound until a user gesture, so playback is armed on the first
 * keydown / pointer / touch and then left looping for the session.
 */
export function useAmbientMusic(src = "/sounds/office-ambience.wav", volume = 0.35) {
  useEffect(() => {
    if (typeof Audio === "undefined") return;

    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = volume;
    audio.preload = "auto";

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      audio.play().catch(() => {
        // Gesture wasn't enough (e.g. still-loading media) — re-arm and retry.
        started = false;
      });
    };

    // Try immediately in case autoplay is permitted; otherwise the first
    // gesture arms it. These listeners remove themselves once playback begins.
    void audio.play().then(() => {
      started = true;
    }).catch(() => {
      /* blocked until gesture */
    });

    const onGesture = () => {
      start();
      if (started) {
        window.removeEventListener("keydown", onGesture);
        window.removeEventListener("pointerdown", onGesture);
        window.removeEventListener("touchstart", onGesture);
      }
    };

    window.addEventListener("keydown", onGesture);
    window.addEventListener("pointerdown", onGesture);
    window.addEventListener("touchstart", onGesture);

    return () => {
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("touchstart", onGesture);
      audio.pause();
      audio.src = "";
    };
  }, [src, volume]);
}
