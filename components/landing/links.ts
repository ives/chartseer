import pkg from "@/package.json";

// The section links, shared by the top bar, the phone menu and the footer.
export const sectionLinks = [
  { href: "#how", label: "How it works" },
  { href: "#demos", label: "Demos" },
  { href: "#trust", label: "Under the hood" },
  { href: pkg.repository, label: "GitHub" },
] as const;
