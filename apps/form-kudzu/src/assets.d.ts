// Kudzu turns a side-effect CSS import into that route's stylesheet link
// (0.8.53+ route-aware CSS closure — see src/components or the page that
// imports it). @kudzujs/core ships no ambient declaration for asset modules,
// so TypeScript needs this one to accept the import.
declare module "*.css";
