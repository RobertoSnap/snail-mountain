# daisyUI Skill

Use when building UI components with daisyUI classes. daisyUI is a Tailwind CSS component library that provides semantic class names for common UI patterns.

## Setup

daisyUI is installed as a Tailwind CSS v4 plugin in `src/routes/layout.css`:

```css
@import 'tailwindcss';
@plugin 'daisyui';
```

## Themes

Configure themes in CSS:

```css
@plugin 'daisyui' {
	themes:
		light --default,
		dark --prefersdark;
}
```

Apply themes with `data-theme` attribute on any element:

```html
<html data-theme="cupcake"></html>
```

Themes can be nested — any element can have its own `data-theme`.

Custom themes:

```css
@plugin 'daisyui/theme' {
	name: 'mytheme';
	--color-primary: oklch(55% 0.3 240);
	--color-secondary: oklch(70% 0.25 200);
}
```

Built-in themes: light, dark, cupcake, bumblebee, emerald, corporate, synthwave, retro, cyberpunk, valentine, halloween, garden, forest, aqua, lofi, pastel, fantasy, wireframe, black, luxury, dracula, cmyk, autumn, business, acid, lemonade, night, coffee, winter, dim, nord, sunset. Use `themes: all` to enable all.

## Semantic Colors

Use these instead of raw Tailwind colors for theme-aware styling:

- `primary` / `primary-content` — main brand color
- `secondary` / `secondary-content` — secondary brand color
- `accent` / `accent-content` — accent brand color
- `neutral` / `neutral-content` — dark unsaturated color
- `base-100`, `base-200`, `base-300` / `base-content` — surface/background colors
- `info` / `info-content` — informative messages
- `success` / `success-content` — success messages
- `warning` / `warning-content` — warning messages
- `error` / `error-content` — error/danger messages

Usage: `bg-primary`, `text-primary-content`, `border-secondary`, `text-base-content/50` (with opacity).

## Components

### Actions

- **Button**: `<button class="btn">`, variants: `btn-primary`, `btn-secondary`, `btn-accent`, `btn-ghost`, `btn-link`, `btn-outline`, sizes: `btn-lg`, `btn-sm`, `btn-xs`
- **Dropdown**: `<div class="dropdown">` with `<ul class="dropdown-content menu">`
- **Modal**: `<dialog class="modal">` with `<div class="modal-box">`, use `.showModal()` to open
- **Swap**: `<label class="swap">` for toggle content (e.g., icons)
- **Theme Controller**: checkbox/radio to switch themes

### Data Display

- **Accordion**: `<div class="collapse">` with `collapse-title` and `collapse-content`
- **Avatar**: `<div class="avatar">` with `<img>` inside
- **Badge**: `<span class="badge">`, variants: `badge-primary`, `badge-outline`, etc.
- **Card**: `<div class="card">` with `card-body`, `card-title`, `card-actions`
- **Carousel**: `<div class="carousel">` with `carousel-item`
- **Chat bubble**: `<div class="chat chat-start">` with `chat-bubble`
- **Collapse**: `<div class="collapse">` for show/hide content
- **Countdown**: `<span class="countdown">` with `--value` CSS variable
- **Kbd**: `<kbd class="kbd">`
- **List**: `<ul class="list">` with `<li class="list-row">`
- **Stat**: `<div class="stats">` with `stat`, `stat-title`, `stat-value`, `stat-desc`
- **Table**: `<table class="table">` with standard table markup
- **Timeline**: `<ul class="timeline">` with `timeline-start`, `timeline-middle`, `timeline-end`

### Navigation

- **Breadcrumbs**: `<div class="breadcrumbs">` with `<ul>`
- **Dock**: `<div class="dock">` for bottom navigation
- **Link**: `<a class="link">`, variants: `link-primary`, `link-hover`
- **Menu**: `<ul class="menu">` with `<li>` items
- **Navbar**: `<div class="navbar">` with `navbar-start`, `navbar-center`, `navbar-end`
- **Pagination**: `<div class="join">` with `<button class="join-item btn">`
- **Steps**: `<ul class="steps">` with `<li class="step">`
- **Tabs**: `<div role="tablist" class="tabs tabs-bordered">`

### Feedback

- **Alert**: `<div role="alert" class="alert">`, variants: `alert-info`, `alert-success`, `alert-warning`, `alert-error`
- **Loading**: `<span class="loading loading-spinner">`, types: `loading-dots`, `loading-ring`, `loading-ball`, `loading-bars`, `loading-infinity`
- **Progress**: `<progress class="progress" value="70" max="100">`
- **Radial progress**: `<div class="radial-progress" style="--value:70;">`
- **Skeleton**: `<div class="skeleton h-4 w-full">`
- **Toast**: `<div class="toast">` with positioning: `toast-start`, `toast-center`, `toast-end`, `toast-top`, `toast-middle`, `toast-bottom`
- **Tooltip**: `<div class="tooltip" data-tip="hello">`

### Data Input

- **Calendar**: `<div class="calendar">`
- **Checkbox**: `<input type="checkbox" class="checkbox">`, variants: `checkbox-primary`, etc.
- **Fieldset**: `<fieldset class="fieldset">` with `fieldset-legend`
- **File Input**: `<input type="file" class="file-input">`
- **Filter**: `<div class="filter">` for filter chips
- **Label**: `<label class="label">`
- **Radio**: `<input type="radio" class="radio">`
- **Range**: `<input type="range" class="range">`
- **Rating**: `<div class="rating">` with radio inputs
- **Select**: `<select class="select">`
- **Text Input**: `<input type="text" class="input">`, variants: `input-bordered`, `input-primary`
- **Textarea**: `<textarea class="textarea">`
- **Toggle**: `<input type="checkbox" class="toggle">`
- **Validator**: `<div class="validator">` for form validation display

### Layout

- **Divider**: `<div class="divider">` (horizontal) or `divider-horizontal` (vertical)
- **Drawer**: `<div class="drawer">` with `drawer-toggle`, `drawer-content`, `drawer-side`
- **Footer**: `<footer class="footer">`
- **Hero**: `<div class="hero">` with `hero-content`
- **Indicator**: `<div class="indicator">` with `<span class="indicator-item badge">`
- **Join**: `<div class="join">` to group items together
- **Mask**: `<img class="mask mask-squircle">` for shaped images
- **Stack**: `<div class="stack">` for stacking elements

### Mockup

- **Browser**: `<div class="mockup-browser">`
- **Code**: `<div class="mockup-code">`
- **Phone**: `<div class="mockup-phone">`
- **Window**: `<div class="mockup-window">`

## Common Patterns

Size modifiers: `lg`, `md`, `sm`, `xs` (e.g., `btn-lg`, `input-sm`)
State modifiers: `active`, `disabled`, `focus` (e.g., `btn-active`)
Responsive: use standard Tailwind breakpoints (`sm:`, `md:`, `lg:`)

## Important Notes

- Always use daisyUI semantic color classes (`btn-primary`, `bg-base-200`) instead of raw Tailwind colors for theme compatibility
- daisyUI classes compose with Tailwind utility classes freely
- Check https://daisyui.com/components/ for full examples of each component
