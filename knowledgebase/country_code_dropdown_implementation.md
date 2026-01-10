# Country Code Dropdown Implementation

This document outlines the implementation of a reusable country code dropdown component using `shadcn/ui` Select and a custom data file.

## 1. Data Source

**File:** `src/reuseable/countryCodes.js`

This file exports an array of country objects. Each object contains the `name`, dialing `code`, and a pre-formatted `label` for display.

```javascript
export const COUNTRY_CODES = [
  { name: "Afghanistan", code: "93", label: "Afghanistan (93)" },
  { name: "Albania", code: "355", label: "Albania (355)" },
  // ... full list of countries
];
```

## 2. Component Implementation

**File:** (Example usage in `page.js`)

The implementation relies on the `shadcn/ui` Select component.

### Imports

```javascript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRY_CODES } from "@/reuseable/countryCodes";
```

### Helper Component

To keep the main form JSX clean, a local helper component is defined. It iterates over the `COUNTRY_CODES` array to generate `SelectItem` components.

```javascript
// Helper to render Country Select
const CountrySelect = ({ value, onChange, placeholder }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className="w-full">
      <SelectValue placeholder={placeholder || "Select Country"} />
    </SelectTrigger>
    <SelectContent>
      {COUNTRY_CODES.map((country) => (
        // Key uses code + name to ensure uniqueness
        <SelectItem key={country.code + country.name} value={country.label}>
          {country.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
```

### Usage in React Hook Form

The component is integrated into the form using `form.watch` for the value and `form.setValue` for the change handler.

```javascript
<CountrySelect 
  value={form.watch("after_hours_country_code")} 
  onChange={(val) => form.setValue("after_hours_country_code", val)}
  placeholder="Country Code"
/>
```
