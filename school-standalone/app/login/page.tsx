'use client';

import { useState, type FormEvent } from 'react';
import { BookOpen, GraduationCap, LockKeyhole } from 'lucide-react';

export default function SchoolLogin() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!code.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/school/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }), cache: 'no-store',
      });
      if (!response.ok) {
        setError('رمز الدخول غير صحيح. تأكد منه وحاول مرة أخرى.');
        return;
      }
      window.location.assign('/school');
    } catch {
      setError('تعذر الاتصال بالخادم. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }

  return <main dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'linear-gradient(145deg,#f2f4ff,#e7f6ed)', color: '#29365a', fontFamily: 'Noto Sans Arabic, Tahoma, sans-serif' }}>
    <section style={{ width: '100%', maxWidth: 430, background: 'white', borderRadius: 24, padding: '32px 28px', boxShadow: '0 18px 70px #38347b1a', textAlign: 'center' }}>
      <GraduationCap size={44} color="#6259d9" aria-hidden="true" style={{ margin: '0 auto' }} />
      <h1 style={{ fontSize: 22, margin: '14px 0 5px' }}>مدرسة الفردوس الابتدائية</h1>
      <p style={{ color: '#647293', margin: '0 0 24px' }}>تجربة المعلّم الذكي — علوم الرابع الابتدائي</p>
      <form onSubmit={(event) => void submit(event)} style={{ textAlign: 'right' }}>
        <label htmlFor="school-access-code" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9, fontWeight: 700 }}><LockKeyhole size={17} /> رمز دخول المعلمين والمختبرين</label>
        <input id="school-access-code" type="password" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" required maxLength={128} placeholder="أدخل رمز الدخول" style={{ width: '100%', padding: '13px 15px', fontSize: 16, border: '1px solid #ccd1e5', borderRadius: 10, outlineColor: '#6259d9' }} />
        {error && <p role="alert" style={{ color: '#b43131', fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, background: '#6259d9', color: 'white', border: 0, borderRadius: 10, marginTop: 15, padding: '13px 15px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}><BookOpen size={18} /> {loading ? 'جارٍ التحقق…' : 'الدخول إلى الدرس'}</button>
      </form>
      <small style={{ color: '#8390a6', display: 'block', marginTop: 18 }}>هذه النسخة التجريبية مخصصة للمعلمين والمختبرين فقط.</small>
    </section>
  </main>;
}
