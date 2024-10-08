import type { Address } from "abitype";
import type { BaseTransactionOptions } from "../../../../transaction/types.js";
import { getClaimParams } from "../../../../utils/extensions/drops/get-claim-params.js";
import * as generatedClaim from "../../__generated__/IDropERC20/write/claim.js";
import { decimals } from "../../read/decimals.js";
import { isGetActiveClaimConditionSupported } from "../read/getActiveClaimCondition.js";

/**
 * Represents the parameters for claiming an ERC20 token.
 * @extension ERC20
 */
export type ClaimToParams = {
  to: Address;
  from?: Address;
} & ({ quantityInWei: bigint } | { quantity: string });

/**
 * Claim ERC20 NFTs to a specified address
 * @param options - The options for the transaction
 * @extension ERC20
 * @example
 * ```ts
 * import { claimTo } from "thirdweb/extensions/erc20";
 * import { sendTransaction } from "thirdweb";
 *
 * const transaction = claimTo({
 *   contract,
 *   to: "0x...",
 *   quantity: 100n,
 * });
 *
 * await sendTransaction({ transaction, account });
 * ```
 * @throws If no claim condition is set
 * @returns A promise that resolves with the submitted transaction hash.
 */
export function claimTo(options: BaseTransactionOptions<ClaimToParams>) {
  return generatedClaim.claim({
    contract: options.contract,
    asyncParams: async () => {
      const quantity = await (async () => {
        if ("quantityInWei" in options) {
          return options.quantityInWei;
        }

        const { toUnits } = await import("../../../../utils/units.js");
        return toUnits(
          options.quantity,
          await decimals({ contract: options.contract }),
        );
      })();

      return getClaimParams({
        type: "erc20",
        contract: options.contract,
        to: options.to,
        quantity,
        from: options.from,
        tokenDecimals: await decimals({ contract: options.contract }),
      });
    },
  });
}

export function isClaimToSupported(availableSelectors: string[]) {
  return [
    // has to support the claim method
    generatedClaim.isClaimSupported(availableSelectors),
    // has to support the getActiveClaimCondition method
    isGetActiveClaimConditionSupported(availableSelectors),
  ].every(Boolean);
}
