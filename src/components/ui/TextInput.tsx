import React, { ReactNode } from "react";
import clsx from "clsx";

// TextInput - customizable input field with optional label and description.

interface TextInputProps {
  children?: ReactNode;
  className?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  name?: string;
  description?: string;
  required?: boolean;
}

export default function TextInput({
  children,
  className,
  type = "text",
  placeholder,
  value,
  onChange,
  onKeyDown,
  name,
  description,
  required = false,
}: TextInputProps) {
  return (
    <div
      className={clsx(
        "transition-colors duration-500 text-lg bg-backgroundGrayLight p-2 rounded-md shadow-md text-neutral-500 outline-none border-b border-b-backgroundGrayLight focus-within:border-b-primary",
        className
      )}
    >
      {/* Label if a name is provided */}
      {name && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-neutral-700"
        >
          {name}
        </label>
      )}

      {/* Main input field */}
      <input
        id={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        required={required}
        className="bg-transparent outline-none w-full mt-1"
      />

      {/* Optional description below the input */}
      {description && (
        <p className="mt-1 text-sm text-neutral-500">{description}</p>
      )}

      {/* Any extra elements passed in */}
      {children}
    </div>
  );
}
