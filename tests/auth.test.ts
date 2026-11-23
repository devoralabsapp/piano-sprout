import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  platform: "ios",
  validate: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithCredential: vi.fn(),
  signInWithPopup: vi.fn(),
  auth: { app: { options: { projectId: "demo-piano-sprout" } } },
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => mocks.platform !== "web",
    getPlatform: () => mocks.platform,
  },
  registerPlugin: () => ({ validate: mocks.validate }),
}));
vi.mock("../src/lib/firebase", () => ({ auth: mocks.auth, configured: true }));
vi.mock("@capacitor-firebase/authentication", () => ({
  FirebaseAuthentication: { signInWithGoogle: mocks.signInWithGoogle },
}));
vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {
    static credential = (idToken: string) => ({ idToken });
    setCustomParameters() {}
  },
  onAuthStateChanged: vi.fn(),
  signInWithCredential: mocks.signInWithCredential,
  signInWithPopup: mocks.signInWithPopup,
  signOut: vi.fn(),
}));

import { signInGoogle } from "../src/lib/auth";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.platform = "ios";
  mocks.validate.mockResolvedValue(undefined);
  mocks.signInWithGoogle.mockResolvedValue({
    credential: { idToken: "test-token" },
  });
});

describe("native Google sign-in configuration", () => {
  it("blocks the native SDK when the installed callback configuration is invalid", async () => {
    mocks.validate.mockRejectedValue(new Error("Missing callback scheme"));
    await expect(signInGoogle()).rejects.toThrow("Vui lòng cập nhật ứng dụng.");
    expect(mocks.signInWithGoogle).not.toHaveBeenCalled();
    expect(mocks.signInWithCredential).not.toHaveBeenCalled();
  });

  it("validates the JS project before requesting a native credential", async () => {
    await signInGoogle();
    expect(mocks.validate).toHaveBeenCalledWith({
      projectId: "demo-piano-sprout",
    });
    expect(mocks.validate.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.signInWithGoogle.mock.invocationCallOrder[0],
    );
    expect(mocks.signInWithGoogle).toHaveBeenCalledWith({
      skipNativeAuth: true,
    });
    expect(mocks.signInWithCredential).toHaveBeenCalledWith(mocks.auth, {
      idToken: "test-token",
    });
  });

  it("preserves cancellation errors from a correctly configured native login", async () => {
    const cancelled = new Error("The user cancelled sign-in");
    mocks.signInWithGoogle.mockRejectedValue(cancelled);
    await expect(signInGoogle()).rejects.toBe(cancelled);
    expect(mocks.signInWithCredential).not.toHaveBeenCalled();
  });

  it("rejects a native result without an ID token", async () => {
    mocks.signInWithGoogle.mockResolvedValue({ credential: null });
    await expect(signInGoogle()).rejects.toThrow("Không đăng nhập được.");
    expect(mocks.signInWithCredential).not.toHaveBeenCalled();
  });

  it("continues using a popup on web without calling the iOS bridge", async () => {
    mocks.platform = "web";
    await signInGoogle();
    expect(mocks.signInWithPopup).toHaveBeenCalled();
    expect(mocks.validate).not.toHaveBeenCalled();
    expect(mocks.signInWithGoogle).not.toHaveBeenCalled();
  });
});
