import Image from "next/image";

export function StatPill({
  value,
  label,
  icon,
  style,
}: {
  value: number;
  label: string;
  icon: string;
  style: React.CSSProperties;
}) {
  return (
    <div
      style={{ ...style, width: 170, height: 66 }}
      className="flex items-center gap-3 rounded-2xl border px-4 py-3"
    >
      <Image
        src={icon}
        alt=""
        width={30}
        height={30}
        style={{
          filter: "invert(1)",
          opacity: 0.68,
        }}
        className="shrink-0"
      />

      <div className="flex flex-col justify-center leading-none">
        <div className="text-2xl font-bold text-zinc-100">{value}</div>

        <div className="mt-1 text-sm text-zinc-400">{label}</div>
      </div>
    </div>
  );
}
