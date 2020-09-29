import React, { FC } from "react";
import { useDispatch } from "react-redux";
import { SerializableTokenAccount } from "../../api/token/TokenAccount";
import { TokenPairToken } from "./TokenPairToken";

enum TestIds {
  TOKEN_SELECTOR_TO = "TOKEN_SELECTOR_TO",
}

type TokenPairToTokenProps = {
  toAmount: number;
  fromTokenAccount?: SerializableTokenAccount;
  toTokenAccount?: SerializableTokenAccount;
  tokenAccounts: Array<SerializableTokenAccount>;
  selectToTokenAccount: (
    selectedTokenAccount: SerializableTokenAccount
  ) => void;
  setFromAmount: (amount: number) => void;
  loading: boolean;
};

export const TokenPairToToken: FC<TokenPairToTokenProps> = (
  props: TokenPairToTokenProps
) => {
  const dispatch = useDispatch();

  const {
    tokenAccounts,
    toAmount,
    toTokenAccount,
    selectToTokenAccount,
    loading,
  } = props;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectToTokenHandleChange = (event: any) => {
    const index = event.target.value;
    const token = tokenAccounts.find((token) => token.mint?.symbol === index);
    if (token) {
      dispatch(selectToTokenAccount(token));
    }
  };

  return (
    <TokenPairToken
      tokenAccount={toTokenAccount}
      amount={toAmount}
      selectTokenHandleChange={selectToTokenHandleChange}
      showMaxButton={false}
      cardHeaderTitle="To"
      disableAmountInput={true}
      loading={loading}
      tokenAccounts={tokenAccounts}
      data-testid={TestIds.TOKEN_SELECTOR_TO}
    />
  );
};
