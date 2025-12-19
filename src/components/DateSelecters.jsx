import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { monthNames } from "@/reuseable/months";

export function DateSelector({ label, values, onValueChange, errors, testIdPrefix, required }) {
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => (currentYear - i).toString());

  const hasError = errors?.day || errors?.month || errors?.year;

  return (
    <div className="space-y-2">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <div className="grid grid-cols-3 gap-2">
        {/* Day Select */}
        <Select value={values.day} onValueChange={(v) => onValueChange('day', v)}>
          <SelectTrigger 
            data-testid={`${testIdPrefix}-day`}
            className={hasError ? "border-red-600" : ""}
          >
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent>{days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
        
        {/* Month Select */}
        <Select value={values.month} onValueChange={(v) => onValueChange('month', v)}>
          <SelectTrigger 
            data-testid={`${testIdPrefix}-month`}
            className={hasError ? "border-red-600" : ""}
          >
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {monthNames.map((m, i) => <SelectItem key={m} value={(i + 1).toString()}>{m}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Year Select */}
        <Select value={values.year} onValueChange={(v) => onValueChange('year', v)}>
          <SelectTrigger 
            data-testid={`${testIdPrefix}-year`}
            className={hasError ? "border-red-600" : ""}
          >
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {hasError && (
        <p className="text-sm text-red-600 mt-1">
          {errors?.day?.message || errors?.month?.message || errors?.year?.message || "Date is required"}
        </p>
      )}
    </div>
  );
}