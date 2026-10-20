// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearHandoff, peekHandoff } from "@/components/studio/handoff";
import { datasets } from "@/lib/data/datasets";
import { bikesSummary } from "@/lib/spec/fixtures";
import { parseSpec } from "@/lib/spec/parse";
import pkg from "@/package.json";
import { LandingPage } from "./landing-page";
import { shownSpec } from "./spec-card";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: navigation.push }) }));

function csvFile(text: string, name = "sales.csv") {
  return new File([text], name, { type: "text/csv" });
}

function fileInput() {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("No file input");
  return input;
}

function upload(file: File) {
  fireEvent.change(fileInput(), { target: { files: [file] } });
}

describe("LandingPage", () => {
  afterEach(() => {
    cleanup();
    clearHandoff();
    navigation.push.mockClear();
  });

  it("renders every section, with headings in order", () => {
    render(<LandingPage />);
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Charts, in plain English."]);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Three steps. Zero chart menus.",
      "No data to hand? Start here.",
      "Built to be trusted.",
      "Your data has a story. Just ask.",
    ]);
    for (const id of ["how", "demos", "trust"]) {
      const section = document.getElementById(id);
      expect(section?.tagName).toBe("SECTION");
      expect(within(section as HTMLElement).getAllByRole("heading", { level: 3 }).length).toBeGreaterThan(1);
    }
    expect(screen.getByRole("contentinfo").textContent).toContain("Chartseer is not an official TfL product.");
  });

  it("sets the accent words only in glyphs the italic subset holds", () => {
    render(<LandingPage />);
    // app/fonts/fraunces-italic-accent.woff2 holds just these (see app/layout.tsx).
    const glyphs = new Set("plainEnglish.Justask ");
    const accents = [...document.querySelectorAll(".font-serif-italic")].map((el) => el.textContent ?? "");
    expect(accents).toEqual(["plain English.", "Just ask."]);
    for (const text of accents) expect([...text].every((c) => glyphs.has(c))).toBe(true);
  });

  it("links to each section, the app and GitHub", () => {
    render(<LandingPage />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    for (const [name, href] of [
      ["How it works", "#how"],
      ["Demos", "#demos"],
      ["Under the hood", "#trust"],
      ["GitHub", pkg.repository],
    ] as const) {
      // In the top bar, the phone menu and the footer.
      const links = screen.getAllByRole("link", { name, hidden: true });
      expect(links.map((a) => a.getAttribute("href"))).toEqual([href, href, href]);
      if (href.startsWith("#")) expect(document.getElementById(href.slice(1))).not.toBeNull();
    }
    expect(within(nav).getByRole("link", { name: /^Open (the )?app/ }).getAttribute("href")).toBe("/app");
    expect(screen.getAllByRole("link", { name: "Chartseer" }).map((a) => a.getAttribute("href"))).toEqual(["/", "/"]);
    for (const link of screen.getAllByRole("link", { name: /^Try a demo/ })) expect(link.getAttribute("href")).toBe("#demos");
  });

  it("opens each bundled demo by its real id", () => {
    render(<LandingPage />);
    const demos = screen.getAllByRole("link", { name: /^Open demo/ }).map((a) => a.getAttribute("href"));
    expect(demos).toEqual(Object.keys(datasets).map((id) => `/app?dataset=${id}`));
  });

  it("takes the demo facts from the dataset meta", () => {
    render(<LandingPage />);
    const demos = within(document.getElementById("demos") as HTMLElement);
    expect(demos.getByText("About 25,000 rows")).toBeTruthy();
    expect(demos.getByText(/from January to May 2026\./)).toBeTruthy();
    expect(demos.getByText("Powered by TfL Open Data · a 1-in-30.8 sample")).toBeTruthy();
    expect(demos.getByText("“Journeys by hour of day, weekdays against weekends”")).toBeTruthy();
  });

  it("shows a spec that passes validation against the bikes data", () => {
    render(<LandingPage />);
    expect(parseSpec(shownSpec, bikesSummary)).toMatchObject({ ok: true });
    const shown = screen.getByRole("region", { name: "An example chart spec" }).textContent ?? "";
    expect(JSON.parse(shown)).toEqual(shownSpec);
  });

  it("opens the file picker from every Upload a CSV button", () => {
    render(<LandingPage />);
    const click = vi.spyOn(fileInput(), "click").mockImplementation(() => {});
    const buttons = screen.getAllByRole("button", { name: "Upload a CSV" });
    expect(buttons).toHaveLength(3);
    for (const button of buttons) fireEvent.click(button);
    expect(click).toHaveBeenCalledTimes(3);
  });

  it("hands a good file to the app", async () => {
    render(<LandingPage />);
    upload(csvFile("shop,revenue\nBrixton,12\n"));
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/app"));
    expect(peekHandoff()).toEqual({ name: "sales.csv", csv: { columns: ["shop", "revenue"], rows: [{ shop: "Brixton", revenue: "12" }] } });
  });

  it("shows the app's error for a rejected file, and stays", async () => {
    render(<LandingPage />);
    upload(csvFile("a,b\n1,2\n", "sales.xlsx"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/^This doesn’t look like a CSV file/));
    expect(navigation.push).not.toHaveBeenCalled();
    expect(peekHandoff()).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.getByRole("alert").textContent).toBe("");
  });

  it("takes a dropped file", async () => {
    render(<LandingPage />);
    fireEvent.drop(screen.getByRole("main"), { dataTransfer: { types: ["Files"], files: [csvFile("a,b\n1,2\n")] } });
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/app"));
  });

  it("shows the drop overlay while a file is dragged over", () => {
    render(<LandingPage />);
    fireEvent.dragOver(screen.getByRole("main"), { dataTransfer: { types: ["Files"] } });
    expect(screen.getByText("Drop a CSV file to load it")).toBeTruthy();
  });

  it("opens and closes the phone menu", () => {
    render(<LandingPage />);
    const menu = screen.getByRole("button", { name: "Menu" });
    const panel = document.getElementById(menu.getAttribute("aria-controls") ?? "");
    expect(menu.getAttribute("aria-expanded")).toBe("false");
    expect(panel?.hidden).toBe(true);

    fireEvent.click(menu);
    expect(menu.getAttribute("aria-expanded")).toBe("true");
    expect(panel?.hidden).toBe(false);
    fireEvent.click(menu);
    expect(menu.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(menu);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(menu.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(menu);

    fireEvent.click(menu);
    fireEvent.click(within(panel as HTMLElement).getByRole("link", { name: "Demos" }));
    expect(menu.getAttribute("aria-expanded")).toBe("false");
  });

  it("passes axe, with the menu closed and open", async () => {
    render(<LandingPage />);
    // jsdom lays nothing out, so colour contrast is checked in the browser (D-057).
    const options = { rules: { "color-contrast": { enabled: false } } };
    expect((await axe.run(document.body, options)).violations.map((v) => v.id)).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect((await axe.run(document.body, options)).violations.map((v) => v.id)).toEqual([]);
  });
});
