'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { CreateSpaceModal } from '@/components/spaces/CreateSpaceModal';

export function CreateSpaceButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-foreground text-background hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer shrink-0"
      >
        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Create Space</span>
      </button>

      <CreateSpaceModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
