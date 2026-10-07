import Link from 'next/link';
import { UserX, ArrowLeft, Search } from 'lucide-react';

export default function UserNotFound() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <div className="w-16 h-16 rounded-3xl bg-secondary/80 border border-border/80 flex items-center justify-center mx-auto mb-5 text-muted-foreground shadow-sm">
        <UserX className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-black tracking-tight text-foreground">
        Người dùng không tồn tại
      </h1>
      <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed max-w-sm mx-auto">
        Tài khoản người dùng bạn đang tìm kiếm không tồn tại hoặc đã thay đổi tên người dùng (@handle).
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Về trang chủ</span>
        </Link>
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground border border-border/80 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Khám phá cộng đồng</span>
        </Link>
      </div>
    </div>
  );
}
