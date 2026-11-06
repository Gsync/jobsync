import { render, screen, waitFor } from "@testing-library/react";
import ApiKeySettings from "@/components/settings/ApiKeySettings";
import { AiProvider } from "@/models/ai.model";

const getUserApiKeys = vi.fn();
const getProviderDefaultBaseUrl = vi.fn();
const deleteApiKey = vi.fn();
const getUserSettings = vi.fn();
const checkLocalProviderConnection = vi.fn();

vi.mock("@/actions/apiKey.actions", () => ({
  getUserApiKeys: () => getUserApiKeys(),
  saveApiKey: vi.fn(),
  deleteApiKey: (provider: string) => deleteApiKey(provider),
  getProviderDefaultBaseUrl: (provider: string) =>
    getProviderDefaultBaseUrl(provider),
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

describe("ApiKeySettings — local provider connection probe", () => {
  beforeEach(() => {
    getUserApiKeys.mockResolvedValue({ success: true, data: [] });
    getProviderDefaultBaseUrl.mockImplementation((provider: string) =>
      Promise.resolve(
        provider === "ollama" ? "http://127.0.0.1:11434" : "http://127.0.0.1:8080",
      ),
    );
    checkLocalProviderConnection.mockResolvedValue({ isConnected: true });
  });

  it("does not probe any local provider when a cloud provider is selected", async () => {
    getUserSettings.mockResolvedValue(settingsFor(AiProvider.OPENROUTER));

    render(<ApiKeySettings />);

    await waitFor(() => expect(getUserSettings).toHaveBeenCalled());
    expect(checkLocalProviderConnection).not.toHaveBeenCalled();
    expect(screen.queryByText(/Ollama is (not )?running/)).toBeNull();
    expect(screen.queryByText(/Strata is (not )?running/)).toBeNull();
  });

  it("probes Ollama when it is the selected provider", async () => {
    getUserSettings.mockResolvedValue(settingsFor(AiProvider.OLLAMA));

    render(<ApiKeySettings />);

    await waitFor(() =>
      expect(screen.getByText("Ollama is running")).toBeInTheDocument(),
    );
    expect(checkLocalProviderConnection).toHaveBeenCalledWith(
      AiProvider.OLLAMA,
    );
  });

  it("probes Strata when it is the selected provider", async () => {
    getUserSettings.mockResolvedValue(settingsFor(AiProvider.STRATA));

    render(<ApiKeySettings />);

    await waitFor(() =>
      expect(screen.getByText("Strata is running")).toBeInTheDocument(),
    );
    expect(checkLocalProviderConnection).toHaveBeenCalledWith(
      AiProvider.STRATA,
    );
    // Ollama's own indicator stays unprobed and independent of Strata's.
    expect(screen.queryByText(/Ollama is (not )?running/)).toBeNull();
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
    getProviderDefaultBaseUrl.mockResolvedValue("http://127.0.0.1:11434");
    getUserSettings.mockResolvedValue(settingsFor(AiProvider.OPENROUTER));
    checkLocalProviderConnection.mockResolvedValue({ isConnected: false });
  });

  it("offers a labelled reset that names the server default", async () => {
    render(<ApiKeySettings />);

    await waitFor(() =>
      expect(screen.getByText("Reset to default")).toBeInTheDocument(),
    );
  });
});
