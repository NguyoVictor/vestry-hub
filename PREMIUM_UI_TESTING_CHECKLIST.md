# Premium UI Sweep — Testing Checklist

## Pre-Testing Setup

- [ ] Clear Vite cache: `rm -rf node_modules/.vite`
- [ ] Verify dev server is running on port 8080
- [ ] Open browser to `http://localhost:8080`
- [ ] Have both light and dark mode ready to test

---

## 1. Core UI Components

### Buttons
- [ ] Primary button has violet background (`bg-violet-500`)
- [ ] Hover animation scales to 1.02
- [ ] Tap animation scales to 0.97
- [ ] Rounded corners are `rounded-xl`
- [ ] Outline variant has softer border (`border-border/60`)
- [ ] Ghost variant has subtle hover (`hover:bg-muted/60`)
- [ ] Dark mode: All variants look good

### Form Inputs
- [ ] Input fields have `rounded-xl` corners
- [ ] Border is softer (`border-border/70`)
- [ ] Focus ring is violet with 20% opacity (`ring-primary/20`)
- [ ] Smooth transition on focus
- [ ] Textarea has same styling
- [ ] Select dropdown has `rounded-xl`
- [ ] Dark mode: All inputs look good

### Checkboxes & Switches
- [ ] Checkbox checked state is violet (not orange)
- [ ] Checkbox has softer border
- [ ] Switch checked state is violet
- [ ] Focus rings are violet with 20% opacity
- [ ] Dark mode: Both look good

---

## 2. Layout Components

### Cards
- [ ] Cards have `rounded-xl` corners
- [ ] Borders are softer (`border-border/50`)
- [ ] Subtle shadow (`shadow-sm`)
- [ ] Hover shadow increases on interactive cards
- [ ] Dark mode: Cards look good

### Tabs
- [ ] Tab bar has `rounded-xl` background
- [ ] Background is softer (`bg-muted/60`)
- [ ] Active tab has white background with shadow
- [ ] Inactive tabs have hover state
- [ ] Smooth transitions between tabs
- [ ] Dark mode: Tabs look good

### Dialogs
- [ ] Dialog has `rounded-xl` corners
- [ ] Border is softer (`border-border/50`)
- [ ] Close button has `rounded-lg`
- [ ] Focus ring is violet
- [ ] Dark mode: Dialog looks good

### Dropdowns
- [ ] Dropdown menu has `rounded-xl` corners
- [ ] Menu items have `rounded-lg`
- [ ] Hover states work smoothly
- [ ] Dark mode: Dropdown looks good

### Popovers
- [ ] Popover has `rounded-xl` corners
- [ ] Border is softer
- [ ] Dark mode: Popover looks good

---

## 3. Sidebar Navigation

### Section Headers
- [ ] Text is smaller (`text-[10px]`)
- [ ] Color is softer (`text-muted-foreground/60`)
- [ ] Proper spacing (`mt-4`)
- [ ] Dark mode: Headers look good

### Nav Items
- [ ] Idle state: muted text, subtle hover
- [ ] Active state: violet background (`bg-violet-100`)
- [ ] Active text: violet (`text-violet-700`)
- [ ] Active icon: violet
- [ ] Smooth transitions
- [ ] Dark mode: Active state is `bg-violet-950/40`, text is `text-violet-300`

### User Avatar
- [ ] Background is violet (not orange)
- [ ] `bg-violet-100` in light mode
- [ ] `bg-violet-950/40` in dark mode
- [ ] Text color is violet

### Church Logo
- [ ] Fallback background is violet (`bg-violet-500`)
- [ ] White text
- [ ] Dark mode: Logo looks good

---

## 4. Page-Specific Tests

### Dashboard
- [ ] Page loads without errors
- [ ] StatCards display correctly
- [ ] Charts render properly
- [ ] All cards have new styling
- [ ] Dark mode: Dashboard looks good

### Members Page
- [ ] Page loads without errors
- [ ] Member cards have new styling
- [ ] Search input has new styling
- [ ] Filters work correctly
- [ ] Add Member button is violet
- [ ] Dark mode: Members page looks good

### Settings Pages
- [ ] All settings pages load
- [ ] Forms have new styling
- [ ] Tabs have new styling
- [ ] Switches and checkboxes are violet
- [ ] Dark mode: Settings look good

### Media Pages
- [ ] Song Library loads
- [ ] Asset Management loads
- [ ] Sermon Preparation loads
- [ ] All tabs have new styling
- [ ] Dark mode: Media pages look good

---

## 5. Interactions

### Hover States
- [ ] Buttons scale on hover
- [ ] Cards lift on hover (if interactive)
- [ ] Nav items highlight on hover
- [ ] Dropdown items highlight on hover
- [ ] All transitions are smooth (150-200ms)

### Focus States
- [ ] All focusable elements have visible focus ring
- [ ] Focus ring is violet with 20% opacity
- [ ] Keyboard navigation works
- [ ] Tab order is logical

### Animations
- [ ] Button press animation (scale 0.97)
- [ ] Page transitions work
- [ ] No janky animations
- [ ] Smooth 60fps performance

---

## 6. Dark Mode

### Global
- [ ] Toggle dark mode from settings
- [ ] All components adapt correctly
- [ ] No white flashes
- [ ] Text remains readable
- [ ] Borders remain visible

### Specific Components
- [ ] Sidebar: violet active states work
- [ ] Cards: proper dark background
- [ ] Inputs: proper dark styling
- [ ] Buttons: proper dark styling
- [ ] Tabs: proper dark styling
- [ ] Dialogs: proper dark styling

---

## 7. Responsive Design

### Mobile (< 640px)
- [ ] Sidebar collapses correctly
- [ ] Forms stack properly
- [ ] Cards stack properly
- [ ] Buttons are touch-friendly
- [ ] No horizontal scroll

### Tablet (640px - 1024px)
- [ ] Layout adapts correctly
- [ ] Sidebar behavior is appropriate
- [ ] Grid layouts adjust

### Desktop (> 1024px)
- [ ] Full layout displays
- [ ] Sidebar is expanded
- [ ] Multi-column grids work

---

## 8. Browser Compatibility

### Chrome/Edge
- [ ] All styles render correctly
- [ ] Animations are smooth
- [ ] No console errors

### Firefox
- [ ] All styles render correctly
- [ ] Animations are smooth
- [ ] No console errors

### Safari
- [ ] All styles render correctly
- [ ] Animations are smooth
- [ ] No console errors

---

## 9. Performance

### Load Time
- [ ] Initial page load is fast
- [ ] No layout shift
- [ ] Fonts load properly
- [ ] No FOUC (Flash of Unstyled Content)

### Runtime
- [ ] Smooth scrolling
- [ ] No lag on interactions
- [ ] Animations are 60fps
- [ ] No memory leaks

---

## 10. Regression Testing

### Functionality
- [ ] All forms submit correctly
- [ ] All buttons trigger correct actions
- [ ] All links navigate correctly
- [ ] All modals open/close correctly
- [ ] All dropdowns work correctly

### Data
- [ ] Data fetching works
- [ ] Data mutations work
- [ ] Real-time updates work
- [ ] Error handling works

---

## 11. Edge Cases

### Empty States
- [ ] Empty states display correctly
- [ ] Icons and text are centered
- [ ] CTAs are visible

### Loading States
- [ ] Skeletons display correctly
- [ ] Loading spinners work
- [ ] No content flash

### Error States
- [ ] Error messages display
- [ ] Error styling is clear
- [ ] Recovery actions work

---

## Known Issues to Watch For

1. **Tabs**: Ensure the animated indicator doesn't cause layout shift
2. **Buttons**: Verify scale animation doesn't cause text to blur
3. **Sidebar**: Check that violet active states are visible in both modes
4. **Forms**: Ensure focus rings don't get cut off by overflow
5. **Cards**: Verify shadow transitions don't cause repaints

---

## Sign-Off

- [ ] All critical paths tested
- [ ] No blocking issues found
- [ ] Dark mode fully functional
- [ ] Performance is acceptable
- [ ] Ready for production

**Tester**: _______________
**Date**: _______________
**Browser**: _______________
**OS**: _______________

---

## Rollback Plan

If critical issues are found:

1. Revert CSS variables in `src/index.css`
2. Revert component files one by one
3. Clear Vite cache: `rm -rf node_modules/.vite`
4. Restart dev server

**Note**: All changes are design-only. No functionality should be broken.
