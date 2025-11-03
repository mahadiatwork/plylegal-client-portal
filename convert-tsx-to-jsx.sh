#!/bin/bash
# Simple TypeScript to JavaScript converter for shadcn/ui components

convert_file() {
  local src="$1"
  local dest="$2"
  
  # Copy file
  cp "$src" "$dest"
  
  # Replace .tsx extension references with .jsx
  sed -i 's/\.tsx"/\.jsx"/g' "$dest"
  sed -i 's/\.tsx'"'"'/\.jsx'"'"'/g' "$dest"
  
  # Remove TypeScript-specific syntax
  sed -i 's/: React\.ReactNode//g' "$dest"
  sed -i 's/: React\.FC<[^>]*>//g' "$dest"
  sed -i 's/: React\.ElementRef<[^>]*>//g' "$dest"
  sed -i 's/: React\.ComponentPropsWithoutRef<[^>]*>//g' "$dest"
  sed -i 's/React\.ForwardRefExoticComponent<[^>]*>/React.ForwardRefExoticComponent/g' "$dest"
  sed -i 's/interface [A-Z][a-zA-Z0-9]* /const /g' "$dest"
  sed -i 's/<[A-Z][a-zA-Z0-9]*>//g' "$dest"
  
  # Rename to .jsx
  mv "$dest" "${dest%.tsx}.jsx"
}

export -f convert_file
