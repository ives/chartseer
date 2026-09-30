// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Studio } from "./studio";

function csvFile(text: string, name = "sales.csv") {
  return new File([text], name, { type: "text/csv" });
}

// axe's rule ids that fail on the page. jsdom lays nothing out, so colour
// contrast is checked in the browser instead (D-057).
async function axeViolations(): Promise<string[]> {
  const result = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(", ")}`);
}

function upload(file: File) {
  fireEvent.change(screen.getByLabelText("Upload Own CSV"), { target: { files: [file] } });
}

describe("Studio uploads", () => {
  beforeEach(() => {
    // jsdom lays nothing out; the chat panel scrolls its message list.
    Element.prototype.scrollTo = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("date,shop,scoops\n2025-06-01,Brixton,10\n")),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("has the wordmark as its only top-level heading", () => {
    render(<Studio />);
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Chartseer"]);
  });

  it("passes axe on the first screen and in the workspace", async () => {
    render(<Studio />);
    expect(await axeViolations()).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: /^Gelateria Nebbia/ }));
    await screen.findByRole("button", { name: "Daily revenue by shop in 2025" });
    expect(await axeViolations()).toEqual([]);
  });

  it("shows the privacy note, word for word", () => {
    render(<Studio />);
    expect(
      screen.getByText(
        "Your file stays on your device. Column names and a few sample rows are sent to the AI to understand your data.",
      ),
    ).toBeTruthy();
  });

  it("loads a valid file and lists it in the picker", async () => {
    render(<Studio />);
    upload(csvFile('shop,revenue\nBrixton,"£1,200"\n'));
    const picker = (await screen.findByDisplayValue("sales.csv")) as HTMLSelectElement;
    expect(picker.value).toBe("upload");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Ask for a chart of your data.")).toBeTruthy();
  });

  it("opens on a choice of demo datasets or an upload", () => {
    render(<Studio />);
    expect(screen.getByRole("heading", { name: "Choose some data to chart" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Gelateria Nebbia/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Santander Cycles journeys, London.*1 in 30\.8/ })).toBeTruthy();
    expect(screen.getByLabelText("Upload Own CSV")).toBeTruthy();
    expect(screen.queryByLabelText("Dataset")).toBeNull();
  });

  it("loads a demo dataset and offers its starters", async () => {
    render(<Studio />);
    fireEvent.click(screen.getByRole("button", { name: /^Gelateria Nebbia/ }));
    expect(((await screen.findByLabelText("Dataset")) as HTMLSelectElement).value).toBe("gelato");
    expect(await screen.findByRole("button", { name: "Daily revenue by shop in 2025" })).toBeTruthy();
  });

  it("offers a retry when a demo dataset fails to load", async () => {
    const fetch = vi.fn(async () => new Response("", { status: 500 }));
    vi.stubGlobal("fetch", fetch);
    render(<Studio />);
    fireEvent.click(screen.getByRole("button", { name: /^Gelateria Nebbia/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });

  it("offers starters built from an uploaded file", async () => {
    render(<Studio />);
    upload(csvFile('date,stall,takings\n13/03/2025,Cheese,"£1,200"\n14/03/2025,Bakery,£900\n'));
    expect(await screen.findByRole("button", { name: "Total takings by month" })).toBeTruthy();
  });

  it("shows the reader's error and keeps the current dataset", async () => {
    render(<Studio />);
    fireEvent.click(screen.getByRole("button", { name: /^Gelateria Nebbia/ }));
    await screen.findByLabelText("Dataset");
    upload(csvFile("a,b,c\n1,2,3\n4,5\n"));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Row 3 has 2 values, but the header has 3. Check for a missing or extra separator.",
    );
    expect((screen.getByLabelText("Dataset") as HTMLSelectElement).value).toBe("gelato");
  });

  it("rejects a file that is too large without reading it", async () => {
    render(<Studio />);
    const file = csvFile("a,b\n1,2\n");
    Object.defineProperty(file, "size", { value: 6 * 1024 * 1024 });
    upload(file);
    expect((await screen.findByRole("alert")).textContent).toBe("This file is 6.0 MB; the limit is 5 MB.");
  });

  it("rejects a file that isn't a CSV", async () => {
    render(<Studio />);
    upload(csvFile("a,b\n1,2\n", "sales.xlsx"));
    expect((await screen.findByRole("alert")).textContent).toMatch(/^This doesn’t look like a CSV file/);
  });

  it("offers to switch ambiguous dates, and re-reads them", async () => {
    render(<Studio />);
    upload(csvFile("date,sales\n03/04/2025,1\n05/04/2025,2\n"));
    expect((await screen.findByText(/Dates read as/)).textContent).toBe("Dates read as day/month · switch");
    fireEvent.click(screen.getByRole("button", { name: "switch" }));
    expect(screen.getByText(/Dates read as/).textContent).toBe("Dates read as month/day · switch");
  });

  it("says nothing about dates when the order is clear", async () => {
    render(<Studio />);
    upload(csvFile("date,sales\n13/04/2025,1\n05/04/2025,2\n"));
    await screen.findByDisplayValue("sales.csv");
    expect(screen.queryByText(/Dates read as/)).toBeNull();
  });

  it("takes one dropped file at a time", () => {
    render(<Studio />);
    const files = [csvFile("a,b\n1,2\n"), csvFile("a,b\n3,4\n", "more.csv")];
    fireEvent.drop(screen.getByRole("main"), { dataTransfer: { types: ["Files"], files } });
    expect(screen.getByRole("alert").textContent).toBe("Drop one file at a time.");
  });

  it("loads a dropped file", async () => {
    render(<Studio />);
    fireEvent.drop(screen.getByRole("main"), { dataTransfer: { types: ["Files"], files: [csvFile("a,b\n1,2\n")] } });
    expect(await screen.findByDisplayValue("sales.csv")).toBeTruthy();
  });
});
