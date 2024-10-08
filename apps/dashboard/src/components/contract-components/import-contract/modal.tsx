import {
  useAddContractMutation,
  useAllContractList,
} from "@3rdweb-sdk/react/hooks/useRegistry";
import { Flex, FormControl } from "@chakra-ui/react";
import { NetworkSelectorButton } from "components/selects/NetworkSelectorButton";
import { SolidityInput } from "contract-ui/components/solidity-inputs";
import { useChainSlug } from "hooks/chains/chainSlug";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FiFilePlus } from "react-icons/fi";
import { getAddress } from "thirdweb";
import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { Button, FormErrorMessage } from "tw-components";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const ImportModal: React.FC<ImportModalProps> = (props) => {
  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={(v) => {
        if (!v) {
          props.onClose();
        }
      }}
    >
      <DialogContent dialogOverlayClassName="z-[9000]" className="z-[9001]">
        <DialogHeader>
          <DialogTitle>Import Contract</DialogTitle>
          <DialogDescription>
            Import an already deployed contract into thirdweb by entering a
            contract address below.
          </DialogDescription>
        </DialogHeader>

        <ImportForm />
      </DialogContent>
    </Dialog>
  );
};

function ImportForm() {
  const router = useRouter();
  const chainId = useActiveWalletChain()?.id;
  const chainSlug = useChainSlug(chainId || 1);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const form = useForm({
    defaultValues: {
      contractAddress: "",
    },
  });
  const addToDashboard = useAddContractMutation();
  const address = useActiveAccount()?.address;
  const registry = useAllContractList(address);

  return (
    <form
      onSubmit={form.handleSubmit(async (data) => {
        if (!chainId) {
          throw new Error("No chain ID");
        }
        let contractAddress: string;

        try {
          contractAddress = getAddress(data.contractAddress);
        } catch {
          form.setError("contractAddress", {
            message: "Invalid contract address",
          });
          return;
        }

        try {
          const res = await fetch(
            `https://contract.thirdweb.com/metadata/${chainId}/${contractAddress}`,
          );
          const json = await res.json();

          if (json.error) {
            throw new Error(json.message);
          }

          const hasUnknownContractName =
            !!json.settings?.compilationTarget?.UnknownContract;

          const hasPartialAbi = json.metadata?.isPartialAbi;

          if (hasUnknownContractName || hasPartialAbi) {
            form.setError("contractAddress", {
              message:
                "This contract cannot be imported since it's not verified on any block explorers.",
            });
            return;
          }

          const isInRegistry =
            registry.isFetched &&
            registry.data?.find(
              (c) =>
                contractAddress &&
                // compare address...
                c.address.toLowerCase() === contractAddress.toLowerCase() &&
                // ... and chainId
                c.chainId === chainId,
            ) &&
            registry.isSuccess;

          if (isInRegistry) {
            router.push(`/${chainSlug}/${contractAddress}`);
            setIsRedirecting(true);
            return;
          }

          addToDashboard.mutate(
            {
              contractAddress,
              chainId,
            },
            {
              onSuccess: () => {
                router.push(`/${chainSlug}/${contractAddress}`);
              },
              onError: (err) => {
                console.error(err);
              },
            },
          );
        } catch (err) {
          console.error(err);
        }
      })}
    >
      <Flex gap={6} direction="column">
        <Flex gap={3} direction="column">
          <FormControl isInvalid={!!form.formState.errors.contractAddress}>
            <SolidityInput
              solidityType="address"
              formContext={form}
              placeholder="Contract address"
              {...form.register("contractAddress")}
            />
            <FormErrorMessage>
              {form.formState.errors.contractAddress?.message}
            </FormErrorMessage>
          </FormControl>

          <NetworkSelectorButton />
        </Flex>
        <Button
          ml="auto"
          leftIcon={<FiFilePlus />}
          type="submit"
          variant="inverted"
          isLoading={
            form.formState.isSubmitting ||
            addToDashboard.isLoading ||
            addToDashboard.isSuccess ||
            isRedirecting
          }
          loadingText={
            addToDashboard.isSuccess || isRedirecting
              ? "Redirecting"
              : "Importing contract"
          }
        >
          Import
        </Button>
      </Flex>
    </form>
  );
}
