import React from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatter?: (val: number) => string;
  className?: string;
}

export default function AnimatedCounter({
  value,
  formatter,
  className,
}: AnimatedCounterProps) {
  const displayValue = formatter ? formatter(value) : value.toLocaleString();
  return <span className={className}>{displayValue}</span>;
}

