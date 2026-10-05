'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreateSpaceForm, CreatedSpaceData } from './CreateSpaceForm';
import { X, Sparkles } from 'lucide-react';

interface CreateSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpaceCreated?: (slug: string, space?: CreatedSpaceData) => void;
}

export function CreateSpaceModal({
  isOpen,
  onClose,
  onSpaceCreated,
}: CreateSpaceModalProps) {
  const router = useRouter();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSuccess = (slug: string, space?: CreatedSpaceData) => {
    onClose();
    if (onSpaceCreated) {
      onSpaceCreated(slug, space);
    } else {
      router.push(`/s/${slug}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Content */}
      <div className="relative w-full max-w-2xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden z-10 my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-secondary/30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Create a Space</h2>
              <p className="text-[11px] text-muted-foreground">Launch a visual community for your craft or aesthetic</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <CreateSpaceForm
            isModal={true}
            onCancel={onClose}
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  );
}
