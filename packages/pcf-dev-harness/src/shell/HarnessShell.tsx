import * as React from "react";

/**
 * Reusable dev-harness "shell" — the control-agnostic chrome around a PCF control's
 * host-agnostic React app. Modeled on the built-in `pcf-scripts start` sandbox: a canvas
 * on the left hosts the control, and a right-hand panel groups the inputs into
 * **Context Inputs** (form factor, container size, theme), **Properties** (the manifest's
 * input properties, via `fields[]`), and **Data Inputs** (Mock vs a live org, whose binding
 * inputs are supplied declaratively via `bindingFields[]`).
 *
 * TIER 1 of the harness: this file is generic and **copies verbatim between controls** — it
 * owns NO fetch logic, NO control-specific types, and NO field/dataset assumptions. Both the
 * Properties and the live-org binding are declarative `HarnessField[]`, so a field control
 * (single record + attribute) and a dataset control (entity-set + columns + top) describe
 * their Data Inputs the same way. The parent (`dev/main.tsx`) holds all state + change
 * handlers; the control-specific data fetch lives in the sibling TIER-2 `dataverse.ts`.
 *
 * Depends only on React (no Fluent) so it stays portable; the theme picker emits a plain
 * string that the parent maps to whatever theme object its control expects.
 */

export type ThemeChoice = "light" | "dark" | "highContrast";
export type DataSource = "mock" | "live";

/**
 * Container-width presets simulating the PCF form factors. `Fill` (width 0) makes the control
 * span the whole canvas — useful for dataset grids that render full-width in a host.
 */
export const WIDTH_PRESETS: { label: string; width: number }[] = [
  { label: "Fill", width: 0 },
  { label: "Web", width: 640 },
  { label: "Tablet", width: 420 },
  { label: "Phone", width: 320 },
];

/**
 * A declarative panel input — used for BOTH the Properties section (manifest input
 * properties) and the Data Inputs live-org binding (entity/attribute or entity-set/columns).
 * Not manifest-parsed; the parent wires value + onChange.
 */
export type HarnessField =
  | {
      kind: "enum";
      label: string;
      value: string;
      options: { label: string; value: string }[];
      onChange: (value: string) => void;
    }
  | { kind: "boolean"; label: string; value: boolean; onChange: (value: boolean) => void }
  | {
      kind: "text";
      label: string;
      value: string;
      onChange: (value: string) => void;
      placeholder?: string;
    };

export interface HarnessShellProps {
  title: string;
  subtitle?: string;

  width: number;
  onWidthChange: (w: number) => void;
  height: number;
  onHeightChange: (h: number) => void;

  theme: ThemeChoice;
  onThemeChange: (t: ThemeChoice) => void;

  dataSource: DataSource;
  onDataSourceChange: (d: DataSource) => void;
  /** True when VITE_DYNAMICS_URL is set (import.meta.env), so Live can be offered. */
  liveEnabled: boolean;
  /** The live-org binding inputs (control-specific), rendered when Live is selected. */
  bindingFields: HarnessField[];
  onLoadLive: () => void;
  /** Optional loading/error banner rendered under the binding inputs. */
  liveStatus?: React.ReactNode;

  /** Control-specific input properties. */
  fields: HarnessField[];

  /** The control (already themed + wired) — hosted inside the sized container. */
  children: React.ReactNode;
}

const PANEL_BG = "#f3f2f1";
const BORDER = "#e1dfdd";
const ACCENT = "#742774"; // PCF sandbox purple

const page: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100vh",
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
};
const header: React.CSSProperties = {
  background: ACCENT,
  color: "#fff",
  padding: "10px 20px",
  fontSize: 15,
  fontWeight: 600,
  flex: "0 0 auto",
};
const body: React.CSSProperties = { display: "flex", flex: "1 1 auto", minHeight: 0 };
const canvas: React.CSSProperties = {
  flex: "1 1 auto",
  overflow: "auto",
  padding: 24,
  background: "#faf9f8",
  minWidth: 0,
};
const panel: React.CSSProperties = {
  flex: "0 0 340px",
  width: 340,
  overflowY: "auto",
  background: PANEL_BG,
  borderLeft: `1px solid ${BORDER}`,
  padding: "4px 0",
  boxSizing: "border-box",
};
const panelTitle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  padding: "12px 16px 4px",
  color: "#201f1e",
};
const sectionHeaderBtn: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  background: "none",
  border: "none",
  borderTop: `1px solid ${BORDER}`,
  padding: "12px 16px",
  fontSize: 15,
  fontWeight: 700,
  color: "#201f1e",
  cursor: "pointer",
  textAlign: "left",
};
const sectionBody: React.CSSProperties = { padding: "0 16px 12px" };
const fieldWrap: React.CSSProperties = { marginBottom: 12 };
const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#605e5c",
  marginBottom: 4,
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: 13,
  padding: "5px 7px",
  border: `1px solid #c8c6c4`,
  borderRadius: 2,
  background: "#fff",
};
function segButton(active: boolean, disabled = false): React.CSSProperties {
  return {
    fontFamily: "inherit",
    fontSize: 13,
    padding: "5px 12px",
    cursor: disabled ? "not-allowed" : "pointer",
    border: `1px solid ${active ? ACCENT : "#c8c6c4"}`,
    background: active ? ACCENT : "#fff",
    color: active ? "#fff" : "#323130",
    borderRadius: 2,
    opacity: disabled ? 0.5 : 1,
  };
}

const Section: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean }> = ({
  title,
  children,
  defaultOpen = true,
}) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div>
      <button type="button" style={sectionHeaderBtn} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden style={{ fontSize: 11, width: 10 }}>{open ? "▾" : "▸"}</span>
        {title}
      </button>
      {open && <div style={sectionBody}>{children}</div>}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={fieldWrap}>
    <label style={fieldLabel}>{label}</label>
    {children}
  </div>
);

/** Render one declarative HarnessField — shared by the Properties + Data Inputs sections. */
const renderField = (f: HarnessField): React.ReactNode =>
  f.kind === "boolean" ? (
    <label
      key={f.label}
      style={{ ...fieldWrap, display: "flex", alignItems: "center", gap: 8 }}
    >
      <input type="checkbox" checked={f.value} onChange={(e) => f.onChange(e.target.checked)} />
      <span style={{ fontSize: 13, color: "#323130" }}>{f.label}</span>
    </label>
  ) : (
    <Field key={f.label} label={f.label}>
      {f.kind === "enum" ? (
        <select style={inputStyle} value={f.value} onChange={(e) => f.onChange(e.target.value)}>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          style={inputStyle}
          placeholder={f.placeholder}
          value={f.value}
          onChange={(e) => f.onChange(e.target.value)}
        />
      )}
    </Field>
  );

export const HarnessShell: React.FC<HarnessShellProps> = (props) => {
  const {
    title,
    subtitle,
    width,
    onWidthChange,
    height,
    onHeightChange,
    theme,
    onThemeChange,
    dataSource,
    onDataSourceChange,
    liveEnabled,
    bindingFields,
    onLoadLive,
    liveStatus,
    fields,
    children,
  } = props;

  const activePreset = WIDTH_PRESETS.find((p) => p.width === width)?.label ?? "Custom";

  return (
    <div style={page}>
      <div style={header}>PCF Dev Harness</div>
      <div style={body}>
        {/* Canvas — the control, sized like the PCF container */}
        <div style={canvas}>
          {subtitle && (
            <div style={{ color: "#605e5c", fontSize: 13, marginBottom: 8 }}>{subtitle}</div>
          )}
          <div
            style={{
              width: width > 0 ? width : "100%",
              height: height || undefined,
              background: "#fff",
              border: `1px solid ${BORDER}`,
              borderRadius: 4,
              padding: 16,
              boxSizing: "border-box",
              overflow: "auto",
            }}
          >
            {children}
          </div>
        </div>

        {/* Right panel — inputs grouped like the built-in sandbox */}
        <aside style={panel}>
          <div style={panelTitle}>{title}</div>

          <Section title="Context Inputs">
            <Field label="Form Factor">
              <select
                style={inputStyle}
                value={activePreset}
                onChange={(e) => {
                  const p = WIDTH_PRESETS.find((w) => w.label === e.target.value);
                  if (p) onWidthChange(p.width);
                }}
              >
                {WIDTH_PRESETS.map((p) => (
                  <option key={p.label} value={p.label}>
                    {p.label} ({p.width})
                  </option>
                ))}
                {activePreset === "Custom" && <option value="Custom">Custom ({width})</option>}
              </select>
            </Field>
            <div style={{ display: "flex", gap: 10 }}>
              <Field label="Container width">
                <input
                  type="number"
                  style={inputStyle}
                  value={width}
                  min={120}
                  onChange={(e) => onWidthChange(Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="Container height">
                <input
                  type="number"
                  style={inputStyle}
                  value={height}
                  min={0}
                  onChange={(e) => onHeightChange(Number(e.target.value) || 0)}
                />
              </Field>
            </div>
            <Field label="Theme">
              <select
                style={inputStyle}
                value={theme}
                onChange={(e) => onThemeChange(e.target.value as ThemeChoice)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="highContrast">High contrast</option>
              </select>
            </Field>
          </Section>

          {fields.length > 0 && (
            <Section title="Properties">{fields.map(renderField)}</Section>
          )}

          <Section title="Data Inputs">
            <div style={{ ...fieldWrap, display: "flex", gap: 8 }}>
              <button type="button" style={segButton(dataSource === "mock")} onClick={() => onDataSourceChange("mock")}>
                Mock
              </button>
              <button
                type="button"
                style={segButton(dataSource === "live", !liveEnabled)}
                disabled={!liveEnabled}
                title={
                  liveEnabled
                    ? "Fetch real data from the org"
                    : "Set VITE_DYNAMICS_URL in .env.local and restart `npm run dev` to enable Live"
                }
                onClick={() => onDataSourceChange("live")}
              >
                Live org
              </button>
            </div>
            {!liveEnabled && (
              <div style={{ fontSize: 12, color: "#a19f9d", marginBottom: 8 }}>
                set VITE_DYNAMICS_URL in .env.local + restart to enable Live
              </div>
            )}

            {dataSource === "live" && (
              <>
                {bindingFields.map(renderField)}
                <button
                  type="button"
                  style={{ ...segButton(false), fontWeight: 600 }}
                  onClick={onLoadLive}
                >
                  Load
                </button>
                {liveStatus && <div style={{ marginTop: 10, fontSize: 12 }}>{liveStatus}</div>}
              </>
            )}
          </Section>
        </aside>
      </div>
    </div>
  );
};
