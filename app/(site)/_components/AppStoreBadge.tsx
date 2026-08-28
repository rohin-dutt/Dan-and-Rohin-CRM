import Image from "next/image";
import { APP_STORE_URL } from "../_lib/constants";

export function AppStoreBadge({ className }: { className?: string }) {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex ${className ?? ""}`}
    >
      <Image
        src="/images/app-store-badge.svg"
        alt="Download on the App Store"
        width={175}
        height={58}
        className="h-auto w-[175px]"
      />
    </a>
  );
}
