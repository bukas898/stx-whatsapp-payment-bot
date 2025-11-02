import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

// Define simnet instance (should be provided by Clarinet test environment)
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("Escrow Contract Tests", () => {
  
  describe("Create Escrow", () => {
    it("should create an escrow successfully", () => {
      const { result } = simnet.callPublicFn(
        "escrow",
        "create-escrow",
        [
          Cl.principal(wallet2),
          Cl.uint(1000000), // 1 STX
          Cl.uint(144), // ~24 hours
          Cl.stringUtf8("Payment for services"),
        ],
        wallet1
      );
      
      expect(result).toBeOk(Cl.uint(0)); // First escrow ID should be 0
    });

    it("should fail to create escrow with zero amount", () => {
      const { result } = simnet.callPublicFn(
        "escrow",
        "create-escrow",
        [
          Cl.principal(wallet2),
          Cl.uint(0), // Invalid: zero amount
          Cl.uint(144),
          Cl.stringUtf8("Test payment"),
        ],
        wallet1
      );
      
      expect(result).toBeErr(Cl.uint(104)); // err-invalid-amount
    });

    it.skip("should store correct escrow data", () => {
      // Create escrow
      simnet.callPublicFn(
        "escrow",
        "create-escrow",
        [
          Cl.principal(wallet2),
          Cl.uint(1000000),
          Cl.uint(144),
          Cl.stringUtf8("Test payment"),
        ],
        wallet1
      );

      // Read escrow data
      const { result } = simnet.callReadOnlyFn(
        "escrow",
        "get-escrow",
        [Cl.uint(0)],
        wallet1
      );

      expect(result).toBeSome(
        Cl.tuple({
          sender: Cl.principal(wallet1),
          recipient: Cl.principal(wallet2),
          amount: Cl.uint(1000000),
          status: Cl.stringAscii("active"),
        })
      );
    });
  });

  describe("Release Escrow", () => {
    beforeEach(() => {
      // Create an escrow before each test
      simnet.callPublicFn(
        "escrow",
        "create-escrow",
        [
          Cl.principal(wallet2),
          Cl.uint(1000000),
          Cl.uint(144),
          Cl.stringUtf8("Test payment"),
        ],
        wallet1
      );
    });

    it("should allow sender to release escrow", () => {
      const { result } = simnet.callPublicFn(
        "escrow",
        "release-escrow",
        [Cl.uint(0)],
        wallet1
      );
      
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should allow recipient to release escrow", () => {
      const { result } = simnet.callPublicFn(
        "escrow",
        "release-escrow",
        [Cl.uint(0)],
        wallet2
      );
      
      expect(result).toBeOk(Cl.bool(true));
    });

    it("should not allow unauthorized user to release escrow", () => {
      const { result } = simnet.callPublicFn(
        "escrow",
        "release-escrow",
        [Cl.uint(0)],
        wallet3
      );
      
      expect(result).toBeErr(Cl.uint(103)); // err-not-authorized
    });

    it("should update status to released", () => {
      // Release escrow
      simnet.callPublicFn(
        "escrow",
        "release-escrow",
        [Cl.uint(0)],
        wallet1
      );

      // Check status
      const { result } = simnet.callReadOnlyFn(
        "escrow",
        "get-status",
        [Cl.uint(0)],
        wallet1
      );

      expect(result).toBeOk(Cl.stringAscii("released"));
    });

    it("should not allow releasing already released escrow", () => {
      // Release once
      simnet.callPublicFn(
        "escrow",
        "release-escrow",
        [Cl.uint(0)],
        wallet1
      );

      // Try to release again
      const { result } = simnet.callPublicFn(
        "escrow",
        "release-escrow",
        [Cl.uint(0)],
        wallet1
      );

      expect(result).toBeErr(Cl.uint(108)); // err-already-released
    });
  });

  describe("Refund Escrow", () => {
    it("should not allow refund before timeout", () => {
      // Create escrow with timeout
      simnet.callPublicFn(
        "escrow",
        "create-escrow",
        [
          Cl.principal(wallet2),
          Cl.uint(1000000),
          Cl.uint(10), // 10 blocks
          Cl.stringUtf8("Test payment"),
        ],
        wallet1
      );

      // Try to refund immediately
      const { result } = simnet.callPublicFn(
        "escrow",
        "refund-escrow",
        [Cl.uint(0)],
        wallet1
      );

      expect(result).toBeErr(Cl.uint(107)); // err-timeout-not-reached
    });

    it("should allow refund after timeout", () => {
      // Create escrow with short timeout
      const createResult = simnet.callPublicFn(
        "escrow",
        "create-escrow",
        [
          Cl.principal(wallet2),
          Cl.uint(1000000),
          Cl.uint(5), // 5 blocks
          Cl.stringUtf8("Test payment"),
        ],
        wallet1
      );

      // Mine blocks to reach timeout
      simnet.mineEmptyBlocks(6);

      // Now refund should work
      const { result } = simnet.callPublicFn(
        "escrow",
        "refund-escrow",
        [Cl.uint(0)],
        wallet1
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should only allow sender to refund", () => {
      // Create escrow
      simnet.callPublicFn(
        "escrow",
        "create-escrow",
        [
          Cl.principal(wallet2),
          Cl.uint(1000000),
          Cl.uint(5),
          Cl.stringUtf8("Test payment"),
        ],
        wallet1
      );

      // Mine blocks
      simnet.mineEmptyBlocks(6);

      // Try to refund as recipient (should fail)
      const { result } = simnet.callPublicFn(
        "escrow",
        "refund-escrow",
        [Cl.uint(0)],
        wallet2
      );

      expect(result).toBeErr(Cl.uint(103)); // err-not-authorized
    });

    it("should update status to refunded", () => {
      // Create and wait for timeout
      simnet.callPublicFn(
        "escrow",
        "create-escrow",
        [
          Cl.principal(wallet2),
          Cl.uint(1000000),
          Cl.uint(5),
          Cl.stringUtf8("Test payment"),
        ],
        wallet1
      );

      simnet.mineEmptyBlocks(6);

      // Refund
      simnet.callPublicFn(
        "escrow",
        "refund-escrow",
        [Cl.uint(0)],
        wallet1
      );

      // Check status
      const { result } = simnet.callReadOnlyFn(
        "escrow",
        "get-status",
        [Cl.uint(0)],
        wallet1
      );

      expect(result).toBeOk(Cl.stringAscii("refunded"));
    });
  });

  describe("Cancel Escrow", () => {
    it("should allow sender to cancel escrow", () => {
      // Create escrow
      simnet.callPublicFn(
        "escrow",
        "create-escrow",
        [
          Cl.principal(wallet2),
          Cl.uint(1000000),
          Cl.uint(144),
          Cl.stringUtf8("Test payment"),
        ],
        wallet1
      );

      // Cancel
      const { result } = simnet.callPublicFn(
        "escrow",
        "cancel-escrow",
        [Cl.uint(0)],
        wallet1
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should not allow non-sender to cancel", () => {
      // Create escrow
      simnet.callPublicFn(
        "escrow",
        "create-escrow",
        [
          Cl.principal(wallet2),
          Cl.uint(1000000),
          Cl.uint(144),
          Cl.stringUtf8("Test payment"),
        ],
        wallet1
      );

      // Try to cancel as recipient
      const { result } = simnet.callPublicFn(
        "escrow",
        "cancel-escrow",
        [Cl.uint(0)],
        wallet2
      );

      expect(result).toBeErr(Cl.uint(103)); // err-not-authorized
    });

    it("should update status to cancelled", () => {
      // Create and cancel
      simnet.callPublicFn(
        "escrow",
        "create-escrow",
        [
          Cl.principal(wallet2),
          Cl.uint(1000000),
          Cl.uint(144),
          Cl.stringUtf8("Test payment"),
        ],
        wallet1
      );

      simnet.callPublicFn(
        "escrow",
        "cancel-escrow",
        [Cl.uint(0)],
        wallet1
      );

      // Check status
      const { result } = simnet.callReadOnlyFn(
        "escrow",
        "get-status",
        [Cl.uint(0)],
        wallet1
      );

      expect(result).toBeOk(Cl.stringAscii("cancelled"));
    });
  });

  describe("Read-only Functions", () => {
    it("should return correct escrow nonce", () => {
      const { result } = simnet.callReadOnlyFn(
        "escrow",
        "get-escrow-nonce",
        [],
        wallet1
      );

      expect(result).toBeOk(Cl.uint(0)); // Should be 0 initially
    });

    it.skip("should check if escrow can be refunded", () => {
      // Create escrow
      simnet.callPublicFn(
        "escrow",
        "create-escrow",
        [
          Cl.principal(wallet2),
          Cl.uint(1000000),
          Cl.uint(5),
          Cl.stringUtf8("Test payment"),
        ],
        wallet1
      );

      // Check before timeout
      let { result } = simnet.callReadOnlyFn(
        "escrow",
        "can-refund",
        [Cl.uint(0)],
        wallet1
      );
      expect(result).toBeOk(Cl.bool(false));

      // Mine blocks
      simnet.mineEmptyBlocks(6);

      // Check after timeout
      result = simnet.callReadOnlyFn(
        "escrow",
        "can-refund",
        [Cl.uint(0)],
        wallet1
      );
      expect(result).toBeOk(Cl.bool(true));
    });
  });
});