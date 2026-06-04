import { NavLink } from "react-router-dom";
import styles from "./Header.module.css";

const NAV_ITEMS = [
  { to: "/tasks/", label: "Задачи" },
  { to: "/tags/", label: "Теги" },
  { to: "/proxy/", label: "Прокси" },
];

const VERSION = "v 0.6.2 · prod";
const USER_INITIAL = "K";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>P</span>
        <span className={styles.logoText}>PARSEK</span>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.tab}${isActive ? ` ${styles.active}` : ""}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.right}>
        <span className={styles.version}>{VERSION}</span>
      </div>
    </header>
  );
}