import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface SettingsMobileBackProps {
  label?: string;
  href?: string;
}

export function SettingsMobileBack({
  label = 'Quay lại cài đặt',
  href = '/settings',
}: SettingsMobileBackProps) {
  return (
    <div className="md:hidden mb-4">
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group p-1 -ml-1"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span>{label}</span>
      </Link>
    </div>
  );
}
