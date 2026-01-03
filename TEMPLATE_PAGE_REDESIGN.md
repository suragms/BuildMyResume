# Template Page Redesign (Dark Mode Premium)

## 🎨 New Design System
Implemented a completely new **Split-Screen Design** to match the reference image.

### 1. Left Panel: Template Gallery
- **Light Theme**: Clean off-white background (`#f8fafc`).
- **Cards**:
  - **White Cards** with rounded corners (`12px`).
  - **Selected State**: Green border + Green Checkmark Circle (Top Right).
  - **Badges**: "Recommended" (Green, Top Left) and "Price" (Amber).
  - **ATS Score**: Pill badge in the footer.
  - **Skeleton Preview**: Abstract text lines to represent layout content.

### 2. Right Panel: Live Preview
- **Dark Theme**: Deep Charcoal background (`#0f172a` / `#1e293b`).
- **Top Control Bar**:
  - "Page 1" badge.
  - "Fit" / "Zoom" controls (Simulated UI).
- **Realistic Paper**:
  - The Resume Preview floats with a realistic drop shadow.
  - Scaled down (`0.65x`) to fit the viewport perfectly.
- **Floating CTA**:
  - "Continue to Download" button floats at the bottom right.

## 🛠️ Technical Changes
1. **New CSS File**: Created `src/design_overrides.css` to isolate these complex styles and avoid breaking existing legacy styles.
2. **Structure Refactor**:
   - Split `.template-layout` into explicit 2-column grid (`380px 1fr`).
   - Replaced old `.tpl-preview` HTML with new `.tpl-preview-thumb` structure.
   - Added `Maximize` icon from `lucide-react`.

## 🚀 How to Verify
1. Go to "Choose Template" step.
2. You should see the **Dark Right Panel** immediately.
3. Click different templates on the left.
4. See the **Green Checkmark** animate in.
5. Observe the **"ATS 95%"** pill on cards.
6. The Resume Preview on the right should look like a physical paper page on a dark desk.
