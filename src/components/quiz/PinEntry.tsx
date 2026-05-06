import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface PinEntryProps {
  onComplete: (pin: string) => void;
  isLoading?: boolean;
  error?: string;
}

export function PinEntry({ onComplete, isLoading = false, error }: PinEntryProps) {
  const [values, setValues] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedValue = value.toUpperCase().slice(0, 6);
      const newValues = Array(6).fill("");
      for (let i = 0; i < pastedValue.length; i++) {
        newValues[i] = pastedValue[i];
      }
      setValues(newValues);
      
      // Focus the next empty input or the last one
      const nextIndex = Math.min(pastedValue.length, 5);
      inputRefs.current[nextIndex]?.focus();
      
      // If all 6 are filled, submit
      if (pastedValue.length === 6) {
        onComplete(pastedValue);
      }
      return;
    }

    // Single character input
    const upperValue = value.toUpperCase();
    const newValues = [...values];
    newValues[index] = upperValue;
    setValues(newValues);

    // Move to next input
    if (upperValue && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 are filled
    if (upperValue && index === 5) {
      const pin = newValues.join("");
      if (pin.length === 6) {
        onComplete(pin);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "Backspace" && values[index]) {
      // Clear current input
      const newValues = [...values];
      newValues[index] = "";
      setValues(newValues);
    }
  };

  // Bounce animation when all 6 are filled
  useEffect(() => {
    if (values.every(v => v) && values.join("").length === 6) {
      // Trigger bounce animation
      inputRefs.current.forEach((input, index) => {
        if (input) {
          setTimeout(() => {
            input.style.transform = "scale(1.08)";
            setTimeout(() => {
              input.style.transform = "scale(1)";
            }, 100);
          }, index * 30);
        }
      });
    }
  }, [values]);

  // Clear inputs on error
  useEffect(() => {
    if (error) {
      setValues(Array(6).fill(""));
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 800);
    }
  }, [error]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-center">
        {values.map((value, index) => (
          <motion.input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            value={value}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={`
              w-12 h-15 text-center text-2xl font-bold uppercase
              border-2 rounded-xl bg-slate-50 transition-all duration-200
              ${error 
                ? "border-red-500 bg-red-50" 
                : value 
                  ? "border-purple-600 bg-purple-50 text-purple-600" 
                  : "border-slate-200 focus:border-purple-600 focus:bg-white focus:shadow-lg focus:shadow-purple-600/15"
              }
            `}
            maxLength={6} // Allow paste
            disabled={isLoading}
            animate={error ? {
              x: [0, -8, 8, -8, 8, -4, 4, 0]
            } : {}}
            transition={{ duration: 0.5 }}
          />
        ))}
      </div>
      
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-500 text-sm text-center"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}