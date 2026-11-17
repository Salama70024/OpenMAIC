import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'مدرسة الفردوس الابتدائية | العلوم التفاعلية',
  description: 'درس تفاعلي من كتاب العلوم للصف الرابع الابتدائي مع الشرح والأنشطة والمساعد الصوتي.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
