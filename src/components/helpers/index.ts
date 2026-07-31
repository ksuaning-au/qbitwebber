import { defaultPreferences } from "@/constants";

export const getStoredTableSettings = () => {
    const storedSettings = localStorage.getItem('qbitwebber_tableViewSettings') ?? "{}"
    const parsedSettings = JSON.parse(storedSettings) as typeof defaultPreferences.columns
    return { ...defaultPreferences.columns, ...parsedSettings }
}