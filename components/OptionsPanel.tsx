"use client";

type Opts = {
  transparent: boolean;
  ratio: "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
  padding: boolean;
};

const RATIOS: Opts["ratio"][] = ["1:1", "4:3", "3:4", "16:9", "9:16"];

export function OptionsPanel({
  value,
  onChange,
}: {
  value: Opts;
  onChange: (v: Opts) => void;
}) {
  function set<K extends keyof Opts>(k: K, v: Opts[K]) {
    onChange({ ...value, [k]: v });
  }
  return (
    <div className="flex flex-col gap-4">
      <span className="text-xs uppercase tracking-wider text-muted">Options</span>

      <div>
        <div className="text-sm mb-2">Aspect ratio</div>
        <div className="flex flex-wrap gap-2">
          {RATIOS.map((r) => (
            <button
              key={r}
              onClick={() => set("ratio", r)}
              className={`chip chip-toggle ${value.ratio === r ? "on" : ""}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm">Transparent background</span>
        <Toggle checked={value.transparent} onChange={(b) => set("transparent", b)} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm">Add padding around subject</span>
        <Toggle checked={value.padding} onChange={(b) => set("padding", b)} />
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors"
      style={{
        background: checked ? "var(--accent)" : "rgba(255,255,255,0.1)",
      }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}
