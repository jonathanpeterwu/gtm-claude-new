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
    <div className="flex h-screen flex-col items-center justify-center px-4">
      <div className="max-w-lg text-center animate-fade-in">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="rounded-xl bg-accent-blue/10 p-3">
            <Zap className="h-8 w-8 text-accent-blue" />
          </div>
        </div>

        <h1 className="mb-3 text-4xl font-bold tracking-tight">
          Super<span className="text-accent-blue">user</span>
        </h1>
        <p className="mb-8 text-lg text-text-secondary">
          AI-powered Gmail client. Categorize, draft, research, and power through your inbox at lightning speed.
        </p>

        <div className="mb-10 grid grid-cols-3 gap-4 text-sm">
          <div className="rounded-lg border border-border-subtle bg-bg-secondary p-4">
            <Brain className="mx-auto mb-2 h-5 w-5 text-accent-purple" />
            <div className="font-medium">AI Triage</div>
            <div className="mt-1 text-text-muted text-xs">Auto-categorize & prioritize</div>
          </div>
          <div className="rounded-lg border border-border-subtle bg-bg-secondary p-4">
            <Mail className="mx-auto mb-2 h-5 w-5 text-accent-green" />
            <div className="font-medium">Smart Drafts</div>
            <div className="mt-1 text-text-muted text-xs">AI-generated responses</div>
          </div>
          <div className="rounded-lg border border-border-subtle bg-bg-secondary p-4">
            <Zap className="mx-auto mb-2 h-5 w-5 text-accent-yellow" />
            <div className="font-medium">Keyboard-First</div>
            <div className="mt-1 text-text-muted text-xs">Vim-style navigation</div>
          </div>
        </div>

        <button
          onClick={() => signIn('google')}
          className="group inline-flex items-center gap-2 rounded-lg bg-accent-blue px-6 py-3 font-medium text-white transition-all hover:bg-accent-blue/90 hover:shadow-lg hover:shadow-accent-blue/20"
        >
          Sign in with Google
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        <p className="mt-4 text-xs text-text-muted">
          Requires Gmail access. Your data stays between you and the AI.
        </p>
      </div>
    </div>
  );
}
