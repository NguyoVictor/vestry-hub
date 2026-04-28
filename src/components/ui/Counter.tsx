import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import './Counter.css';

interface CounterProps {
  from?: number;
  to: number;
  duration?: number;
  className?: string;
  separator?: string;
  decimals?: number;
}

export default function Counter({
  from = 0,
  to,
  duration = 2,
  className = '',
  separator = ',',
  decimals = 0,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '0px' });
  const [count, setCount] = useState(from);

  useEffect(() => {
    if (!isInView) return;

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;

    const updateCount = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentCount = from + (to - from) * easeOut;

      setCount(currentCount);

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        setCount(to);
      }
    };

    requestAnimationFrame(updateCount);
  }, [isInView, from, to, duration]);

  const formatNumber = (num: number) => {
    const fixed = num.toFixed(decimals);
    if (!separator) return fixed;
    
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
    return parts.join('.');
  };

  return (
    <span ref={ref} className={`counter ${className}`}>
      {formatNumber(count)}
    </span>
  );
}
