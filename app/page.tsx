'use client';

import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Mail, Zap, Brain, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.replace('/inbox');
  }, [session, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse-subtle text-accent-blue text-lg">Loading...</div>
      </div>
    );
  }

  if (session) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-bg-primary">
      <div className="max-w-lg text-center animate-fade-in">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center">
          <div className="rounded-2xl bg-accent-rose/10 p-4">
            <Zap className="h-8 w-8 text-accent-rose" />
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-text-primary">
          Super<span className="text-accent-rose">user</span>
        </h1>
        <p className="mb-10 text-[15px] leading-relaxed text-text-secondary max-w-md mx-auto">
          AI-powered Gmail client. Categorize, draft, research, and power through your inbox at lightning speed.
        </p>

        {/* Feature cards */}
        <div className="mb-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border-subtle bg-bg-secondary p-5 shadow-soft transition-all duration-200 hover:shadow-soft-md">
            <Brain className="mx-auto mb-3 h-5 w-5 text-accent-purple opacity-80" />
            <div className="text-[13px] font-semibold text-text-primary">AI Triage</div>
            <div className="mt-1 text-[11px] text-text-muted">Auto-categorize & prioritize</div>
          </div>
          <div className="rounded-xl border border-border-subtle bg-bg-secondary p-5 shadow-soft transition-all duration-200 hover:shadow-soft-md">
            <Mail className="mx-auto mb-3 h-5 w-5 text-accent-green opacity-80" />
            <div className="text-[13px] font-semibold text-text-primary">Smart Drafts</div>
            <div className="mt-1 text-[11px] text-text-muted">AI-generated responses</div>
          </div>
          <div className="rounded-xl border border-border-subtle bg-bg-secondary p-5 shadow-soft transition-all duration-200 hover:shadow-soft-md">
            <Zap className="mx-auto mb-3 h-5 w-5 text-accent-yellow opacity-80" />
            <div className="text-[13px] font-semibold text-text-primary">Keyboard-First</div>
            <div className="mt-1 text-[11px] text-text-muted">Vim-style navigation</div>
          </div>
        </div>

        {/* CTA - rose accent per style guide */}
        <button
          onClick={() => signIn('google')}
          className="group inline-flex items-center gap-2 rounded-lg bg-accent-rose px-6 py-3 text-sm font-semibold text-zinc-900 transition-all duration-200 hover:bg-rose-400 hover:shadow-soft-lg"
        >
          Sign in with Google
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        <p className="mt-5 text-[12px] text-text-muted">
          Requires Gmail access. Your data stays between you and the AI.
        </p>
      </div>
    </div>
  );
}
