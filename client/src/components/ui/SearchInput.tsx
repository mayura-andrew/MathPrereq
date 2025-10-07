import React from "react";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import { RiSearchLine, RiCloseLine } from "react-icons/ri";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
}

export default function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder = "Search...",
  disabled = false,
  fullWidth = true,
}: SearchInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch(value);
    }
  };

  const handleClear = () => {
    onChange("");
  };

  const handleSearch = () => {
    onSearch(value);
  };

  return (
    <TextField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyPress={handleKeyPress}
      placeholder={placeholder}
      disabled={disabled}
      fullWidth={fullWidth}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <IconButton onClick={handleSearch} disabled={disabled} size="small">
              <RiSearchLine />
            </IconButton>
          </InputAdornment>
        ),
        endAdornment: value && (
          <InputAdornment position="end">
            <IconButton onClick={handleClear} disabled={disabled} size="small">
              <RiCloseLine />
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}
