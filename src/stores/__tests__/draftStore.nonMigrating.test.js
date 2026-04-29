/**
 * Non-Migrating Family Member CRUD tests for draftStore
 *
 * NOTE: Jest is not yet installed in this project. These tests are written
 * in Jest-compatible syntax and will execute once Jest is configured.
 * To wire up Jest: npm install --save-dev jest @testing-library/react
 * and add "test": "jest" to package.json scripts.
 *
 * These tests mock the Firebase adapter so they run offline.
 */

// ── Mock the database adapter ──────────────────────────────────────────────
const mockSaveDraft = jest.fn().mockResolvedValue({ success: true });
const mockLoadDraft = jest.fn().mockResolvedValue({});

jest.mock("@/lib/adapters", () => ({
  getAdapter: () => ({
    saveDraft: mockSaveDraft,
    loadDraft: mockLoadDraft,
    loadCompletionStatus: jest.fn().mockResolvedValue({}),
    saveCompletionStatus: jest.fn().mockResolvedValue({ success: true }),
    getPrefill: jest.fn().mockResolvedValue(false),
  }),
}));

// ── Import store after mocks are set up ────────────────────────────────────
let draftStore;

beforeEach(async () => {
  jest.resetModules();
  mockSaveDraft.mockClear();
  const mod = await import("@/stores/draftStore");
  draftStore = mod.draftStore;
  // Reset to a clean state
  draftStore.draft = {};
  draftStore.currentApplicationId = "test-app-id";
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("draftStore — Non-Migrating Family Members", () => {
  describe("getNonMigratingMembers()", () => {
    it("returns empty array when draft has no members", () => {
      expect(draftStore.getNonMigratingMembers()).toEqual([]);
    });

    it("returns the non_migrating_members array from draft", () => {
      draftStore.draft = {
        non_migrating_members: [{ id: "nmf_1", relationship: "parent" }],
      };
      expect(draftStore.getNonMigratingMembers()).toHaveLength(1);
    });
  });

  describe("getNonMigratingMember(id)", () => {
    it("returns null when member not found", () => {
      expect(draftStore.getNonMigratingMember("nonexistent")).toBeNull();
    });

    it("returns the correct member by id", () => {
      draftStore.draft = {
        non_migrating_members: [
          { id: "nmf_1", relationship: "parent" },
          { id: "nmf_2", relationship: "sibling" },
        ],
      };
      const member = draftStore.getNonMigratingMember("nmf_2");
      expect(member).not.toBeNull();
      expect(member.relationship).toBe("sibling");
    });
  });

  describe("addNonMigratingMember()", () => {
    it("adds a member and persists to the database", async () => {
      const newMember = { relationship: "parent", has_current_passport: "yes" };
      const result = await draftStore.addNonMigratingMember(newMember);

      expect(result.id).toBeTruthy();
      expect(result.id).toMatch(/^nmf_/);
      expect(result.relationship).toBe("parent");
      expect(draftStore.draft.non_migrating_members).toHaveLength(1);
      expect(mockSaveDraft).toHaveBeenCalledTimes(1);
    });

    it("preserves a provided id", async () => {
      const result = await draftStore.addNonMigratingMember({
        id: "nmf_custom_123",
        relationship: "sibling",
      });
      expect(result.id).toBe("nmf_custom_123");
    });

    it("accumulates multiple members without losing previous ones", async () => {
      await draftStore.addNonMigratingMember({ relationship: "parent" });
      await draftStore.addNonMigratingMember({ relationship: "sibling" });
      expect(draftStore.draft.non_migrating_members).toHaveLength(2);
    });
  });

  describe("updateNonMigratingMember()", () => {
    beforeEach(async () => {
      draftStore.draft = {
        non_migrating_members: [
          { id: "nmf_1", relationship: "parent", has_current_passport: "no" },
        ],
      };
    });

    it("updates the specified member and persists", async () => {
      await draftStore.updateNonMigratingMember("nmf_1", { has_current_passport: "yes" });
      const updated = draftStore.getNonMigratingMember("nmf_1");
      expect(updated.has_current_passport).toBe("yes");
      expect(updated.relationship).toBe("parent"); // unchanged field preserved
      expect(mockSaveDraft).toHaveBeenCalledTimes(1);
    });

    it("does not affect other members", async () => {
      draftStore.draft.non_migrating_members.push({ id: "nmf_2", relationship: "sibling" });
      await draftStore.updateNonMigratingMember("nmf_1", { relationship: "grandparent" });
      const untouched = draftStore.getNonMigratingMember("nmf_2");
      expect(untouched.relationship).toBe("sibling");
    });

    it("is a no-op for unknown ids", async () => {
      await draftStore.updateNonMigratingMember("nmf_unknown", { relationship: "other" });
      expect(draftStore.draft.non_migrating_members).toHaveLength(1);
      expect(draftStore.draft.non_migrating_members[0].id).toBe("nmf_1");
    });
  });

  describe("deleteNonMigratingMember()", () => {
    beforeEach(() => {
      draftStore.draft = {
        non_migrating_members: [
          { id: "nmf_1", relationship: "parent" },
          { id: "nmf_2", relationship: "sibling" },
        ],
      };
    });

    it("removes the specified member and persists", async () => {
      await draftStore.deleteNonMigratingMember("nmf_1");
      expect(draftStore.draft.non_migrating_members).toHaveLength(1);
      expect(draftStore.getNonMigratingMember("nmf_1")).toBeNull();
      expect(mockSaveDraft).toHaveBeenCalledTimes(1);
    });

    it("leaves other members intact", async () => {
      await draftStore.deleteNonMigratingMember("nmf_1");
      expect(draftStore.getNonMigratingMember("nmf_2")).not.toBeNull();
    });

    it("results in empty array when last member is deleted", async () => {
      await draftStore.deleteNonMigratingMember("nmf_1");
      await draftStore.deleteNonMigratingMember("nmf_2");
      expect(draftStore.draft.non_migrating_members).toHaveLength(0);
    });
  });

  describe("completion percentage isolation", () => {
    it("adding a non-migrating member does NOT change completionStatus", async () => {
      draftStore.completionStatus = { "temporary-work/start": true };
      await draftStore.addNonMigratingMember({ relationship: "parent" });
      // completionStatus should be untouched
      expect(Object.keys(draftStore.completionStatus)).toEqual(["temporary-work/start"]);
    });
  });
});
