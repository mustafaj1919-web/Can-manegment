'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, background: '#0d0d0d', color: '#f1f5f9', fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px' }}>⚠️</div>
        <h1 style={{ fontSize: '20px', fontWeight: 700 }}>تعطّل التطبيق</h1>
        <p style={{ fontSize: '14px', color: '#94a3b8', maxWidth: '360px' }}>
          حدث خطأ حرج. يرجى تحديث الصفحة أو التواصل مع الدعم الفني.
        </p>
        <button
          onClick={reset}
          style={{ marginTop: '8px', padding: '10px 24px', background: '#00d4aa', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          إعادة تحميل
        </button>
        {error.digest && (
          <p style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace' }}>#{error.digest}</p>
        )}
      </body>
    </html>
  )
}
