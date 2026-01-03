# Cleanup Report - Removing All Hardcoded Colors

## ✅ Completed

### AccountingPage.tsx

-   ✅ Removed all `style={{}}` inline styles
-   ✅ Replaced `color: "#1890FF"` → `text-primary`
-   ✅ Replaced `color: "rgba(0,0,0,0.65)"` → `text-muted-foreground`
-   ✅ Replaced `border-[#d9d9d9]` → `border-border`
-   ✅ Replaced `hover:bg-gray-50` → `hover:bg-muted/50`
-   ✅ Replaced all fontSize inline styles → Tailwind classes

### Remaining Files to Clean

-   ClientsPage.tsx (14 inline styles)
-   QuotesListPage.tsx (13 inline styles)

## Pattern Replacements

| Hardcoded                               | Theme Variable                      |
| --------------------------------------- | ----------------------------------- |
| `style={{ fontSize: "14px" }}`          | `className="text-sm"`               |
| `style={{ fontWeight: 500 }}`           | `className="font-medium"`           |
| `style={{ fontWeight: 600 }}`           | `className="font-semibold"`         |
| `style={{ color: "#1890FF" }}`          | `className="text-primary"`          |
| `style={{ color: "rgba(0,0,0,0.65)" }}` | `className="text-muted-foreground"` |
| `border-[#d9d9d9]`                      | `border-border`                     |
| `bg-gray-50`                            | `bg-muted`                          |
| `hover:bg-gray-50`                      | `hover:bg-muted/50`                 |
| `bg-green-100 text-green-600`           | `bg-success/10 text-success`        |
| `bg-orange-100 text-orange-600`         | `bg-warning/10 text-warning`        |
