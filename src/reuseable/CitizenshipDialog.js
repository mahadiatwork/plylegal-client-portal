import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { monthNames } from "./months";


export default function CitizenshipDialog() {
    return (
        <SelectContent>
            {monthNames.map((month, idx) => (
                <SelectItem key={month} value={(idx + 1).toString()}>
                    {month}
                </SelectItem>
            ))}
        </SelectContent>
    );
}