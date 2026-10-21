// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import axe from "axe-core";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearHandoff, handOff, peekHandoff } from "./handoff";
import { datasets } from "@/lib/data/datasets";
import { Studio } from "./studio";
import { PRIVACY_NOTE } from "./upload-button";

// The App Router isn't mounted in tests: the URL and the router are stand-ins.
const navigation = vi.hoisted(() => ({ search: "", replace: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace, push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}));
// Next's Link needs the mounted router to call onNavigate. This one keeps its
// contract: onNavigate runs on a click and can cancel; otherwise it pushes.
vi.mock("next/link", () => ({
  default: ({ href, onNavigate, children, ...rest }: LinkStubProps) => (
    <a
      href={href}
      {...rest}
      onClick={(event) => {
        event.preventDefault();
        let prevented = false;
        onNavigate?.({ preventDefault: () => (prevented = true) });
        if (!prevented) navigation.push(href);
      }}
    >
      {children}
    </a>
  ),
}));
type LinkStubProps = ComponentProps<"a"> & { href: string; onNavigate?: (event: { preventDefault: () => void }) => void };

function csvFile(text: string, name = "sales.csv") {
  return new File([text], name, { type: "text/csv" });
}

// axe's rule ids that fail on the page. jsdom lays nothing out, so colour
// contrast is checked in the browser instead (D-057).
async function axeViolations(): Promise<string[]> {
  const result = await axe.run(document.body, { rules: { "color-contrast": { enabled: false } } });
  return result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(", ")}`);
}

// The first screen's button, or the workspace header's.
function upload(file: File) {
  fireEvent.change(screen.getByLabelText(/^Upload (Own )?CSV$/), { target: { files: [file] } });
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
    navigation.search = "";
    navigation.replace.mockClear();
    navigation.push.mockClear();
  });

  it("has the wordmark as its only top-level heading", () => {
    render(<Studio />);
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual(["Chartseer"]);
  });

  it("passes axe on the first screen and in the workspace", async () => {
    render(<Studio />);
    expect(await axeViolations()).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Open demo: Gelateria Nebbia" }));
    // The first test to open the workspace waits for its lazy chunk to load cold.
    await screen.findByRole("button", { name: "Daily revenue by shop in 2025" }, { timeout: 5000 });
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

  it("shortens the note in the workspace to a disclosure of the full sentence", async () => {
    render(<Studio />);
    fireEvent.click(screen.getByRole("button", { name: "Open demo: Gelateria Nebbia" }));
    const disclosure = await screen.findByRole("button", { name: "Your file stays on this device" });
    const full = document.getElementById(disclosure.getAttribute("aria-controls") ?? "");
    expect(full?.textContent).toBe(PRIVACY_NOTE);
    expect(disclosure.getAttribute("aria-expanded")).toBe("false");
    expect(full?.hidden).toBe(true);

    fireEvent.click(disclosure);
    expect(disclosure.getAttribute("aria-expanded")).toBe("true");
    expect(full?.hidden).toBe(false);

    fireEvent.click(disclosure);
    expect(full?.hidden).toBe(true);
  });

  it("shows the full note in the chat before the first message", async () => {
    render(<Studio />);
    fireEvent.click(screen.getByRole("button", { name: "Open demo: Gelateria Nebbia" }));
    const chat = await screen.findByRole("region", { name: "Chat" });
    expect(within(chat).getByText(PRIVACY_NOTE)).toBeTruthy();
  });

  it("sums up the dataset under its name in the switcher", async () => {
    render(<Studio />);
    fireEvent.click(screen.getByRole("button", { name: "Open demo: Santander Cycles, London" }));
    await screen.findByLabelText("Dataset");
    expect(screen.getByText(datasets.bikes.title, { selector: "span" })).toBeTruthy();
    expect(screen.getByText("About 25,000 rows · January to May 2026")).toBeTruthy();
  });

  it("sums up an upload by its file name and rows", async () => {
    render(<Studio />);
    upload(csvFile("shop,revenue\nBrixton,1\nSoho,2\nPeckham,3\n", "takings.csv"));
    await screen.findByDisplayValue("takings.csv");
    expect(screen.getByText("takings.csv", { selector: "span" })).toBeTruthy();
    expect(screen.getByText("3 rows")).toBeTruthy();
  });

  it("loads a valid file and lists it in the picker", async () => {
    render(<Studio />);
    upload(csvFile('shop,revenue\nBrixton,"£1,200"\n'));
    const picker = (await screen.findByDisplayValue("sales.csv")) as HTMLSelectElement;
    expect(picker.value).toBe("upload");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(await screen.findByText("Ask for a chart of your data.")).toBeTruthy();
  });

  it("opens on a choice of demo datasets or an upload", () => {
    render(<Studio />);
    expect(screen.getByRole("heading", { name: "Choose some data to chart" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open demo: Gelateria Nebbia" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open demo: Santander Cycles, London" })).toBeTruthy();
    // The full attribution and the sample note, as wherever the dataset is shown.
    expect(screen.getByText(`${datasets.bikes.attribution} ${datasets.bikes.note}`)).toBeTruthy();
    expect(screen.getByLabelText("Upload Own CSV")).toBeTruthy();
    expect(screen.queryByLabelText("Dataset")).toBeNull();
  });

  it("loads a demo dataset and offers its starters", async () => {
    render(<Studio />);
    fireEvent.click(screen.getByRole("button", { name: "Open demo: Gelateria Nebbia" }));
    expect(((await screen.findByLabelText("Dataset")) as HTMLSelectElement).value).toBe("gelato");
    expect(await screen.findByRole("button", { name: "Daily revenue by shop in 2025" })).toBeTruthy();
  });

  it("offers a retry when a demo dataset fails to load", async () => {
    const fetch = vi.fn(async () => new Response("", { status: 500 }));
    vi.stubGlobal("fetch", fetch);
    render(<Studio />);
    fireEvent.click(screen.getByRole("button", { name: "Open demo: Gelateria Nebbia" }));
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
    fireEvent.click(screen.getByRole("button", { name: "Open demo: Gelateria Nebbia" }));
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

describe("Studio routes", () => {
  beforeEach(() => {
    Element.prototype.scrollTo = () => {};
    // jsdom has no showModal; this is enough for the dialog to open and close.
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("date,shop,scoops\n2025-06-01,Brixton,10\n")),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    clearHandoff();
    navigation.search = "";
    navigation.replace.mockClear();
    navigation.push.mockClear();
  });

  function wordmark() {
    return screen.getByRole("link", { name: "Chartseer" });
  }

  async function startConversation() {
    fireEvent.click(await screen.findByRole("button", { name: "Daily revenue by shop in 2025" }));
    await screen.findByText("Daily revenue by shop in 2025", { selector: ":not(button)" });
  }

  it("shows the chooser with no dataset in the URL", () => {
    render(<Studio />);
    expect(screen.getByRole("heading", { name: "Choose some data to chart" })).toBeTruthy();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it.each([
    ["bikes", "Journeys by hour of day, weekdays against weekends"],
    ["gelato", "Daily revenue by shop in 2025"],
  ])("opens ?dataset=%s straight into the workspace", async (id, starter) => {
    navigation.search = `?dataset=${id}`;
    render(<Studio />);
    expect(((await screen.findByLabelText("Dataset")) as HTMLSelectElement).value).toBe(id);
    expect(await screen.findByRole("button", { name: starter })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Choose some data to chart" })).toBeNull();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("falls back to the chooser on an unknown dataset, and tidies the URL", () => {
    navigation.search = "?dataset=nonsense";
    render(<Studio />);
    expect(screen.getByRole("heading", { name: "Choose some data to chart" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(navigation.replace).toHaveBeenCalledWith("/app");
  });

  it("keeps the URL in step with the dataset, replacing rather than pushing", async () => {
    render(<Studio />);
    fireEvent.click(screen.getByRole("button", { name: "Open demo: Gelateria Nebbia" }));
    expect(navigation.replace).toHaveBeenLastCalledWith("/app?dataset=gelato");
    fireEvent.change(await screen.findByLabelText("Dataset"), { target: { value: "bikes" } });
    expect(navigation.replace).toHaveBeenLastCalledWith("/app?dataset=bikes");
    upload(csvFile("a,b\n1,2\n"));
    await screen.findByDisplayValue("sales.csv");
    expect(navigation.replace).toHaveBeenLastCalledWith("/app");
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("changes the URL only once a mid-conversation switch is confirmed", async () => {
    navigation.search = "?dataset=gelato";
    render(<Studio />);
    await startConversation();
    fireEvent.change(screen.getByLabelText("Dataset"), { target: { value: "bikes" } });
    expect(navigation.replace).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Start afresh" }));
    expect(navigation.replace).toHaveBeenCalledWith("/app?dataset=bikes");
  });

  it("asks before the switcher replaces a conversation, and keeps it on Cancel", async () => {
    navigation.search = "?dataset=gelato";
    render(<Studio />);
    await startConversation();
    fireEvent.change(screen.getByLabelText("Dataset"), { target: { value: "bikes" } });
    expect(screen.getByRole("dialog", { name: "Start a new conversation?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect((screen.getByLabelText("Dataset") as HTMLSelectElement).value).toBe("gelato");
    expect(screen.getByText("Daily revenue by shop in 2025", { selector: ":not(button)" })).toBeTruthy();
  });

  it("opens a file handed over by the landing page, and empties the hand-off", async () => {
    handOff({ name: "takings.csv", csv: { columns: ["stall", "takings"], rows: [{ stall: "Cheese", takings: "12" }] } });
    render(<Studio />);
    expect(((await screen.findByLabelText("Dataset")) as HTMLSelectElement).value).toBe("upload");
    expect(screen.getByDisplayValue("takings.csv")).toBeTruthy();
    expect(peekHandoff()).toBeNull();
  });

  it("links the wordmark home, without asking when there is no conversation", () => {
    render(<Studio />);
    expect(wordmark().getAttribute("href")).toBe("/");
    fireEvent.click(wordmark());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(navigation.push).toHaveBeenCalledWith("/");
  });

  it("asks before leaving a conversation: Stay keeps everything", async () => {
    navigation.search = "?dataset=gelato";
    render(<Studio />);
    await startConversation();
    fireEvent.click(wordmark());
    const dialog = screen.getByRole("dialog", { name: "Leave and lose this chat?" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Stay" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(wordmark());
    expect(screen.getByText("Daily revenue by shop in 2025", { selector: ":not(button)" })).toBeTruthy();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("asks before leaving a conversation: Leave goes home", async () => {
    navigation.search = "?dataset=gelato";
    render(<Studio />);
    await startConversation();
    fireEvent.click(wordmark());
    fireEvent.click(screen.getByRole("button", { name: "Leave" }));
    expect(navigation.push).toHaveBeenCalledWith("/");
  });
});
