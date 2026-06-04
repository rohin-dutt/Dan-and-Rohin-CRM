import tseslint from "typescript-eslint"

export default tseslint.config(
  {
    ignores: [".expo/**", "node_modules/**"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
)
