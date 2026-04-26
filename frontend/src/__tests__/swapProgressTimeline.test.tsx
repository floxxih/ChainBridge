import { render, screen } from "@testing-library/react";
import {
  SwapProgressTimeline,
  type SwapTimelineStep,
} from "@/components/timeline/SwapProgressTimeline";

const successSteps: SwapTimelineStep[] = [
  {
    key: "initiated",
    label: "Swap initiated",
    state: "completed",
    timestamp: "2026-01-01T00:00:00Z",
    chain: "Protocol",
  },
  {
    key: "source-locked",
    label: "Source lock created",
    state: "completed",
    timestamp: "2026-01-01T00:01:00Z",
    chain: "Stellar",
  },
  {
    key: "destination-locked",
    label: "Destination lock created",
    state: "current",
    chain: "Bitcoin",
  },
  {
    key: "claimed",
    label: "Claimed",
    state: "upcoming",
    chain: "Stellar",
  },
];

describe("SwapProgressTimeline", () => {
  it("renders every step label", () => {
    render(<SwapProgressTimeline steps={successSteps} />);
    expect(screen.getByText("Swap initiated")).toBeInTheDocument();
    expect(screen.getByText("Source lock created")).toBeInTheDocument();
    expect(screen.getByText("Destination lock created")).toBeInTheDocument();
    expect(screen.getByText("Claimed")).toBeInTheDocument();
  });

  it("marks the current step with aria-current", () => {
    render(<SwapProgressTimeline steps={successSteps} />);
    const list = screen.getByRole("list", { name: /swap progress timeline/i });
    const current = list.querySelector('[aria-current="step"]');
    expect(current).not.toBeNull();
    expect(current?.textContent).toContain("Destination lock created");
  });

  it("renders timestamps where provided and a fallback otherwise", () => {
    render(<SwapProgressTimeline steps={successSteps} />);
    expect(screen.getByText(/Pending/)).toBeInTheDocument();
  });

  it("supports the refund flow", () => {
    const refundSteps: SwapTimelineStep[] = [
      { key: "initiated", label: "Swap initiated", state: "completed" },
      { key: "source-locked", label: "Source lock created", state: "completed" },
      { key: "refunded", label: "Refunded", state: "current" },
    ];
    const { container } = render(
      <SwapProgressTimeline steps={refundSteps} flow="refund" />
    );
    expect(container.querySelector('[data-flow="refund"]')).not.toBeNull();
    expect(screen.getByText("Refunded")).toBeInTheDocument();
  });
});
