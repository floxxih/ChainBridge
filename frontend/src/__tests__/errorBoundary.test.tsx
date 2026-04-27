import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import * as errorMonitor from "@/lib/errorMonitor";

function Boom(): JSX.Element {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("renders fallback UI, logs with component context, and recovers when reset keys change", async () => {
    const user = userEvent.setup();
    const captureErrorSpy = jest.spyOn(errorMonitor, "captureError").mockImplementation(() => {});

    const { rerender } = render(
      <ErrorBoundary contextName="AppLayout" resetKeys={["/swap"]}>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(captureErrorSpy).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        errorBoundary: "AppLayout",
        componentStack: expect.any(String),
      })
    );

    rerender(
      <ErrorBoundary contextName="AppLayout" resetKeys={["/dashboard"]}>
        <div>Recovered after navigation</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Recovered after navigation")).toBeInTheDocument();

    rerender(
      <ErrorBoundary contextName="AppLayout" resetKeys={["/swap"]}>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText("Try again")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    captureErrorSpy.mockRestore();
  });
});
