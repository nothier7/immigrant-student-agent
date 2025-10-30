from pathlib import Path

# Markdown content for the theme guide
md_content = """# 🎨 Dreamers Agent Theme Guide

A color system designed for calm, hope, and inspiration — matching Dreamers Agent’s mission to empower immigrant students through clarity, trust, and optimism.

---

## 🌤️ Light Mode Palette (Hopeful Day)

| Token | Color | Usage |
|--------|--------|--------|
| `--primary` | `#2A69AC` | Main blue — buttons, links, accent banners |
| `--primary600` | `#245a95` | Hover state |
| `--primary700` | `#1E4E82` | Active state |
| `--accent` | `#2DBE85` | Supportive mint for success, highlights |
| `--accent-soft` | `#D6F5E3` | Soft background for positive sections |
| `--bg` | `#FAFCFE` | Main background (off-white “paper”) |
| `--card` | `#FFFFFF` | Surface of cards and panels |
| `--heading` | `#1E293B` | Deep slate for titles (trustworthy and readable) |
| `--text` | `#334155` | Body text (calm neutral gray-blue) |
| `--border` | `rgba(0,0,0,0.08)` | Subtle border tone for structure |
| `--glass-border` | `180, 180, 190` | Used in glassmorphism components (frosted gray) |
| `--highlight` | `#F5C453` | Warm light-gold accent (for emphasis or hover glow) |

---

## 🌙 Dark Mode Palette (Peaceful Night)

| Token | Color | Usage |
|--------|--------|--------|
| `--primary` | `#60A5FA` | Hope blue — more luminous in dark |
| `--primary600` | `#3B82F6` | Hover state |
| `--primary700` | `#2563EB` | Active state |
| `--accent` | `#4ADE80` | Mint-green pop for positivity |
| `--bg` | `#0B1120` | Deep navy backdrop — comforting, not pure black |
| `--card` | `#111827` | Panels, glassy cards |
| `--heading` | `#F3F4F6` | Title text — soft white |
| `--text` | `#CBD5E1` | Body text — muted gray-blue |
| `--border` | `rgba(255,255,255,0.08)` | Divider lines and light structure |
| `--glass-border` | `120, 120, 130` | Frosted bluish-gray for glass effects |
| `--highlight` | `#FACC15` | Golden warmth for buttons, icons, focus states |

---

## 🌈 Optional Gradient & Tint Ideas

Use for section dividers, hero backgrounds, or gentle emphasis:

- `from-[#E0F2FE] to-[#E8F5E9]` → gradient blend of light blue & mint  
- `from-[#0F172A] to-[#1E293B]` → soft night gradient in dark mode  
- `from-[#FFF8E1]` → faint sunrise glow for CTAs  
- `bg-[radial-gradient(circle_at_20%_20%,#D6F5E3,transparent)]` → minty radial highlight  

---

## 🧠 Design Principles

1. **Emotional balance:** Blue builds *trust*, mint conveys *care*, and gold adds *optimism*.
2. **Contrast:** All text meets WCAG AA readability contrast.
3. **Warm neutrality:** Avoid pure white or pure black backgrounds — keeps the UI calm, not harsh.
4. **Hierarchy:** Headings use `text-heading`, body copy `text-text`, CTAs `bg-primary`.
5. **Consistency:** Shared tokens keep Tailwind + CSS variables in sync.

---

## 🪄 Next Step

Use these tokens in your `theme.css` file to define:

```css
:root {
  --primary: #2A69AC;
  --primary600: #245a95;
  --primary700: #1E4E82;
  --accent: #2DBE85;
  --bg: #FAFCFE;
  --card: #FFFFFF;
  --heading: #1E293B;
  --text: #334155;
  --highlight: #F5C453;
  --glass-border: 180, 180, 190;
}

[data-theme='dark'] {
  --primary: #60A5FA;
  --primary600: #3B82F6;
  --primary700: #2563EB;
  --accent: #4ADE80;
  --bg: #0B1120;
  --card: #111827;
  --heading: #F3F4F6;
  --text: #CBD5E1;
  --highlight: #FACC15;
  --glass-border: 120, 120, 130;
}
