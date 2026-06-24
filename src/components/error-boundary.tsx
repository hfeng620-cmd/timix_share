"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message || "未知错误" };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6">
            <div className="max-w-md text-center">
              <p className="text-5xl font-black text-[var(--color-brand)]">500</p>
              <h1 className="mt-4 text-2xl font-bold text-[var(--color-ink)]">
                页面出错了
              </h1>
              <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                请刷新页面重试。如果问题持续，请到 GitHub Issues 反馈。
              </p>
              <button
                className="mt-6 rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
                onClick={() => window.location.reload()}
                type="button"
              >
                刷新页面
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
