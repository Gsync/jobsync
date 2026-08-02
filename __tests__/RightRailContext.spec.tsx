import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  RightRailProvider,
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
});
