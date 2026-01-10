
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { COUNTRY_CODES } from "@/reuseable/countryCodes";

export function CountryCodeSelect({ value, onChange, placeholder = "Country Code", className }) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className={className || "w-full"}>
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {COUNTRY_CODES.map((country) => (
                    <SelectItem key={country.code + country.name} value={country.label}>
                        {country.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
