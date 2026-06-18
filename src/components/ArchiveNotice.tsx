"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

function InfoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <Image
      src="/icons/info.svg"
      alt=""
      width={24}
      height={24}
      className={className}
      style={{
        filter: "invert(1)",
        opacity: 0.68,
      }}
    />
  );
}

export function ArchiveNotice() {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    function closeNotice(event?: Event) {
      if (
        event instanceof MouseEvent &&
        wrapperRef.current?.contains(event.target as Node)
      ) {
        return;
      }

      if (
        event instanceof TouchEvent &&
        wrapperRef.current?.contains(event.target as Node)
      ) {
        return;
      }

      setIsOpen(false);
    }

    window.addEventListener("scroll", closeNotice, { once: true });
    window.addEventListener("touchstart", closeNotice);
    window.addEventListener("mousedown", closeNotice);

    return () => {
      window.removeEventListener("scroll", closeNotice);
      window.removeEventListener("touchstart", closeNotice);
      window.removeEventListener("mousedown", closeNotice);
    };
  }, [isOpen]);

  return (
    <div ref={wrapperRef} className="relative h-10 w-10 shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-label="Информация об архиве"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/80 transition hover:border-zinc-600 hover:bg-zinc-800"
      >
        <InfoIcon />
      </button>

      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 74,
            right: "clamp(16px, 12vw, 190px)",
            transform: "translateX(clamp(12px, 4vw, 32px))",
            zIndex: 9999,
            width: "min(448px, calc(100vw - 32px))",
            backgroundColor: "#000000",
          }}
          className="rounded-2xl border border-zinc-700 p-4 text-sm leading-relaxed text-zinc-300 shadow-2xl"
        >
          <div className="mb-2 text-base font-semibold text-zinc-100">
            Информация об архиве
          </div>

          <p>
            Архив ещё в работе, но счётчики уже должны быть ок.
            Фильмы, сериалы и аниме приведены в порядок.
          </p>

          <p className="mt-3">Остальной контент находится в процессе обработки.</p>

          <p className="mt-3">
            Нашли ошибку или хотите предложить улучшение — пишите:{" "}
            <a
              href="https://t.me/FaiziK_A"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-sky-400 hover:text-sky-300"
            >
              @FaiziK_A
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
