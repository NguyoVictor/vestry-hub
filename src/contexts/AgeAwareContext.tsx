import { createContext, useContext, ReactNode } from "react";
import { differenceInYears } from "date-fns";
import { useMemberPortal } from "./MemberPortalContext";

export type AgeGroup = 'kids' | 'teens' | 'adults';

interface AgeAwareContextType {
  ageGroup: AgeGroup;
  memberAge: number | null;
}

const AgeAwareContext = createContext<AgeAwareContextType | null>(null);

interface AgeAwareProviderProps {
  children: ReactNode;
}

export function AgeAwareProvider({ children }: AgeAwareProviderProps) {
  const member = useMemberPortal();
  
  // Calculate age from member's date of birth
  const memberAge = member.dateOfBirth 
    ? differenceInYears(new Date(), new Date(member.dateOfBirth))
    : null;
  
  // Determine age group
  const ageGroup: AgeGroup = 
    memberAge === null ? 'adults' :
    memberAge < 13 ? 'kids' : 
    memberAge < 18 ? 'teens' : 'adults';

  return (
    <AgeAwareContext.Provider value={{ ageGroup, memberAge }}>
      {children}
    </AgeAwareContext.Provider>
  );
}

export function useAgeAware() {
  const context = useContext(AgeAwareContext);
  if (!context) {
    throw new Error("useAgeAware must be used within an AgeAwareProvider");
  }
  return context;
}

// Age-aware styling utilities
export const getAgeStyles = (ageGroup: AgeGroup) => {
  switch (ageGroup) {
    case 'kids':
      return {
        background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
        cardBg: "bg-white/95 backdrop-blur-sm",
        cardBorder: "border-2 border-white/20",
        cardRadius: "rounded-3xl",
        cardShadow: "shadow-2xl",
        buttonSize: "h-14 px-8 text-lg",
        buttonRadius: "rounded-2xl",
        textSize: "text-lg",
        titleSize: "text-3xl",
        spacing: "gap-6",
        padding: "p-6",
        animation: { scale: 1.05, transition: { type: "spring", stiffness: 400, damping: 25 } }
      };
    case 'teens':
      return {
        background: "#0f172a",
        cardBg: "bg-slate-800/90 backdrop-blur-sm",
        cardBorder: "border border-slate-700/50",
        cardRadius: "rounded-2xl",
        cardShadow: "shadow-xl",
        buttonSize: "h-12 px-6 text-base",
        buttonRadius: "rounded-xl",
        textSize: "text-base",
        titleSize: "text-2xl",
        spacing: "gap-4",
        padding: "p-5",
        animation: { scale: 1.02, transition: { type: "spring", stiffness: 400, damping: 25 } }
      };
    case 'adults':
      return {
        background: "#f8fafc",
        cardBg: "bg-white",
        cardBorder: "border border-slate-200",
        cardRadius: "rounded-xl",
        cardShadow: "shadow-sm",
        buttonSize: "h-10 px-4 text-sm",
        buttonRadius: "rounded-lg",
        textSize: "text-sm",
        titleSize: "text-xl",
        spacing: "gap-3",
        padding: "p-4",
        animation: { scale: 1.01, transition: { type: "spring", stiffness: 400, damping: 25 } }
      };
  }
};

export const getAgeColors = (ageGroup: AgeGroup) => {
  switch (ageGroup) {
    case 'kids':
      return {
        primary: "bg-gradient-to-r from-pink-500 to-purple-600",
        primaryHover: "from-pink-600 to-purple-700",
        text: "text-white",
        textSecondary: "text-white/80",
        accent: "text-yellow-300",
        success: "text-green-300",
        progress: "bg-gradient-to-r from-green-400 to-blue-500"
      };
    case 'teens':
      return {
        primary: "bg-gradient-to-r from-violet-600 to-indigo-600",
        primaryHover: "from-violet-700 to-indigo-700",
        text: "text-white",
        textSecondary: "text-slate-300",
        accent: "text-cyan-400",
        success: "text-emerald-400",
        progress: "bg-gradient-to-r from-cyan-500 to-violet-500"
      };
    case 'adults':
      return {
        primary: "bg-orange-500 hover:bg-orange-600",
        primaryHover: "bg-orange-600",
        text: "text-slate-900",
        textSecondary: "text-slate-600",
        accent: "text-orange-600",
        success: "text-emerald-600",
        progress: "bg-orange-500"
      };
  }
};