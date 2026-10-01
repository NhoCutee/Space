import { getCurrentUser } from '@/lib/auth';
import { CreateSpaceForm } from '@/components/spaces/CreateSpaceForm';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create a Space | Spaces',
  description: 'Launch a new visual community around your favorite design, craft, or aesthetic topic.',
};

export const dynamic = 'force-dynamic';

export default async function NewSpacePage() {
  const user = await getCurrentUser();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Breadcrumb & Navigation */}
      <div className="mb-6">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Explore</span>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Genesis Space Creator</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
          Found a Visual Space
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2 leading-relaxed">
          Spaces are focused visual commons dedicated to a single aesthetic, design philosophy, or creative craft.
          As the founder, you establish the manifesto, curation guidelines, and initial drops.
        </p>
      </div>

      {/* Main Creation Card */}
      <div className="glass rounded-3xl border border-border/80 p-6 sm:p-10 shadow-xl bg-card/60 backdrop-blur-xl">
        <CreateSpaceForm />
      </div>
    </div>
  );
}
