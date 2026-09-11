import { useTranslation } from "react-i18next";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

export default function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const options = [
    { value: "system" as const, label: t("theme.system"), icon: SystemIcon },
    { value: "light" as const, label: t("theme.light"), icon: SunIcon },
    { value: "dark" as const, label: t("theme.dark"), icon: MoonIcon },
  ];

  return (
    <div
      className={cn(
        "relative flex h-6 w-[4.25rem] items-center p-0.5 rounded-full border border-border hover:border-foreground/20 transition-colors",
        className
      )}
      role="group"
      aria-label={t("theme.system")}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          aria-label={opt.label}
          className={cn(
            "z-10 flex size-5 items-center justify-center rounded-full transition-colors duration-200",
            theme === opt.value
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground/70"
          )}
          type="button"
        >
          <opt.icon className="size-3" />
        </button>
      ))}
      <div
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-foreground/10 transition-all duration-200",
          theme === "system" && "left-0.5",
          theme === "light" && "left-[1.25rem]",
          theme === "dark" && "left-[2.5rem]"
        )}
      />
    </div>
  );
}

function SystemIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4.5 15.5L9 14.5L13.5 15.5" />
      <path d="M9 11.75V14.5" />
      <path d="M14.25 2.75H3.75C2.64543 2.75 1.75 3.64543 1.75 4.75V9.75C1.75 10.8546 2.64543 11.75 3.75 11.75H14.25C15.3546 11.75 16.25 10.8546 16.25 9.75V4.75C16.25 3.64543 15.3546 2.75 14.25 2.75Z" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 1.25V2.25" />
      <path d="M14.48 3.52002L13.773 4.22702" />
      <path d="M16.75 9H15.75" />
      <path d="M14.48 14.4799L13.773 13.7729" />
      <path d="M9 16.75V15.75" />
      <path d="M3.52 14.4799L4.227 13.7729" />
      <path d="M1.25 9H2.25" />
      <path d="M3.52 3.52002L4.227 4.22702" />
      <path d="M9 13.25C11.3472 13.25 13.25 11.3472 13.25 9C13.25 6.65279 11.3472 4.75 9 4.75C6.65279 4.75 4.75 6.65279 4.75 9C4.75 11.3472 6.65279 13.25 9 13.25Z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M13 11.75C9.548 11.75 6.75 8.95201 6.75 5.50001C6.75 4.14801 7.183 2.90101 7.912 1.87801C4.548 2.50601 2 5.45301 2 9.00001C2 13.004 5.246 16.25 9.25 16.25C12.622 16.25 15.448 13.944 16.259 10.826C15.309 11.409 14.196 11.75 13 11.75Z" />
    </svg>
  );
}
