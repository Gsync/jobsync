import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  RightRailProvider,
  useRightRail,
  useRightRailPanel,
} from "@/context/RightRailContext";

function Panel({ id }: { id: string }) {
  const { isHolder, claim, release } = useRightRailPanel(id);
  return (
    <div>
      <button onClick={claim}>open {id}</button>
      <button onClick={release}>close {id}</button>
      {isHolder && <span>{id} is open</span>}
    </div>
  );
}

const setup = () =>
  render(
    <RightRailProvider>
      <Panel id="chat" />
      <Panel id="review" />
    </RightRailProvider>,
  );

describe("RightRailContext", () => {
  it("lets one panel hold the rail", async () => {
    setup();
    await userEvent.click(screen.getByText("open chat"));
    expect(screen.getByText("chat is open")).toBeInTheDocument();
  });

  it("evicts the current holder when another panel opens", async () => {
    setup();
    await userEvent.click(screen.getByText("open chat"));
    await userEvent.click(screen.getByText("open review"));
    expect(screen.getByText("review is open")).toBeInTheDocument();
    expect(screen.queryByText("chat is open")).not.toBeInTheDocument();
  });

  it("never lets two panels hold the rail at once", async () => {
    setup();
    await userEvent.click(screen.getByText("open chat"));
    await userEvent.click(screen.getByText("open review"));
    expect(screen.getAllByText(/is open$/)).toHaveLength(1);
  });

  it("releases the rail so nothing holds it", async () => {
    setup();
    await userEvent.click(screen.getByText("open chat"));
    await userEvent.click(screen.getByText("close chat"));
    expect(screen.queryByText(/is open$/)).not.toBeInTheDocument();
  });

  it("ignores a release from a panel that does not hold the rail", async () => {
    setup();
    await userEvent.click(screen.getByText("open chat"));
    await userEvent.click(screen.getByText("close review"));
    expect(screen.getByText("chat is open")).toBeInTheDocument();
  });

  describe("onEvict", () => {
    const onEvict = vi.fn();

    function Claimer({ id }: { id: string }) {
      const { requestOpen } = useRightRail();
      return (
        <button
          onClick={() => requestOpen(id, id === "chat" ? onEvict : undefined)}
        >
          claim {id}
        </button>
      );
    }

    const setupClaimers = () =>
      render(
        <RightRailProvider>
          <Claimer id="chat" />
          <Claimer id="review" />
        </RightRailProvider>,
      );

    beforeEach(() => onEvict.mockClear());

    it("tells the previous holder once when another id claims the rail", async () => {
      setupClaimers();
      await userEvent.click(screen.getByText("claim chat"));
      await userEvent.click(screen.getByText("claim review"));
      expect(onEvict).toHaveBeenCalledTimes(1);
      await userEvent.click(screen.getByText("claim review"));
      expect(onEvict).toHaveBeenCalledTimes(1);
    });

    it("does not evict on a re-claim by the same id", async () => {
      setupClaimers();
      await userEvent.click(screen.getByText("claim chat"));
      await userEvent.click(screen.getByText("claim chat"));
      expect(onEvict).not.toHaveBeenCalled();
    });
  });
});
