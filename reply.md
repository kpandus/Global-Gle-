# Assessment of Mobile View Gap

Yes, it is **true**—there is a noticeable gap between the "What We Do" section and the 3D character on mobile. Based on the code analysis, this is caused by a few specific factors:

### 1. Hardcoded Scroll Offset (`mOffset`)
In `index.vue`, there is a variable called `mOffset` that controls when the 3D character starts appearing on mobile:
```javascript
const mOffset = isMobile ? (baseH + 1500) : 0 
```
This adds a **1500px delay** (plus one full viewport height) before the character even begins to fade in. Since the "What We Do" section (Glass Box) ends much earlier than that, the user has to scroll through a "dead zone" where the screen remains empty.

### 2. Large Section Padding
The `#mobile-glass-box` section (which contains the "What We Do" component) has a very large bottom padding:
```css
#mobile-glass-box {
  padding: 2rem 1.5rem 8rem; /* 8rem is ~128px of empty space */
  background: #0a0d14;
}
```
This padding pushes the next section (where the character lives) further down, compounding the gap.

### 3. Animation Progress Start
The character's appearance starts at:
```javascript
const sceneStart = (hh * 0.05) + mOffset
```
Because `mOffset` is so high, the character stays at `opacity: 0` for a long duration of the scroll, making the transition feel disconnected from the preceding content.

### Summary
The gap is a result of **intentional but perhaps overly conservative** spacing in the scroll logic and CSS. Reducing the `1500` value in `mOffset` or the `8rem` padding would significantly tighten the layout and make the experience feel more continuous.
