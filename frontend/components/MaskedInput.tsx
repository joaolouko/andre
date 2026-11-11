"use client";

import React, { useRef } from "react";

type MaskedInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  value: string | null | undefined;
  formatValue: (value: string) => string;
  onValueChange: (value: string) => void;
};

function countDigits(value: string): number {
  return (value.match(/\d/g) ?? []).length;
}

function positionAfterDigits(value: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (/\d/.test(value[index])) seen += 1;
    if (seen === digitCount) return index + 1;
  }
  return value.length;
}

export function MaskedInput({ value, formatValue, onValueChange, ...inputProps }: MaskedInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const rawValue = input.value;
    const cursor = input.selectionStart ?? rawValue.length;
    const digitsBeforeCursor = countDigits(rawValue.slice(0, cursor));
    const formattedValue = formatValue(rawValue);

    onValueChange(formattedValue);
    window.requestAnimationFrame(() => {
      const currentInput = inputRef.current;
      if (currentInput && document.activeElement === currentInput) {
        const nextCursor = positionAfterDigits(formattedValue, digitsBeforeCursor);
        currentInput.setSelectionRange(nextCursor, nextCursor);
      }
    });
  };

  return (
    <input
      {...inputProps}
      ref={inputRef}
      value={value ?? ""}
      onChange={handleChange}
    />
  );
}
