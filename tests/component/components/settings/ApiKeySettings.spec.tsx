import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ApiKeySettings from "@/components/settings/ApiKeySettings";
import { AiProvider } from "@/models/ai.model";

const getUserApiKeys = vi.fn();
const getDefaultOllamaBaseUrl = vi.fn();
const getDefaultOpenaiCompatibleBaseUrl = vi.fn(async (): Promise<string | null> => null);
const deleteApiKey = vi.fn();
const getUserSettings = vi.fn();
const checkLocalProviderConnection = vi.fn();

vi.mock("@/actions/apiKey.actions", () => ({
  getUserApiKeys: () => getUserApiKeys(),
  saveApiKey: vi.fn(),
  deleteApiKey: (provider: string) => deleteApiKey(provider),
  getDefaultOllamaBaseUrl: () => getDefaultOllamaBaseUrl(),
  getDefaultOpenaiCompatibleBaseUrl: () => getDefaultOpenaiCompatibleBaseUrl(),
}));

vi.mock("@/actions/userSettings.actions", () => ({
  getUserSettings: () => getUserSettings(),
}));

vi.mock("@/utils/ai.utils", () => ({
  checkLocalProviderConnection: (provider: AiProvider) =>
    checkLocalProviderConnection(provider),
}));

vi.mock("@/lib/toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

function settingsFor(provider: AiProvider) {
  return {
    success: true,
    data: { userId: "u1", settings: { ai: { provider }, display: {} } },
  };
}

describe("ApiKeySettings — Ollama connection probe", () => {
  beforeEach(() => {
    getUserApiKeys.mockResolvedValue({ success: true, data: [] });
    getDefaultOllamaBaseUrl.mockResolvedValue("http://127.0.0.1:11434");
    checkLocalProviderConnection.mockResolvedValue({ isConnected: true });
  });

  it("does not probe Ollama when another provider is selected", async () => {
    getUserSettings.mockResolvedValue(settingsFor(AiProvider.OPENROUTER));

    render(<ApiKeySettings />);

    await waitFor(() => expect(getUserSettings).toHaveBeenCalled());
    expect(checkLocalProviderConnection).not.toHaveBeenCalled();
    expect(screen.queryByText(/Ollama is (not )?running/)).toBeNull();
  });

  it("auto-checks only the selected local provider and refreshes each card independently", async () => {
    getUserSettings.mockResolvedValue(settingsFor(AiProvider.OPENAI_COMPATIBLE));
    render(<ApiKeySettings />);
    expect(await screen.findByText("OpenAI-compatible is running")).toBeInTheDocument();
    expect(checkLocalProviderConnection.mock.calls).toEqual([["openai-compatible"]]);
    fireEvent.click(screen.getByRole("button", { name: "Check Ollama connection" }));
    expect(await screen.findByText("Ollama is running")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Check OpenAI-compatible connection" }));
    await waitFor(() => expect(checkLocalProviderConnection.mock.calls).toEqual([
      ["openai-compatible"], ["ollama"], ["openai-compatible"],
    ]));
  });

  it("probes Ollama when it is the selected provider", async () => {
    getUserSettings.mockResolvedValue(settingsFor(AiProvider.OLLAMA));

    render(<ApiKeySettings />);

    await waitFor(() =>
      expect(screen.getByText("Ollama is running")).toBeInTheDocument(),
    );
    expect(checkLocalProviderConnection).toHaveBeenCalledWith(AiProvider.OLLAMA);
  });
});

describe("ApiKeySettings — clearing a stored base URL", () => {
  beforeEach(() => {
    getUserApiKeys.mockResolvedValue({
      success: true,
      data: [
        {
          id: "k1",
          provider: "ollama",
          last4: "http://box:11434",
          displayValue: "http://box:11434",
          label: null,
          createdAt: new Date(),
          lastUsedAt: null,
        },
      ],
    });
    getDefaultOllamaBaseUrl.mockResolvedValue("http://127.0.0.1:11434");
    getUserSettings.mockResolvedValue(settingsFor(AiProvider.OPENROUTER));
    checkLocalProviderConnection.mockResolvedValue({ isConnected: false });
  });

  it("shows the defaults and explains removal when the compatible server has no default", async () => {
    getUserApiKeys.mockResolvedValue({ success: true, data: [{ provider: "openai-compatible", displayValue: "http://local" }] });
    getUserSettings.mockResolvedValue(settingsFor(AiProvider.OPENAI_COMPATIBLE));
    checkLocalProviderConnection.mockResolvedValueOnce({ isConnected: true });
    deleteApiKey.mockResolvedValue({ success: true });
    render(<ApiKeySettings />);
    expect(await screen.findByText("Default: none — set a URL")).toBeInTheDocument();
    expect(screen.getByText("Default: http://127.0.0.1:11434")).toBeInTheDocument();
    expect(await screen.findByText("OpenAI-compatible is running")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(await screen.findByText("Clear the saved OpenAI-compatible base URL? It stops working until you add one again, unless the server sets OPENAI_COMPATIBLE_BASE_URL.")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remove" }));
    expect(await screen.findByText("OpenAI-compatible is not running")).toBeInTheDocument();
  });

  it("shows the compatible server's env default and offers a reset to it", async () => {
    getDefaultOpenaiCompatibleBaseUrl.mockResolvedValueOnce("http://host.docker.internal:1234");
    getUserApiKeys.mockResolvedValue({ success: true, data: [{ provider: "openai-compatible", displayValue: "http://local" }] });
    render(<ApiKeySettings />);
    expect(await screen.findByText("Default: http://host.docker.internal:1234")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset to default" }));
    expect(await screen.findByText("Clear the saved OpenAI-compatible base URL? JobSync will use the server default, http://host.docker.internal:1234.")).toBeInTheDocument();
  });

  it("shows why the connection check failed", async () => {
    getUserSettings.mockResolvedValue(settingsFor(AiProvider.OPENAI_COMPATIBLE));
    checkLocalProviderConnection.mockResolvedValue({ isConnected: false, error: "No base URL is set for OpenAI-compatible. Add one under Settings → API Keys." });
    render(<ApiKeySettings />);
    expect(await screen.findByText("No base URL is set for OpenAI-compatible. Add one under Settings → API Keys.")).toBeInTheDocument();
    expect(screen.queryByText("OpenAI-compatible is not running")).not.toBeInTheDocument();
  });

  it("offers a labelled reset that names the server default", async () => {
    render(<ApiKeySettings />);

    await waitFor(() =>
      expect(screen.getByText("Reset to default")).toBeInTheDocument(),
    );
  });
});
