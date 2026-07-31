# 🎨 Trello Design System — Toàn Bộ Màu Sắc & UI/UX

> Tài liệu tham khảo đầy đủ về màu sắc, typography, components và design system của Trello (dựa trên **Nachos** — Trello's Design System & **Atlassian Design Tokens**).

---

## 📋 Mục Lục

1. [Brand Color — Màu thương hiệu chính](#1-brand-color--màu-thương-hiệu-chính)
2. [Card Label Colors — Màu nhãn thẻ](#2-card-label-colors--màu-nhãn-thẻ)
3. [Board Background Colors](#3-board-background-colors)
4. [Atlassian Design Tokens — Light Mode](#4-atlassian-design-tokens--light-mode)
5. [Atlassian Design Tokens — Dark Mode](#5-atlassian-design-tokens--dark-mode)
6. [Typography — Chữ](#6-typography--chữ)
7. [Spacing — Khoảng cách](#7-spacing--khoảng-cách)
8. [Components — Thành phần UI](#8-components--thành-phần-ui)
9. [Design Principles — Nguyên tắc thiết kế](#9-design-principles--nguyên-tắc-thiết-kế)
10. [CSS Variables Reference](#10-css-variables-reference)

---

## 1. Brand Color — Màu Thương Hiệu Chính

Trello sử dụng **Trello Blue** là màu chủ đạo của thương hiệu.

| Tên                       | HEX       | RGB              | Dùng ở đâu                   |
| ------------------------- | --------- | ---------------- | ---------------------------- |
| **Trello Blue** (Primary) | `#0079BF` | rgb(0, 121, 191) | Logo, CTA chính, nút primary |
| **Dark Navy**             | `#0C3953` | rgb(12, 57, 83)  | Nền tối, header              |
| **Deeper Blue**           | `#026AA7` | rgb(2, 106, 167) | Hover state của primary      |
| **Darkest Blue**          | `#055A8C` | rgb(5, 90, 140)  | Active/pressed state         |
| **Deep Navy**             | `#094C72` | rgb(9, 76, 114)  | Text trên nền sáng           |

### Trello Blue Scale (Tông xanh đầy đủ)

```
#E4F0F6  →  #BCD9EA  →  #8BBDD9  →  #5BA4CF  →  #298FCA  →  #0079BF  →  #026AA7  →  #055A8C  →  #094C72
  100           200           300           400           500         600 (primary)    700           800           900
```

| Scale   | HEX           | Ghi chú                 |
| ------- | ------------- | ----------------------- |
| 100     | `#E4F0F6`     | Nền nhạt, hover nhẹ     |
| 200     | `#BCD9EA`     | Background phụ          |
| 300     | `#8BBDD9`     | Border, divider         |
| 400     | `#5BA4CF`     | Trạng thái disabled     |
| 500     | `#298FCA`     | Secondary action        |
| **600** | **`#0079BF`** | **Primary — màu chính** |
| 700     | `#026AA7`     | Hover                   |
| 800     | `#055A8C`     | Active/pressed          |
| 900     | `#094C72`     | Darkest                 |

---

## 2. Card Label Colors — Màu Nhãn Thẻ

Đây là 10 màu nhãn (labels) dùng trên các card của Trello. Nguồn từ `atlassian.com`.

| Tên màu           | HEX       | Màu sắc          |
| ----------------- | --------- | ---------------- |
| 🟡 Yellow         | `#F2D600` | Màu vàng nổi bật |
| 🟢 Green          | `#70B500` | Xanh lá          |
| 🟠 Orange         | `#FF9F1A` | Cam              |
| 🔴 Red            | `#EB5A46` | Đỏ               |
| 🩵 Sky Blue       | `#00C2E0` | Xanh da trời     |
| 🟣 Purple         | `#C377E0` | Tím              |
| 🩷 Pink           | `#FF78CB` | Hồng             |
| 🌿 Mint           | `#51E898` | Xanh bạc hà      |
| 🔵 Blue (Primary) | `#0079BF` | Xanh dương chính |
| ⚫ Gray           | `#C4C9CC` | Xám trung tính   |

### Label Colors — Extended Palette (đầy đủ tông màu)

Mỗi nhãn có 3 cấp độ đậm nhạt:

```
Đỏ (Red):    #FBEDEB  →  #EB5A46  →  #B04632
Cam (Orange): #FDEFD0  →  #FF9F1A  →  #CF7B00
Vàng (Yellow):#FBF3D5  →  #F2D600  →  #B89000
Xanh lá (Green): #E4F7DA  →  #70B500  →  #519839
Xanh da trời (Sky): #E4F4F9  →  #00C2E0  →  #0098B7
Xanh dương (Blue): #E4F0F6  →  #0079BF  →  #026AA7
Tím (Purple): #F5EAFA  →  #C377E0  →  #89609E
Hồng (Pink): #FCEEF8  →  #FF78CB  →  #C9558F
Xanh bạc hà (Lime): #E6F9F0  →  #51E898  →  #4BBF6B
Xám (Gray): #F5F6F7  →  #C4C9CC  →  #8C9BAB
```

---

## 3. Board Background Colors

Màu nền board Trello (khi không dùng ảnh):

| Tên        | HEX       | Mô tả                    |
| ---------- | --------- | ------------------------ |
| Snow       | `#F4F5F7` | Trắng xám nhạt (default) |
| Ocean      | `#0079BF` | Xanh biển                |
| Sky        | `#00AECC` | Xanh nhạt                |
| Lime       | `#519839` | Xanh lá                  |
| Pink       | `#B04632` | Đỏ/hồng đậm              |
| Tangerine  | `#D29034` | Cam vàng                 |
| Purple     | `#89609E` | Tím                      |
| Cement     | `#838C91` | Xám xi măng              |
| Pumpkin    | `#CD5A91` | Hồng tím                 |
| Board Dark | `#1D2125` | Đen tối (dark mode)      |

---

## 4. Atlassian Design Tokens — Light Mode

Trello dùng **Atlassian Design Tokens** (CSS custom properties bắt đầu bằng `--ds.`) cho màu sắc trong cả light và dark mode.

### Background Tokens

| Token                              | HEX (Light) | Dùng ở đâu                |
| ---------------------------------- | ----------- | ------------------------- |
| `--ds-surface`                     | `#FFFFFF`   | Nền trang chính           |
| `--ds-surface-raised`              | `#FFFFFF`   | Card, dialog nổi          |
| `--ds-surface-overlay`             | `#FFFFFF`   | Modal, popover            |
| `--ds-surface-sunken`              | `#F7F8F9`   | Nền lõm xuống             |
| `--ds-background-neutral`          | `#F1F2F4`   | Nền trung tính            |
| `--ds-background-neutral-hovered`  | `#DFE1E6`   | Hover trên nền trung tính |
| `--ds-background-neutral-pressed`  | `#C7D0DB`   | Pressed                   |
| `--ds-background-brand-bold`       | `#0C66E4`   | Nền nút primary đậm       |
| `--ds-background-selected`         | `#E8F2FF`   | Item được chọn            |
| `--ds-background-selected-bold`    | `#0C66E4`   | Nút selected đậm          |
| `--ds-background-danger`           | `#FFEDEB`   | Nền lỗi/danger            |
| `--ds-background-danger-bold`      | `#CA3521`   | Nền danger đậm            |
| `--ds-background-success`          | `#DCFFF1`   | Nền success               |
| `--ds-background-success-bold`     | `#1F845A`   | Nền success đậm           |
| `--ds-background-warning`          | `#FFF7D6`   | Nền warning               |
| `--ds-background-warning-bold`     | `#F5CD47`   | Nền warning đậm           |
| `--ds-background-information`      | `#E8F2FF`   | Nền thông tin             |
| `--ds-background-information-bold` | `#0C66E4`   | Nền info đậm              |
| `--ds-background-discovery`        | `#F3F0FF`   | Nền khám phá              |
| `--ds-background-discovery-bold`   | `#6E5DC6`   | Nền discovery đậm         |

### Text Tokens

| Token                   | HEX (Light) | Dùng ở đâu            |
| ----------------------- | ----------- | --------------------- |
| `--ds-text`             | `#172B4D`   | Văn bản mặc định      |
| `--ds-text-subtle`      | `#44546F`   | Văn bản phụ           |
| `--ds-text-subtlest`    | `#626F86`   | Placeholder, metadata |
| `--ds-text-inverse`     | `#FFFFFF`   | Chữ trên nền tối      |
| `--ds-text-disabled`    | `#8590A2`   | Chữ bị vô hiệu hóa    |
| `--ds-text-brand`       | `#0C66E4`   | Chữ màu brand         |
| `--ds-text-selected`    | `#0C66E4`   | Chữ khi được chọn     |
| `--ds-text-danger`      | `#AE2A19`   | Chữ lỗi               |
| `--ds-text-warning`     | `#974F0C`   | Chữ cảnh báo          |
| `--ds-text-success`     | `#216E4E`   | Chữ thành công        |
| `--ds-text-information` | `#0055CC`   | Chữ thông tin         |
| `--ds-text-discovery`   | `#5E4DB2`   | Chữ khám phá          |
| `--ds-link`             | `#0C66E4`   | Màu liên kết          |
| `--ds-link-pressed`     | `#0055CC`   | Liên kết được nhấn    |

### Border Tokens

| Token                  | HEX (Light) | Dùng ở đâu           |
| ---------------------- | ----------- | -------------------- |
| `--ds-border`          | `#B3B9C4`   | Viền mặc định        |
| `--ds-border-bold`     | `#758195`   | Viền đậm             |
| `--ds-border-input`    | `#8590A2`   | Viền input field     |
| `--ds-border-disabled` | `#C7D0DB`   | Viền bị disable      |
| `--ds-border-focused`  | `#388BFF`   | Viền focus (outline) |
| `--ds-border-brand`    | `#0C66E4`   | Viền màu brand       |
| `--ds-border-danger`   | `#E34935`   | Viền lỗi             |
| `--ds-border-warning`  | `#D97008`   | Viền cảnh báo        |
| `--ds-border-success`  | `#22A06B`   | Viền thành công      |

### Icon Tokens

| Token                | HEX (Light) | Dùng ở đâu        |
| -------------------- | ----------- | ----------------- |
| `--ds-icon`          | `#44546F`   | Icon mặc định     |
| `--ds-icon-subtle`   | `#626F86`   | Icon phụ          |
| `--ds-icon-inverse`  | `#FFFFFF`   | Icon trên nền tối |
| `--ds-icon-disabled` | `#8590A2`   | Icon bị disable   |
| `--ds-icon-brand`    | `#0C66E4`   | Icon màu brand    |
| `--ds-icon-danger`   | `#AE2A19`   | Icon lỗi          |
| `--ds-icon-warning`  | `#974F0C`   | Icon cảnh báo     |
| `--ds-icon-success`  | `#216E4E`   | Icon thành công   |

---

## 5. Atlassian Design Tokens — Dark Mode

| Token                          | HEX (Dark) | Ghi chú               |
| ------------------------------ | ---------- | --------------------- |
| `--ds-surface`                 | `#1D2125`  | Nền trang tối         |
| `--ds-surface-raised`          | `#22272B`  | Card, raised elements |
| `--ds-surface-overlay`         | `#282E33`  | Modal, popover        |
| `--ds-surface-sunken`          | `#161A1D`  | Nền lõm tối           |
| `--ds-background-neutral`      | `#2C333A`  | Nền neutral           |
| `--ds-text`                    | `#B6C2CF`  | Chữ mặc định (tối)    |
| `--ds-text-subtle`             | `#8C9BAB`  | Chữ phụ (tối)         |
| `--ds-text-subtlest`           | `#738496`  | Chữ mờ nhất (tối)     |
| `--ds-background-brand-bold`   | `#579DFF`  | Nền nút primary (tối) |
| `--ds-background-danger-bold`  | `#F87168`  | Danger (tối)          |
| `--ds-background-success-bold` | `#4BCE97`  | Success (tối)         |
| `--ds-background-warning-bold` | `#F5CD47`  | Warning (tối)         |
| `--ds-border`                  | `#738496`  | Viền mặc định (tối)   |

---

## 6. Typography — Chữ

### Font Family

| Vai trò               | Font                                                                | Ghi chú                                                |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| **Brand / Marketing** | `Charlie Sans`                                                      | Custom font của Atlassian (dùng cho logo và marketing) |
| **In-app UI**         | `Atlassian Sans`                                                    | Font hệ thống cho giao diện ứng dụng                   |
| **Code / Mono**       | `Atlassian Mono`                                                    | Dùng cho code blocks                                   |
| **Fallback**          | `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` | System font stack                                      |

```css
/* CSS Font Stack cho Trello UI */
font-family:
  -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial,
  sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji';
```

### Type Scale

| Token                    | Size    | Line Height | Weight | Dùng ở đâu      |
| ------------------------ | ------- | ----------- | ------ | --------------- |
| `font.heading.xxlarge`   | 29px    | 32px        | 600    | Page title lớn  |
| `font.heading.xlarge`    | 24px    | 28px        | 600    | Section heading |
| `font.heading.large`     | 20px    | 24px        | 600    | Card heading    |
| `font.heading.medium`    | 16px    | 20px        | 600    | Sub-heading     |
| `font.heading.small`     | 14px    | 16px        | 600    | Small heading   |
| `font.heading.xsmall`    | 12px    | 16px        | 700    | Micro label     |
| `font.body.large`        | 16px    | 24px        | 400    | Body text lớn   |
| `font.body`              | 14px    | 20px        | 400    | Body mặc định   |
| `font.body.small`        | 12px    | 16px        | 400    | Text phụ nhỏ    |
| `font.body.UNSAFE_small` | 11px    | 14px        | 400    | Micro text      |
| `font.code`              | 0.875em | —           | 400    | Code inline     |

### Font Weight

| Weight   | Giá trị | Dùng ở đâu             |
| -------- | ------- | ---------------------- |
| Regular  | `400`   | Body text, description |
| Medium   | `500`   | Sub-heading, label     |
| Semibold | `600`   | Heading, title         |
| Bold     | `700`   | Emphasis, badge        |

---

## 7. Spacing — Khoảng Cách

Trello dùng hệ thống spacing theo bội số của **4px** (base grid = 4px).

| Token        | Value    | px   |
| ------------ | -------- | ---- |
| `space.025`  | 0.125rem | 2px  |
| `space.050`  | 0.25rem  | 4px  |
| `space.075`  | 0.375rem | 6px  |
| `space.100`  | 0.5rem   | 8px  |
| `space.150`  | 0.75rem  | 12px |
| `space.200`  | 1rem     | 16px |
| `space.250`  | 1.25rem  | 20px |
| `space.300`  | 1.5rem   | 24px |
| `space.400`  | 2rem     | 32px |
| `space.500`  | 2.5rem   | 40px |
| `space.600`  | 3rem     | 48px |
| `space.800`  | 4rem     | 64px |
| `space.1000` | 5rem     | 80px |

```css
/* Ví dụ sử dụng */
.card {
  padding: var(--ds-space-100); /* 8px */
  gap: var(--ds-space-050); /* 4px */
  margin-bottom: var(--ds-space-200); /* 16px */
}
```

### Border Radius

| Token                  | Value  | Dùng ở đâu            |
| ---------------------- | ------ | --------------------- |
| `border.radius`        | `3px`  | Default (card, input) |
| `border.radius.050`    | `2px`  | Tag, badge nhỏ        |
| `border.radius.100`    | `4px`  | Button, input         |
| `border.radius.200`    | `8px`  | Card, panel           |
| `border.radius.300`    | `12px` | Modal                 |
| `border.radius.400`    | `16px` | Large container       |
| `border.radius.circle` | `50%`  | Avatar, icon tròn     |

---

## 8. Components — Thành Phần UI

### 🔘 Buttons

```
┌─────────────────────────────────────────────────────────┐
│  Primary Button         Secondary Button    Danger Button│
│  [██ Save Changes]      [  Cancel  ]        [  Delete  ]│
│  bg: #0079BF            bg: transparent     bg: #EB5A46  │
│  text: #FFFFFF          text: #172B4D       text: #FFFFFF│
│  hover: #026AA7         border: #B3B9C4                  │
└─────────────────────────────────────────────────────────┘
```

| Loại            | Background    | Text      | Border    | Hover BG  |
| --------------- | ------------- | --------- | --------- | --------- |
| **Primary**     | `#0079BF`     | `#FFFFFF` | none      | `#026AA7` |
| **Secondary**   | `transparent` | `#172B4D` | `#B3B9C4` | `#F1F2F4` |
| **Danger**      | `#EB5A46`     | `#FFFFFF` | none      | `#B04632` |
| **Subtle/Link** | `transparent` | `#0079BF` | none      | `#E4F0F6` |
| **Disabled**    | `#F1F2F4`     | `#8590A2` | none      | —         |

Button sizing:

- Height: `32px` (default), `40px` (large), `24px` (small)
- Padding: `8px 12px` (default)
- Border radius: `3px`

---

### 🃏 Card (Thẻ Trello)

```
┌────────────────────────────────────────────┐
│  🏷️ Label (xanh/đỏ/vàng...)               │
│                                            │
│  Card Title — medium weight, 14px          │
│                                            │
│  📎 2  💬 3  ✅ 1/3  📅 Jan 15            │
└────────────────────────────────────────────┘
```

| Thuộc tính    | Giá trị                               |
| ------------- | ------------------------------------- |
| Background    | `#FFFFFF` (light) / `#22272B` (dark)  |
| Border radius | `3px`                                 |
| Box shadow    | `0 1px 0 rgba(9,30,66,.25)`           |
| Padding       | `8px`                                 |
| Min height    | `20px`                                |
| Hover shadow  | `0 4px 8px rgba(9,30,66,.15)`         |
| Label height  | `8px` (compact) / `16px` (text label) |

---

### 📋 List (Danh sách)

| Thuộc tính            | Giá trị                              |
| --------------------- | ------------------------------------ |
| Background            | `#F1F2F4` (light) / `#282E33` (dark) |
| Width                 | `272px` (fixed)                      |
| Border radius         | `3px`                                |
| Padding               | `8px`                                |
| Max height            | `calc(100vh - 200px)`                |
| List header font-size | `14px`, font-weight `600`            |

---

### 🔤 Input Fields

| State    | Border          | Background | Text      |
| -------- | --------------- | ---------- | --------- |
| Default  | `#8590A2`       | `#FFFFFF`  | `#172B4D` |
| Focus    | `#388BFF` (2px) | `#FFFFFF`  | `#172B4D` |
| Error    | `#E34935`       | `#FFEDEB`  | `#172B4D` |
| Disabled | `#C7D0DB`       | `#F7F8F9`  | `#8590A2` |

- Height: `32px`
- Padding: `8px 12px`
- Border radius: `3px`
- Font size: `14px`

---

### 🏷️ Badge / Lozenge

| Loại        | Background | Text      |
| ----------- | ---------- | --------- |
| Default     | `#DFE1E6`  | `#172B4D` |
| Success     | `#DCFFF1`  | `#216E4E` |
| Danger      | `#FFEDEB`  | `#AE2A19` |
| Warning     | `#FFF7D6`  | `#974F0C` |
| Information | `#E8F2FF`  | `#0055CC` |
| Discovery   | `#F3F0FF`  | `#5E4DB2` |

- Border radius: `2px` (full rounded for lozenge)
- Font size: `11px`, font-weight `700`
- Text transform: `uppercase`
- Padding: `2px 4px`

---

### 🧭 Navigation / Header

| Thành phần         | Màu sắc                              |
| ------------------ | ------------------------------------ |
| Top nav background | `#026AA7` (blue gradient)            |
| Top nav text       | `#FFFFFF`                            |
| Sidebar background | `#FFFFFF` (light) / `#1D2125` (dark) |
| Sidebar hover      | `rgba(0,0,0,0.08)`                   |
| Active nav item    | `rgba(0,0,0,0.12)`                   |

---

### 🎨 Avatar

| Size   | px   | CSS class    |
| ------ | ---- | ------------ |
| xsmall | 16px | `.avatar-xs` |
| small  | 24px | `.avatar-sm` |
| medium | 32px | `.avatar-md` |
| large  | 40px | `.avatar-lg` |
| xlarge | 56px | `.avatar-xl` |

- Shape: tròn (`border-radius: 50%`)
- Border: `2px solid rgba(255,255,255,0.8)` khi stack

---

### 📊 Progress Bar

| State              | Color     |
| ------------------ | --------- |
| Track (background) | `#DFE1E6` |
| Fill (progress)    | `#5BA4CF` |
| Complete           | `#70B500` |
| Overdue            | `#EB5A46` |

---

## 9. Design Principles — Nguyên Tắc Thiết Kế

Nachos — Trello's Design System — được xây dựng trên các nguyên tắc:

### Core Principles

1. **Clarity First** — Rõ ràng trước tiên
   - Mọi hành động phải hiển thị rõ ràng mục đích
   - Thông tin quan trọng không bị ẩn hoặc khó tìm

2. **Consistency** — Nhất quán
   - Dùng cùng component cho cùng chức năng
   - Màu sắc và typography tuân theo design token

3. **Accessibility** — Khả năng tiếp cận
   - Tỷ lệ tương phản tối thiểu: **4.5:1** (WCAG AA) cho body text
   - Tỷ lệ tương phản tối thiểu: **3:1** cho large text và UI elements
   - Không dùng màu làm thông tin duy nhất (color-blind friendly)

4. **Playful but Professional** — Vui tươi nhưng chuyên nghiệp
   - Tone thân thiện, không quá nghiêm túc
   - Sử dụng icon và illustration một cách có chủ đích

5. **Flexibility** — Linh hoạt
   - Design phải hoạt động ở light mode và dark mode
   - Responsive trên mọi kích thước màn hình

---

## 10. CSS Variables Reference

### Cách sử dụng trong CSS

```css
/* Màu nền và text cơ bản */
body {
  background-color: var(--ds-surface, #ffffff);
  color: var(--ds-text, #172b4d);
}

/* Card Trello */
.card {
  background: var(--ds-surface-raised, #ffffff);
  border-radius: 3px;
  box-shadow: var(--ds-shadow-raised, 0 1px 0 rgba(9, 30, 66, 0.25));
  padding: var(--ds-space-100, 8px);
}

/* Nút Primary */
.button-primary {
  background: var(--ds-background-brand-bold, #0079bf);
  color: var(--ds-text-inverse, #ffffff);
  border-radius: 3px;
  padding: 6px 12px;
  font-weight: 600;
}

.button-primary:hover {
  background: var(--ds-background-brand-bold-hovered, #026aa7);
}

/* Input field */
.input {
  border: 2px solid var(--ds-border-input, #8590a2);
  background: var(--ds-surface, #ffffff);
  color: var(--ds-text, #172b4d);
  border-radius: 3px;
  padding: 8px 12px;
  font-size: 14px;
}

.input:focus {
  border-color: var(--ds-border-focused, #388bff);
  outline: none;
}
```

### Shadow Tokens

| Token                  | Value                                       | Dùng ở đâu          |
| ---------------------- | ------------------------------------------- | ------------------- |
| `--ds-shadow-card`     | `0 1px 0 #091E4240`                         | Card mặc định       |
| `--ds-shadow-raised`   | `0 1px 1px #091E4240, 0 0 1px #091E4221`    | Raised element      |
| `--ds-shadow-overlay`  | `0 8px 12px #091E4226, 0 0 1px #091E424F`   | Modal, popover      |
| `--ds-shadow-overflow` | `0 0 8px -2px #091E4240, 0 0 1px #091E424F` | Overflow scrollable |

---

## 📦 Nguồn Tài Nguyên

| Tài nguyên               | URL                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------- |
| Atlassian Design System  | https://atlassian.design                                                                |
| Trello Design Tokens     | https://atlassian.design/components/tokens/all-tokens                                   |
| Trello Style Guide (Dev) | https://developer.atlassian.com/cloud/trello/guides/power-ups/style-guide/              |
| Base CSS (Power-Up)      | https://p.trellocdn.com/power-up.css                                                    |
| Nachos Design System     | https://adele.uxpin.com/trello-nachos                                                   |
| Brand Colors Reference   | https://www.atlassian.com/blog/trello/the-how-and-why-behind-trellos-visual-brand-guide |

---

## 🔧 Quick Setup

```html
<!-- Thêm vào <head> để dùng Trello base styles -->
<link rel="stylesheet" href="https://p.trellocdn.com/power-up.min.css" />
```

```css
/* Các màu nhanh hay dùng nhất */
:root {
  --trello-blue: #0079bf;
  --trello-blue-hover: #026aa7;
  --trello-blue-light: #e4f0f6;
  --trello-dark-navy: #0c3953;
  --trello-text: #172b4d;
  --trello-text-subtle: #44546f;
  --trello-surface: #ffffff;
  --trello-bg-neutral: #f1f2f4;
  --trello-border: #dfe1e6;
  --trello-green: #70b500;
  --trello-red: #eb5a46;
  --trello-yellow: #f2d600;
  --trello-orange: #ff9f1a;
  --trello-purple: #c377e0;
  --trello-pink: #ff78cb;
  --trello-sky: #00c2e0;
  --trello-mint: #51e898;
  --trello-gray: #c4c9cc;
}
```

---

_Tài liệu được tổng hợp từ Atlassian Design System, Trello Developer Docs, và Nachos Design System. Cập nhật: 2024–2025._
