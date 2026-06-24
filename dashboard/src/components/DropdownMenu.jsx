import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Three-dot dropdown menu.
 * Uses position:fixed so it escapes table/overflow:hidden containers.
 *
 * items: Array of { label, onClick, danger?, disabled? } or the string 'separator'
 */
export default function DropdownMenu({ items, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({});
  const triggerRef = useRef(null);
  const menuRef    = useRef(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    if (align === 'right') {
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    } else {
      setPos({ top: r.bottom + 4, left: r.left });
    }
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    function close(e) {
      if (!triggerRef.current?.contains(e.target) && !menuRef.current?.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="sp-dropdown">
      <button
        ref={triggerRef}
        className="sp-dropdown__trigger"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-label="More options"
        aria-expanded={open}
      >
        •••
      </button>
      {open && (
        <div
          ref={menuRef}
          className="sp-dropdown__menu"
          style={{ position: 'fixed', ...pos }}
        >
          {items.map((item, i) =>
            item === 'separator' ? (
              <div key={i} className="sp-dropdown__sep" />
            ) : (
              <button
                key={item.label}
                onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick(); }}
                className={`sp-dropdown__item${item.danger ? ' sp-dropdown__item--danger' : ''}`}
                disabled={item.disabled}
              >
                {item.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
