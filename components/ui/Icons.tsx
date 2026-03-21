import type { ReactElement } from "react";
import type { NavIconName } from "../../types/app";

export function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="6" height="6" rx="1.5" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" />
    </svg>
  );
}

export function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 7L8 2l6 5v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7z" />
      <path d="M6 15V9h4v6" />
    </svg>
  );
}

export function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2" width="12" height="12" rx="1.5" />
      <path d="M6 6h.01M10 6h.01M6 9h.01M10 9h.01M8 14V11" />
    </svg>
  );
}

export function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="5" r="3" />
      <path d="M1 14c0-3 2.2-5 5-5s5 2 5 5" />
      <circle cx="12" cy="6" r="2" />
      <path d="M12 10c1.5 0 3 1 3 3.5" />
    </svg>
  );
}

export function CardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="4" width="14" height="9" rx="1.5" />
      <path d="M1 7h14" />
      <path d="M4 11h3" />
    </svg>
  );
}

export function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5l-3 2V3z" />
    </svg>
  );
}

export function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  );
}

export function MessageIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4h12v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4z" />
      <path d="M2 4l6 5 6-5" />
    </svg>
  );
}

export function BellIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2a5 5 0 0 1 5 5v2l1 2H2l1-2V7a5 5 0 0 1 5-5z" />
      <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" />
    </svg>
  );
}

export function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" />
    </svg>
  );
}

export function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 13h12" />
      <path d="M3 10l3-3 3 2 4-5" />
    </svg>
  );
}

export function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2l1.8 3.6L14 6.3l-3 2.9.7 4.1L8 11.3l-3.7 2 .7-4.1L2 6.3l4.2-.7L8 2z" />
    </svg>
  );
}

export function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2l5 2v4c0 3-2 5.3-5 6-3-.7-5-3-5-6V4l5-2z" />
    </svg>
  );
}

export function LogIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="1" width="14" height="14" rx="2" />
      <path d="M4 4h8M4 8h8M4 12h5" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg className="search-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M11 11l3 3" />
    </svg>
  );
}

export function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4h12M5 8h6M7 12h2" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2v12M2 8h12" />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg className="alert-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3M8 11h.01" />
    </svg>
  );
}

export function ReceiptIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 2v12l2-1.5 2 1.5 2-1.5L13 14V2H3z" />
      <path d="M5 6h6M5 9h4" />
    </svg>
  );
}

export function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6L10 2z" />
      <path d="M10 2v4h4" />
      <path d="M5 9h6M5 11h4" />
    </svg>
  );
}

export function PayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2v12M5 5h4.5a2.5 2.5 0 0 1 0 5H5" />
      <path d="M5 5H3m2 5H3" />
    </svg>
  );
}

export function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" />
    </svg>
  );
}

const iconMap: Record<NavIconName, () => ReactElement> = {
  grid: GridIcon,
  home: HomeIcon,
  building: BuildingIcon,
  users: UsersIcon,
  card: CardIcon,
  chat: ChatIcon,
  receipt: ReceiptIcon,
  doc: DocIcon,
  bell: BellIcon,
  clock: ClockIcon,
  chart: ChartIcon,
  star: StarIcon,
  shield: ShieldIcon,
  log: LogIcon,
  pay: PayIcon,
  settings: SettingsIcon,
};

interface NavIconProps {
  name: NavIconName;
}

export function NavIcon({ name }: NavIconProps) {
  const Icon = iconMap[name];
  return <Icon />;
}
