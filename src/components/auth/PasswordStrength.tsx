import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
  password: string;
}

const rules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /\d/.test(p) },
  { label: "One special character (!@#$%^&*)", test: (p: string) => /[!@#$%^&*]/.test(p) },
];

const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  if (!password) return null;

  const passed = rules.filter((r) => r.test(password)).length;
  const strength =
    passed <= 1 ? "Weak" : passed <= 3 ? "Fair" : passed <= 4 ? "Good" : "Strong";
  const strengthColor =
    passed <= 1
      ? "text-destructive"
      : passed <= 3
        ? "text-yellow-500"
        : passed <= 4
          ? "text-blue-500"
          : "text-green-600";

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Password strength</span>
        <span className={`font-medium ${strengthColor}`}>{strength}</span>
      </div>
      <ul className="space-y-1">
        {rules.map((rule) => {
          const ok = rule.test(password);
          return (
            <li key={rule.label} className="flex items-center gap-2 text-sm">
              {ok ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <X className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className={ok ? "text-green-600" : "text-muted-foreground"}>
                {rule.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PasswordStrength;
