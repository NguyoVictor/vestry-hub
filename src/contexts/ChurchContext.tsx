import { createContext, useContext, type ReactNode } from "react";

export interface ChurchData {
  tenantId: string;
  name: string;
  currency: string;
  city: string | null;
  country: string | null;
  logoUrl: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  userFirstName: string;
  userLastName: string;
}

const ChurchContext = createContext<ChurchData | null>(null);

export const useChurch = () => {
  const ctx = useContext(ChurchContext);
  if (!ctx) throw new Error("useChurch must be used within ChurchProvider");
  return ctx;
};

export const ChurchProvider = ({ value, children }: { value: ChurchData; children: ReactNode }) => (
  <ChurchContext.Provider value={value}>{children}</ChurchContext.Provider>
);
