import { themes } from "@/constants/theme-constant";
import { ThemeContext } from "@/constants/theme-context";
import { useContext } from "react";

export function useTheme() {
    const { theme, toggleTheme } = useContext(ThemeContext);
    const colors = themes[theme];
    
    return { theme, toggleTheme, colors };
}