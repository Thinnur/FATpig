# UI Components & Theming

Complete documentation for UI components, theme manager, and styling utilities.

---

## Table of Contents

1. [Theme System](#1-theme-system)
2. [ThemeManager Class](#2-thememanager-class)
3. [UI Components](#3-ui-components)
4. [Number Formatters](#4-number-formatters)
5. [Snackbar Helper](#5-snackbar-helper)
6. [Page Components](#6-page-components)
7. [Code Snippets](#7-code-snippets)

---

## 1. Theme System

### Available Themes

| Theme ID | Name   | Primary | Accent  | Glow    |
| -------- | ------ | ------- | ------- | ------- |
| `ungu`   | Purple | #3730A3 | #4F46E5 | #8B5CF6 |
| `hijau`  | Green  | #047857 | #10B981 | #34D399 |
| `biru`   | Blue   | #0369A1 | #0EA5E9 | #38BDF8 |
| `pink`   | Pink   | #BE185D | #EC4899 | #F472B6 |
| `orange` | Orange | #C2410C | #F97316 | #FB923C |

### Color Palette Structure

```python
# Each theme provides these colors
colors = {
    # Brand colors
    "PRIMARY": str,        # Main brand color
    "ACCENT": str,         # Secondary/highlight color
    "GLOW": str,           # Glow/shadow color

    # Background colors
    "BG": str,             # Page background
    "SURFACE": str,        # Card/container background
    "SURFACE_DIM": str,    # Dimmed surface

    # Text colors
    "TEXT": str,           # Primary text
    "TEXT_SECONDARY": str, # Secondary/muted text
    "TEXT_HINT": str,      # Hint/placeholder text

    # Border colors
    "BORDER": str,         # Default border
    "BORDER_LIGHT": str,   # Light border

    # Status colors
    "SUCCESS": str,        # Green for success
    "DANGER": str,         # Red for error/danger
    "WARNING": str,        # Orange for warning
    "INFO": str,           # Blue for info

    # Glass effect colors
    "GLASS_BG": str,       # Glass background (with alpha)
    "GLASS_BORDER": str,   # Glass border (with alpha)

    # Gradient colors
    "GRADIENT_START": str, # Gradient start
    "GRADIENT_END": str,   # Gradient end
}
```

### Light vs Dark Mode

| Element        | Light Mode            | Dark Mode          |
| -------------- | --------------------- | ------------------ |
| BG             | Grey 100 (#F3F4F6)    | Grey 900 (#111827) |
| SURFACE        | White (#FFFFFF)       | Grey 800 (#1F2937) |
| TEXT           | Grey 900 (#111827)    | White (#FFFFFF)    |
| TEXT_SECONDARY | Grey 600 (#4B5563)    | Grey 400 (#9CA3AF) |
| BORDER         | Grey 200 (#E5E7EB)    | Grey 700 (#374151) |
| GLASS_BG       | rgba(255,255,255,0.6) | rgba(31,41,55,0.6) |

---

## 2. ThemeManager Class

### Class Definition

```python
class ThemeManager:
    """
    Manages application theme and dark/light mode.
    Persists preferences to client storage.

    Location: theme_manager.py
    """
```

### Constructor

```python
def __init__(self, page: ft.Page):
    """
    Initialize ThemeManager with Flet page.

    @param {ft.Page} page - Flet page object for storage access

    @example
    theme_manager = ThemeManager(page)
    """
```

### Properties

```python
@property
def theme(self) -> str:
    """
    Get current theme ID.

    @returns {str} Theme ID: "ungu", "hijau", "biru", "pink", "orange"
    """

@property
def mode(self) -> str:
    """
    Get current mode.

    @returns {str} "light" or "dark"
    """

@property
def is_dark(self) -> bool:
    """
    Check if dark mode is active.

    @returns {bool} True if dark mode
    """
```

### Methods

#### `set_theme`

```python
def set_theme(self, theme_id: str) -> None:
    """
    Set color theme.

    @param {str} theme_id - Theme ID: "ungu", "hijau", "biru", "pink", "orange"

    @sideeffects
    - Updates internal theme
    - Saves to client storage
    - Triggers on_change callback

    @example
    theme_manager.set_theme("hijau")
    """
```

#### `set_mode`

```python
def set_mode(self, mode: str) -> None:
    """
    Set light/dark mode.

    @param {str} mode - "light" or "dark"

    @sideeffects
    - Updates internal mode
    - Saves to client storage
    - Triggers on_change callback

    @example
    theme_manager.set_mode("dark")
    """
```

#### `toggle_mode`

```python
def toggle_mode(self) -> None:
    """
    Toggle between light and dark mode.

    @example
    # If currently light, switches to dark and vice versa
    theme_manager.toggle_mode()
    """
```

#### `get_colors`

```python
def get_colors(self) -> dict:
    """
    Get full color palette for current theme and mode.

    @returns {dict} Color palette with all color keys

    @example
    colors = theme_manager.get_colors()
    card.bgcolor = colors["SURFACE"]
    text.color = colors["TEXT"]
    """
```

#### `get_gradient`

```python
def get_gradient(self) -> ft.LinearGradient:
    """
    Get Flet LinearGradient for current theme.

    @returns {ft.LinearGradient} Gradient object

    @example
    container = ft.Container(
        gradient=theme_manager.get_gradient(),
        # ...
    )
    """
```

#### `get_gradient_colors`

```python
def get_gradient_colors(self) -> tuple[str, str]:
    """
    Get gradient start and end colors.

    @returns {tuple} (start_color, end_color)

    @example
    start, end = theme_manager.get_gradient_colors()
    """
```

#### `on_change`

```python
def on_change(self, callback: Callable[[], None]) -> None:
    """
    Set callback for theme/mode changes.

    @param {Callable} callback - Function to call on change

    @example
    def rebuild_ui():
        page.controls.clear()
        build_page()
        page.update()

    theme_manager.on_change(rebuild_ui)
    """
```

#### `apply_to_page`

```python
def apply_to_page(self) -> None:
    """
    Apply theme colors to Flet page.

    @sideeffects Updates page.bgcolor and page.theme_mode

    @example
    theme_manager.apply_to_page()
    page.update()
    """
```

#### `get_theme_options`

```python
def get_theme_options(self) -> list[dict]:
    """
    Get list of available themes for selector.

    @returns {list[dict]} Theme options

    @returns_format
    [
        {"id": "ungu", "name": "Purple", "color": "#4F46E5"},
        {"id": "hijau", "name": "Green", "color": "#10B981"},
        ...
    ]
    """
```

### Implementation

```python
import flet as ft

THEMES = {
    "ungu": {
        "name": "Purple",
        "PRIMARY": "#3730A3",
        "ACCENT": "#4F46E5",
        "GLOW": "#8B5CF6",
        "GRADIENT_LIGHT": ("#4F46E5", "#7C3AED"),
        "GRADIENT_DARK": ("#3730A3", "#5B21B6"),
    },
    "hijau": {
        "name": "Green",
        "PRIMARY": "#047857",
        "ACCENT": "#10B981",
        "GLOW": "#34D399",
        "GRADIENT_LIGHT": ("#10B981", "#059669"),
        "GRADIENT_DARK": ("#047857", "#065F46"),
    },
    "biru": {
        "name": "Blue",
        "PRIMARY": "#0369A1",
        "ACCENT": "#0EA5E9",
        "GLOW": "#38BDF8",
        "GRADIENT_LIGHT": ("#0EA5E9", "#0284C7"),
        "GRADIENT_DARK": ("#0369A1", "#075985"),
    },
    "pink": {
        "name": "Pink",
        "PRIMARY": "#BE185D",
        "ACCENT": "#EC4899",
        "GLOW": "#F472B6",
        "GRADIENT_LIGHT": ("#EC4899", "#DB2777"),
        "GRADIENT_DARK": ("#BE185D", "#9D174D"),
    },
}

LIGHT_BASE = {
    "BG": "#F3F4F6",
    "SURFACE": "#FFFFFF",
    "SURFACE_DIM": "#F9FAFB",
    "TEXT": "#111827",
    "TEXT_SECONDARY": "#4B5563",
    "TEXT_HINT": "#9CA3AF",
    "BORDER": "#E5E7EB",
    "BORDER_LIGHT": "#F3F4F6",
    "GLASS_BG": "rgba(255,255,255,0.6)",
    "GLASS_BORDER": "rgba(255,255,255,0.4)",
}

DARK_BASE = {
    "BG": "#111827",
    "SURFACE": "#1F2937",
    "SURFACE_DIM": "#374151",
    "TEXT": "#FFFFFF",
    "TEXT_SECONDARY": "#9CA3AF",
    "TEXT_HINT": "#6B7280",
    "BORDER": "#374151",
    "BORDER_LIGHT": "#4B5563",
    "GLASS_BG": "rgba(31,41,55,0.6)",
    "GLASS_BORDER": "rgba(55,65,81,0.4)",
}

STATUS_COLORS = {
    "SUCCESS": "#10B981",
    "DANGER": "#EF4444",
    "WARNING": "#F59E0B",
    "INFO": "#3B82F6",
}


class ThemeManager:
    STORAGE_THEME_KEY = "fatpig_theme"
    STORAGE_MODE_KEY = "fatpig_mode"

    def __init__(self, page: ft.Page):
        self._page = page
        self._theme = "ungu"
        self._mode = "light"
        self._on_change_callback = None
        self._load_from_storage()

    def _load_from_storage(self):
        """Load theme preferences from client storage."""
        try:
            stored_theme = self._page.client_storage.get(self.STORAGE_THEME_KEY)
            stored_mode = self._page.client_storage.get(self.STORAGE_MODE_KEY)

            if stored_theme and stored_theme in THEMES:
                self._theme = stored_theme
            if stored_mode in ["light", "dark"]:
                self._mode = stored_mode
        except:
            pass

    def _save_to_storage(self):
        """Save theme preferences to client storage."""
        try:
            self._page.client_storage.set(self.STORAGE_THEME_KEY, self._theme)
            self._page.client_storage.set(self.STORAGE_MODE_KEY, self._mode)
        except:
            pass

    @property
    def theme(self) -> str:
        return self._theme

    @property
    def mode(self) -> str:
        return self._mode

    @property
    def is_dark(self) -> bool:
        return self._mode == "dark"

    def set_theme(self, theme_id: str) -> None:
        if theme_id in THEMES:
            self._theme = theme_id
            self._save_to_storage()
            if self._on_change_callback:
                self._on_change_callback()

    def set_mode(self, mode: str) -> None:
        if mode in ["light", "dark"]:
            self._mode = mode
            self._save_to_storage()
            if self._on_change_callback:
                self._on_change_callback()

    def toggle_mode(self) -> None:
        self.set_mode("dark" if self._mode == "light" else "light")

    def on_change(self, callback) -> None:
        self._on_change_callback = callback

    def get_colors(self) -> dict:
        theme_data = THEMES[self._theme]
        base = DARK_BASE if self.is_dark else LIGHT_BASE
        gradient_key = "GRADIENT_DARK" if self.is_dark else "GRADIENT_LIGHT"

        colors = {**base, **STATUS_COLORS}
        colors["PRIMARY"] = theme_data["PRIMARY"]
        colors["ACCENT"] = theme_data["ACCENT"]
        colors["GLOW"] = theme_data["GLOW"]
        colors["GRADIENT_START"], colors["GRADIENT_END"] = theme_data[gradient_key]

        return colors

    def get_gradient(self) -> ft.LinearGradient:
        colors = self.get_colors()
        return ft.LinearGradient(
            begin=ft.alignment.top_left,
            end=ft.alignment.bottom_right,
            colors=[colors["GRADIENT_START"], colors["GRADIENT_END"]],
        )

    def get_gradient_colors(self) -> tuple:
        colors = self.get_colors()
        return (colors["GRADIENT_START"], colors["GRADIENT_END"])

    def apply_to_page(self) -> None:
        colors = self.get_colors()
        self._page.bgcolor = colors["BG"]
        self._page.theme_mode = ft.ThemeMode.DARK if self.is_dark else ft.ThemeMode.LIGHT

    def get_theme_options(self) -> list:
        return [
            {"id": tid, "name": data["name"], "color": data["ACCENT"]}
            for tid, data in THEMES.items()
        ]
```

---

## 3. UI Components

### `create_card`

```python
def create_card(
    content: ft.Control,
    colors: dict,
    padding: int = 16,
    border_radius: int = 16,
    elevation: int = 2
) -> ft.Container:
    """
    Create a card with shadow, adaptive for light/dark mode.

    @param {ft.Control} content - Card content
    @param {dict} colors - Color palette from theme_manager.get_colors()
    @param {int} padding - Inner padding (default: 16)
    @param {int} border_radius - Corner radius (default: 16)
    @param {int} elevation - Shadow elevation (default: 2)

    @returns {ft.Container} Styled card container

    @example
    colors = theme_manager.get_colors()
    card = create_card(
        content=ft.Text("Hello"),
        colors=colors,
        padding=20,
        border_radius=24
    )
    """
```

### Implementation

```python
def create_card(content, colors, padding=16, border_radius=16, elevation=2):
    # Determine shadow color based on mode
    is_dark = colors.get("BG") == "#111827"
    shadow_color = "rgba(0,0,0,0.3)" if is_dark else "rgba(0,0,0,0.1)"

    return ft.Container(
        content=content,
        padding=padding,
        border_radius=border_radius,
        bgcolor=colors["SURFACE"],
        border=ft.border.all(1, colors["BORDER_LIGHT"]),
        shadow=ft.BoxShadow(
            spread_radius=0,
            blur_radius=elevation * 4,
            color=shadow_color,
            offset=ft.Offset(0, elevation),
        ),
    )
```

### `glass_card`

```python
def glass_card(
    content: ft.Control,
    colors: dict,
    padding: int = 16,
    border_radius: int = 24
) -> ft.Container:
    """
    Create a glassmorphism card with blur effect.

    @param {ft.Control} content - Card content
    @param {dict} colors - Color palette
    @param {int} padding - Inner padding (default: 16)
    @param {int} border_radius - Corner radius (default: 24)

    @returns {ft.Container} Glass effect container

    @example
    glass = glass_card(
        content=ft.Column([
            ft.Text("Balance", color=colors["TEXT_SECONDARY"]),
            ft.Text("Rp 1.500.000", size=24, weight=ft.FontWeight.BOLD),
        ]),
        colors=colors,
        border_radius=32
    )
    """
```

### Implementation

```python
def glass_card(content, colors, padding=16, border_radius=24):
    return ft.Container(
        content=content,
        padding=padding,
        border_radius=border_radius,
        bgcolor=colors["GLASS_BG"],
        border=ft.border.all(1, colors["GLASS_BORDER"]),
        blur=ft.Blur(10, 10, ft.BlurTileMode.REPEATED),
        shadow=ft.BoxShadow(
            spread_radius=0,
            blur_radius=20,
            color="rgba(0,0,0,0.1)",
            offset=ft.Offset(0, 4),
        ),
    )
```

### `create_input`

```python
def create_input(
    label: str,
    colors: dict,
    value: str = "",
    hint: str = "",
    password: bool = False,
    multiline: bool = False,
    on_change: Callable = None,
    prefix_icon: ft.Icon = None
) -> ft.TextField:
    """
    Create a styled text input field.

    @param {str} label - Input label
    @param {dict} colors - Color palette
    @param {str} value - Initial value
    @param {str} hint - Placeholder hint
    @param {bool} password - Password mode
    @param {bool} multiline - Multiline mode
    @param {Callable} on_change - Change handler
    @param {ft.Icon} prefix_icon - Prefix icon

    @returns {ft.TextField} Styled text field

    @example
    email_input = create_input(
        label="Email",
        colors=colors,
        hint="Enter your email",
        prefix_icon=ft.Icon(ft.Icons.EMAIL)
    )
    """
```

### Implementation

```python
def create_input(label, colors, value="", hint="", password=False,
                 multiline=False, on_change=None, prefix_icon=None):
    return ft.TextField(
        label=label,
        value=value,
        hint_text=hint,
        password=password,
        can_reveal_password=password,
        multiline=multiline,
        min_lines=3 if multiline else 1,
        max_lines=5 if multiline else 1,
        on_change=on_change,
        prefix_icon=prefix_icon,
        border_color=colors["BORDER"],
        focused_border_color=colors["ACCENT"],
        label_style=ft.TextStyle(color=colors["TEXT_SECONDARY"]),
        text_style=ft.TextStyle(color=colors["TEXT"]),
        hint_style=ft.TextStyle(color=colors["TEXT_HINT"]),
        cursor_color=colors["ACCENT"],
        selection_color=colors["ACCENT"] + "40",  # 25% alpha
        border_radius=12,
    )
```

### `create_dropdown`

```python
def create_dropdown(
    label: str,
    options: list[str],
    colors: dict,
    value: str = None,
    on_change: Callable = None
) -> ft.Dropdown:
    """
    Create a styled dropdown selector.

    @param {str} label - Dropdown label
    @param {list[str]} options - List of option strings
    @param {dict} colors - Color palette
    @param {str} value - Selected value
    @param {Callable} on_change - Change handler

    @returns {ft.Dropdown} Styled dropdown

    @example
    category_dropdown = create_dropdown(
        label="Category",
        options=["Makan", "Transport", "Belanja"],
        colors=colors,
        value="Makan",
        on_change=lambda e: print(e.data)
    )
    """
```

### Implementation

```python
def create_dropdown(label, options, colors, value=None, on_change=None):
    return ft.Dropdown(
        label=label,
        value=value,
        options=[ft.dropdown.Option(opt) for opt in options],
        on_change=on_change,
        border_color=colors["BORDER"],
        focused_border_color=colors["ACCENT"],
        label_style=ft.TextStyle(color=colors["TEXT_SECONDARY"]),
        text_style=ft.TextStyle(color=colors["TEXT"]),
        border_radius=12,
        filled=True,
        fill_color=colors["SURFACE"],
    )
```

### `create_button`

```python
def create_button(
    text: str,
    colors: dict,
    on_click: Callable = None,
    icon: str = None,
    expand: bool = False,
    disabled: bool = False
) -> ft.ElevatedButton:
    """
    Create a primary styled button.

    @param {str} text - Button text
    @param {dict} colors - Color palette
    @param {Callable} on_click - Click handler
    @param {str} icon - Icon name (ft.Icons.*)
    @param {bool} expand - Expand to fill width
    @param {bool} disabled - Disabled state

    @returns {ft.ElevatedButton} Styled button

    @example
    save_btn = create_button(
        text="Save",
        colors=colors,
        icon=ft.Icons.SAVE,
        on_click=handle_save
    )
    """
```

### Implementation

```python
def create_button(text, colors, on_click=None, icon=None, expand=False, disabled=False):
    return ft.ElevatedButton(
        text=text,
        icon=icon,
        on_click=on_click,
        disabled=disabled,
        expand=expand,
        bgcolor=colors["ACCENT"],
        color="#FFFFFF",
        elevation=2,
        style=ft.ButtonStyle(
            shape=ft.RoundedRectangleBorder(radius=12),
            padding=ft.padding.symmetric(horizontal=24, vertical=12),
        ),
    )
```

### `create_icon_button`

```python
def create_icon_button(
    icon: str,
    colors: dict,
    on_click: Callable = None,
    tooltip: str = None,
    size: int = 24
) -> ft.IconButton:
    """
    Create a styled icon button.

    @param {str} icon - Icon name
    @param {dict} colors - Color palette
    @param {Callable} on_click - Click handler
    @param {str} tooltip - Tooltip text
    @param {int} size - Icon size

    @returns {ft.IconButton} Styled icon button
    """
```

---

## 4. Number Formatters

### `format_rupiah`

```python
def format_rupiah(amount: int) -> str:
    """
    Format number to Indonesian Rupiah format.

    @param {int} amount - Amount in Rupiah
    @returns {str} Formatted string with "Rp" prefix

    @example
    format_rupiah(1500000)  # "Rp 1.500.000"
    format_rupiah(25000)    # "Rp 25.000"
    format_rupiah(500)      # "Rp 500"
    """
    if amount is None:
        return "Rp 0"
    return f"Rp {amount:,.0f}".replace(",", ".")
```

### `format_number`

```python
def format_number(amount: int) -> str:
    """
    Format number with thousand separator (no Rp prefix).

    @param {int} amount - Number to format
    @returns {str} Formatted string

    @example
    format_number(1500000)  # "1.500.000"
    format_number(25000)    # "25.000"
    """
    if amount is None:
        return "0"
    return f"{amount:,.0f}".replace(",", ".")
```

### `parse_number`

```python
def parse_number(text: str) -> int:
    """
    Parse formatted number string to integer.

    @param {str} text - Formatted string (may contain Rp, dots, spaces)
    @returns {int} Parsed integer, 0 if invalid

    @example
    parse_number("Rp 1.500.000")  # 1500000
    parse_number("25.000")        # 25000
    parse_number("invalid")       # 0
    """
    if not text:
        return 0
    # Remove Rp, dots, spaces
    cleaned = text.replace("Rp", "").replace(".", "").replace(" ", "").strip()
    try:
        return int(cleaned)
    except ValueError:
        return 0
```

### `on_number_change`

```python
def on_number_change(e: ft.ControlEvent) -> None:
    """
    Event handler for number input with auto-formatting.
    Filters non-numeric characters and formats with thousand separator.

    @param {ft.ControlEvent} e - TextField change event

    @usage Attach to TextField.on_change

    @example
    nominal_input = ft.TextField(
        label="Nominal",
        on_change=on_number_change,
    )

    # User types: 25000
    # Display shows: 25.000
    """
```

### Implementation

```python
def on_number_change(e):
    """Auto-format number input with thousand separator."""
    text = e.control.value

    # Remove all non-digits
    digits_only = ''.join(filter(str.isdigit, text))

    if digits_only:
        # Parse and format
        number = int(digits_only)
        formatted = format_number(number)

        # Update field if different
        if e.control.value != formatted:
            e.control.value = formatted
            e.control.update()
    elif text:
        # Clear if no valid digits
        e.control.value = ""
        e.control.update()
```

---

## 5. Snackbar Helper

### Class Definition

```python
class SnackbarHelper:
    """
    Helper class for showing snackbar notifications.

    Location: ui_components.py
    """
```

### Constructor

```python
def __init__(self, page: ft.Page):
    """
    Initialize SnackbarHelper.

    @param {ft.Page} page - Flet page object

    @example
    snackbar = SnackbarHelper(page)
    """
```

### Methods

#### `show`

```python
def show(self, message: str, color: str = None, duration: int = 3000) -> None:
    """
    Show snackbar with custom color.

    @param {str} message - Message to display
    @param {str} color - Background color (hex)
    @param {int} duration - Duration in milliseconds
    """
```

#### `success`

```python
def success(self, message: str) -> None:
    """
    Show success snackbar (green).

    @param {str} message - Success message

    @example
    snackbar.success("Transaction saved!")
    """
```

#### `error`

```python
def error(self, message: str) -> None:
    """
    Show error snackbar (red).

    @param {str} message - Error message

    @example
    snackbar.error("Failed to save transaction")
    """
```

#### `info`

```python
def info(self, message: str, colors: dict) -> None:
    """
    Show info snackbar (theme accent color).

    @param {str} message - Info message
    @param {dict} colors - Color palette for accent color

    @example
    snackbar.info("Loading data...", colors)
    """
```

### Implementation

```python
class SnackbarHelper:

    def __init__(self, page: ft.Page):
        self._page = page

    def show(self, message: str, color: str = None, duration: int = 3000) -> None:
        self._page.snack_bar = ft.SnackBar(
            content=ft.Text(message, color="#FFFFFF"),
            bgcolor=color or "#323232",
            duration=duration,
        )
        self._page.snack_bar.open = True
        self._page.update()

    def success(self, message: str) -> None:
        self.show(message, "#10B981")  # Green

    def error(self, message: str) -> None:
        self.show(message, "#EF4444")  # Red

    def info(self, message: str, colors: dict = None) -> None:
        color = colors["ACCENT"] if colors else "#3B82F6"
        self.show(message, color)
```

---

## 6. Page Components

### Page Structure Pattern

```python
class ExamplePage(ft.Container):
    """
    Standard page component structure.
    """

    def __init__(self, page: ft.Page, theme_manager: ThemeManager, **kwargs):
        super().__init__()
        self.page = page
        self.theme_manager = theme_manager
        self.colors = theme_manager.get_colors()

        # Load data
        self._load_data()

        # Build UI
        self._build()

    def _load_data(self):
        """Load page data from services."""
        user_id = get_user_id(self.page)
        self.data = SomeService.get_data(user_id)

    def _build(self):
        """Build page UI."""
        self.content = ft.Column([
            self._build_header(),
            self._build_content(),
        ])
        self.expand = True
        self.padding = 16
        self.bgcolor = self.colors["BG"]

    def _build_header(self) -> ft.Control:
        """Build page header."""
        return ft.Text(
            "Page Title",
            size=24,
            weight=ft.FontWeight.BOLD,
            color=self.colors["TEXT"],
        )

    def _build_content(self) -> ft.Control:
        """Build main content."""
        return ft.Column([
            # Content here
        ])

    def refresh(self):
        """Refresh page data and rebuild."""
        self._load_data()
        self._build()
        self.update()
```

### Account Card Component

```python
def build_account_card(account: dict, colors: dict, on_click: Callable = None) -> ft.Container:
    """
    Build compact account card.

    @param {dict} account - Account data {id, nama, tipe, saldo}
    @param {dict} colors - Color palette
    @param {Callable} on_click - Click handler

    @returns {ft.Container} Account card
    """
    icon_map = {
        "cash": "💵",
        "bank": "🏦",
        "ewallet": "💳",
    }
    icon = icon_map.get(account["tipe"], "💰")

    return ft.Container(
        content=ft.Row([
            ft.Text(icon, size=24),
            ft.Column([
                ft.Text(
                    account["nama"],
                    size=14,
                    weight=ft.FontWeight.W_500,
                    color=colors["TEXT"],
                ),
                ft.Text(
                    format_rupiah(account["saldo"]),
                    size=12,
                    color=colors["TEXT_SECONDARY"],
                ),
            ], spacing=2),
        ], spacing=12),
        padding=12,
        border_radius=12,
        bgcolor=colors["SURFACE"],
        border=ft.border.all(1, colors["BORDER_LIGHT"]),
        on_click=on_click,
    )
```

### Envelope Card Component

```python
def build_envelope_card(envelope: dict, colors: dict, on_click: Callable = None) -> ft.Container:
    """
    Build budget envelope card with progress bar.

    @param {dict} envelope - Envelope data {kategori, jumlah, batas_nominal, tipe_batas}
    @param {dict} colors - Color palette
    @param {Callable} on_click - Click handler

    @returns {ft.Container} Envelope card
    """
    # Calculate progress
    spent = envelope.get("spent", 0)
    total = envelope["jumlah"]
    progress = min(spent / total, 1.0) if total > 0 else 0

    # Progress color
    if progress > 0.9:
        progress_color = colors["DANGER"]
    elif progress > 0.7:
        progress_color = colors["WARNING"]
    else:
        progress_color = colors["SUCCESS"]

    return ft.Container(
        content=ft.Column([
            ft.Row([
                ft.Text(
                    envelope["kategori"],
                    size=16,
                    weight=ft.FontWeight.W_500,
                    color=colors["TEXT"],
                ),
                ft.Text(
                    format_rupiah(envelope["jumlah"]),
                    size=14,
                    color=colors["TEXT_SECONDARY"],
                ),
            ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
            ft.ProgressBar(
                value=progress,
                color=progress_color,
                bgcolor=colors["BORDER_LIGHT"],
                height=6,
                border_radius=3,
            ),
            ft.Row([
                ft.Text(
                    f"Terpakai: {format_rupiah(spent)}",
                    size=12,
                    color=colors["TEXT_HINT"],
                ),
                ft.Text(
                    f"Limit: {envelope['tipe_batas']}",
                    size=12,
                    color=colors["TEXT_HINT"],
                ),
            ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
        ], spacing=8),
        padding=16,
        border_radius=16,
        bgcolor=colors["SURFACE"],
        border=ft.border.all(1, colors["BORDER_LIGHT"]),
        on_click=on_click,
    )
```

---

## 7. Code Snippets

### Setting Up Themed Page

```python
import flet as ft
from theme_manager import ThemeManager
from ui_components import create_card, glass_card, SnackbarHelper

def main(page: ft.Page):
    # Initialize theme manager
    theme_manager = ThemeManager(page)
    snackbar = SnackbarHelper(page)

    # Apply theme to page
    theme_manager.apply_to_page()

    # Get colors
    colors = theme_manager.get_colors()

    # Build UI with colors
    page.add(
        ft.Container(
            content=ft.Column([
                ft.Text(
                    "FATpig",
                    size=32,
                    weight=ft.FontWeight.BOLD,
                    color=colors["TEXT"],
                ),
                create_card(
                    content=ft.Text("Card content"),
                    colors=colors,
                ),
            ]),
            padding=20,
            bgcolor=colors["BG"],
            expand=True,
        )
    )

    # Handle theme changes
    def on_theme_change():
        # Rebuild page with new colors
        page.controls.clear()
        main(page)

    theme_manager.on_change(on_theme_change)

ft.app(target=main)
```

### Creating Glass Card Balance Display

```python
def build_balance_card(total_balance: int, colors: dict) -> ft.Container:
    """Build glassmorphism balance card."""
    return glass_card(
        content=ft.Column([
            ft.Text(
                "Total Balance",
                size=14,
                color=colors["TEXT_SECONDARY"],
            ),
            ft.Text(
                format_rupiah(total_balance),
                size=32,
                weight=ft.FontWeight.BOLD,
                color=colors["TEXT"],
            ),
            ft.Row([
                ft.Icon(ft.Icons.TRENDING_UP, color=colors["SUCCESS"], size=16),
                ft.Text(
                    "+Rp 150.000 this month",
                    size=12,
                    color=colors["SUCCESS"],
                ),
            ]),
        ], spacing=4),
        colors=colors,
        padding=24,
        border_radius=24,
    )
```

### Number Input with Formatting

```python
def build_nominal_input(colors: dict) -> ft.TextField:
    """Build nominal input with auto-formatting."""

    def on_change(e):
        text = e.control.value
        digits = ''.join(filter(str.isdigit, text))

        if digits:
            formatted = format_number(int(digits))
            if e.control.value != formatted:
                e.control.value = formatted
                e.control.update()

    return ft.TextField(
        label="Nominal",
        hint_text="0",
        prefix_text="Rp ",
        on_change=on_change,
        keyboard_type=ft.KeyboardType.NUMBER,
        border_color=colors["BORDER"],
        focused_border_color=colors["ACCENT"],
        border_radius=12,
    )
```

### Theme Selector

```python
def build_theme_selector(theme_manager: ThemeManager, colors: dict) -> ft.Row:
    """Build theme color selector."""
    options = theme_manager.get_theme_options()

    def on_select(theme_id):
        theme_manager.set_theme(theme_id)

    return ft.Row([
        ft.Container(
            width=40,
            height=40,
            border_radius=20,
            bgcolor=opt["color"],
            border=ft.border.all(
                3 if opt["id"] == theme_manager.theme else 0,
                colors["TEXT"]
            ),
            on_click=lambda e, tid=opt["id"]: on_select(tid),
        )
        for opt in options
    ], spacing=12)
```

### Dark Mode Toggle

```python
def build_dark_mode_toggle(theme_manager: ThemeManager, colors: dict) -> ft.Row:
    """Build dark mode toggle switch."""

    return ft.Row([
        ft.Icon(
            ft.Icons.DARK_MODE if theme_manager.is_dark else ft.Icons.LIGHT_MODE,
            color=colors["TEXT"],
        ),
        ft.Text(
            "Dark Mode",
            color=colors["TEXT"],
        ),
        ft.Switch(
            value=theme_manager.is_dark,
            active_color=colors["ACCENT"],
            on_change=lambda e: theme_manager.toggle_mode(),
        ),
    ], alignment=ft.MainAxisAlignment.SPACE_BETWEEN)
```

---

## Quick Reference

### Color Keys

```python
colors["PRIMARY"]        # Brand color
colors["ACCENT"]         # Highlight color
colors["BG"]             # Page background
colors["SURFACE"]        # Card background
colors["TEXT"]           # Primary text
colors["TEXT_SECONDARY"] # Muted text
colors["BORDER"]         # Border color
colors["SUCCESS"]        # Green
colors["DANGER"]         # Red
colors["GLASS_BG"]       # Glass background
```

### Component Usage

```python
# Card
create_card(content, colors, padding=16, border_radius=16)

# Glass card
glass_card(content, colors, padding=16, border_radius=24)

# Input
create_input(label, colors, hint="", password=False)

# Dropdown
create_dropdown(label, options, colors, value=None)

# Button
create_button(text, colors, icon=None, on_click=handler)

# Format numbers
format_rupiah(1500000)  # "Rp 1.500.000"
parse_number("1.500.000")  # 1500000
```

---

_Next: [TUTORIALS.md](TUTORIALS.md) - Step-by-step implementation tutorials_
