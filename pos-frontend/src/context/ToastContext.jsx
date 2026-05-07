import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ToastContext = createContext(null);

const CONFIG = {
  success: { bg: '#0d1f0d', border: '#22c55e40', bar: '#22c55e', icon: 'fi-rr-check-circle', color: '#4ade80' },
  error:   { bg: '#1f0d0d', border: '#ef444440', bar: '#ef4444', icon: 'fi-rr-cross-circle', color: '#f87171' },
  info:    { bg: '#0d0d1f', border: '#3b82f640', bar: '#3b82f6', icon: 'fi-rr-info',         color: '#60a5fa' },
  warning: { bg: '#1f160d', border: '#f9731640', bar: '#f97316', icon: 'fi-rr-triangle-warning', color: '#fb923c' },
};

function ToastItem({ t, onClose }) {
  const c = CONFIG[t.tipo] || CONFIG.info;
  return (
    <div
      role="alert"
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        animation: 'bpToastIn 0.28s cubic-bezier(.22,.68,0,1.2)',
        borderRadius: 18,
        padding: '14px 16px 18px',
        width: 340,
        maxWidth: 'calc(100vw - 24px)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <i className={`fi ${c.icon}`} style={{ color: c.color, fontSize: 18, marginTop: 1, flexShrink: 0 }} />
      <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1.45, flex: 1, margin: 0 }}>
        {t.mensaje}
      </p>
      <button
        onClick={onClose}
        style={{ color: '#666', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0, marginTop: 1 }}
      >
        <i className="fi fi-rr-cross" style={{ fontSize: 11 }} />
      </button>
      {/* barra de progreso */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, height: 3,
          background: c.bar, borderRadius: '0 0 0 18px',
          animation: `bpToastBar ${t.dur}ms linear forwards`,
        }}
      />
    </div>
  );
}

const CSS = `
@keyframes bpToastIn {
  from { transform: translateX(110%) scale(0.92); opacity: 0; }
  to   { transform: translateX(0)   scale(1);    opacity: 1; }
}
@keyframes bpToastBar {
  from { width: 100%; }
  to   { width: 0%;   }
}
`;

function ToastLayer({ toasts, remove }) {
  if (!toasts.length) return null;
  return (
    <>
      <style>{CSS}</style>
      <div style={{
        position: 'fixed', bottom: 24, right: 16,
        zIndex: 99999,
        display: 'flex', flexDirection: 'column', gap: 10,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem t={t} onClose={() => remove(t.id)} />
          </div>
        ))}
      </div>
    </>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);

  const add = useCallback((mensaje, tipo = 'success', dur = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p.slice(-4), { id, mensaje, tipo, dur }]);
    setTimeout(() => remove(id), dur + 300);
  }, [remove]);

  const toast = useMemo(() => ({
    success: (msg, dur)       => add(msg, 'success', dur),
    error:   (msg, dur)       => add(msg, 'error',   dur ?? 4500),
    info:    (msg, dur)       => add(msg, 'info',    dur),
    warning: (msg, dur)       => add(msg, 'warning', dur),
  }), [add]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastLayer toasts={toasts} remove={remove} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast necesita estar dentro de <ToastProvider>');
  return ctx;
}
