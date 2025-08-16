module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint", "react", "import", "unused-imports"],
    extends: [
      "eslint:recommended",
      "plugin:react/recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:import/recommended",
      "plugin:import/typescript",
      "prettier",
    ],
    settings: { react: { version: "detect" } },
    rules: {
      "unused-imports/no-unused-imports": "error",
      "react/react-in-jsx-scope": "off",
    },
  };
  