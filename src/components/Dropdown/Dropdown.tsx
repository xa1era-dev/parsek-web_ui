import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Dropdown.module.css";

export interface DropdownItem {
  label: string;
  value?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

type Placement = "bottom-start" | "bottom-end" | "top-end";

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  activeValue?: string;
  portal?: boolean;
  placement?: Placement;
  showArrow?: boolean;
  triggerClassName?: string;
  listClassName?: string;
  itemClassName?: string;
  className?: string;
  onSelect?: (value: string) => void;
}

export default function Dropdown({
  trigger,
  items,
  activeValue,
  portal = false,
  placement = "bottom-start",
  showArrow = false,
  triggerClassName,
  listClassName,
  itemClassName,
  className,
  onSelect,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const wrapperRef  = useRef<HTMLDivElement>(null);
  const triggerRef  = useRef<HTMLButtonElement>(null);
  const listRef     = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      const outside = portal
        ? !triggerRef.current?.contains(t) && !listRef.current?.contains(t)
        : !wrapperRef.current?.contains(t);
      if (outside) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, portal]);

  const toggle = () => {
    if (!open && portal && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const GAP = 4;
      if (placement === "bottom-start") setPos({ top: r.bottom + GAP, left: r.left });
      else if (placement === "bottom-end") setPos({ top: r.bottom + GAP, left: r.right });
      else if (placement === "top-end")   setPos({ top: r.top   - GAP, left: r.right });
    }
    setOpen((o) => !o);
  };

  const handleSelect = (item: DropdownItem) => {
    item.onClick?.();
    if (item.value !== undefined) onSelect?.(item.value);
    setOpen(false);
  };

  const portalTransform =
    placement === "top-end"    ? "translateX(-100%) translateY(-100%)" :
    placement === "bottom-end" ? "translateX(-100%)"                   : undefined;

  const listEl = (
    <ul
      ref={listRef}
      className={[
        styles.list,
        !portal && placement === "bottom-end" ? styles.listAlignRight : "",
        listClassName ?? "",
      ].filter(Boolean).join(" ")}
      style={portal ? { position: "fixed", top: pos.top, left: pos.left, transform: portalTransform } : undefined}
    >
      {items.map((item, i) => (
        <li
          key={item.value ?? i}
          className={[
            styles.item,
            item.danger   ? styles.itemDanger   : "",
            item.disabled ? styles.itemDisabled : "",
            item.value !== undefined && item.value === activeValue ? styles.itemActive : "",
            itemClassName ?? "",
          ].filter(Boolean).join(" ")}
          onClick={() => !item.disabled && handleSelect(item)}
        >
          {item.label}
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={wrapperRef} className={[styles.wrapper, className ?? ""].filter(Boolean).join(" ")}>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClassName}
        onClick={toggle}
      >
        {trigger}
        {showArrow && (
          <span className={`${styles.arrow} ${open ? styles.arrowOpen : ""}`}>▾</span>
        )}
      </button>
      {open && (portal ? createPortal(listEl, document.body) : listEl)}
    </div>
  );
}