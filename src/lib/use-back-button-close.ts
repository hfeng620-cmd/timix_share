"use client";

import { useEffect } from "react";

/**
 * 在 Modal/BottomSheet 挂载时向 history 推入一条虚假记录，
 * 这样 Android 物理返回键（popstate）会关闭弹窗而不是退出 App。
 */
export function useBackButtonClose(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    window.history.pushState({ modalOpen: true }, "");

    const handlePopState = (_e: PopStateEvent) => {
      onClose();
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (window.history.state?.modalOpen) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);
}
