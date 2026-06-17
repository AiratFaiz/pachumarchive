import Image from "next/image";
import { sourceIcons } from "@/lib/contentMeta";

export function SourceIcon({ source }: { source: string }) {
  const icon = sourceIcons[source];

  if (!icon) return null;

  return (
    <Image
      src={icon}
      alt=""
      width={20}
      height={20}
      className="h-[20px] w-[20px] shrink-0"
    />
  );
}

export function ExternalLinkIcon({
  className = "h-5 w-5",
}: {
  className?: string;
}) {
  return (
    <Image
      src="/icons/external_link.svg"
      alt=""
      width={30}
      height={30}
      className={className}
    />
  );
}

export function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <Image
      src={isOpen ? "/icons/chevron_up.svg" : "/icons/chevron_down.svg"}
      alt=""
      width={25}
      height={25}
      className="h-4 w-4"
    />
  );
}

export function ExpandIcon({
  isOpen,
  className = "h-4 w-4",
}: {
  isOpen: boolean;
  className?: string;
}) {
  return (
    <Image
      src={isOpen ? "/icons/chevron_up.svg" : "/icons/chevron_down.svg"}
      alt=""
      width={16}
      height={16}
      className={className}
    />
  );
}
