// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearHandoff, peekHandoff } from "@/components/studio/handoff";
import { LandingPage } from "./landing-page";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: navigation.push }) }));

function csvFile(text: string, name = "sales.csv") {
  return new File([text], name, { type: "text/csv" });
}

function upload(file: File) {
  fireEvent.change(screen.getByLabelText("Upload a CSV"), { target: { files: [file] } });
}

describe("LandingPage", () => {
  afterEach(() => {
    cleanup();
    clearHandoff();
    navigation.push.mockClear();
  });

  it("links to the app and to each demo", () => {
    render(<LandingPage />);
    expect(screen.getByRole("link", { name: "Open the app" }).getAttribute("href")).toBe("/app");
    expect(screen.getByRole("link", { name: "Chartseer" }).getAttribute("href")).toBe("/");
    const demos = screen.getAllByRole("link", { name: /^Open demo/ }).map((a) => a.getAttribute("href"));
    expect(demos).toEqual(["/app?dataset=bikes", "/app?dataset=gelato"]);
    expect(document.getElementById("demos")?.contains(screen.getByRole("link", { name: /Gelateria Nebbia/ }))).toBe(true);
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
    expect((await screen.findByRole("alert")).textContent).toMatch(/^This doesn’t look like a CSV file/);
    expect(navigation.push).not.toHaveBeenCalled();
    expect(peekHandoff()).toBeNull();
  });

  it("takes a dropped file", async () => {
    render(<LandingPage />);
    fireEvent.drop(screen.getByRole("main"), { dataTransfer: { types: ["Files"], files: [csvFile("a,b\n1,2\n")] } });
    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/app"));
  });

  it("passes axe", async () => {
    render(<LandingPage />);
    // jsdom lays nothing out, so colour contrast is checked in the browser (D-057).
    const result = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});
