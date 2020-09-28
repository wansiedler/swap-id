import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import React from "react";
import {
  addNotification,
  dispatchErrorNotification,
} from "../notification/NotificationSlice";
import * as WalletAPI from "../../api/wallet";
import { RootState } from "../../app/rootReducer";
import { APIFactory, SwapParameters } from "../../api/pool";
import { Pool, SerializablePool } from "../../api/pool/Pool";
import { ViewTxOnExplorer } from "../../components/ViewTxOnExplorer";
import {
  SerializableTokenAccount,
  TokenAccount,
} from "../../api/token/TokenAccount";
import { SerializableToken, Token } from "../../api/token/Token";

export interface SwapState {
  fromTokenAccount?: SerializableTokenAccount;
  fromAmount: number;
  toTokenAccount?: SerializableTokenAccount;
  toAmount: number;
  selectedPool?: SerializablePool;
  availablePools: Array<SerializablePool>;
}

const initialState: SwapState = {
  availablePools: [],
  fromAmount: 0,
  toAmount: 0,
};

const getToAmount = (
  fromAmount: number,
  fromSerializableToken?: SerializableToken,
  serializablePool?: SerializablePool
) => {
  if (!serializablePool || !fromSerializableToken) return 0;

  const pool = Pool.from(serializablePool);
  const fromToken = Token.from(fromSerializableToken);
  return pool.calculateSwappedAmount(fromToken, fromAmount);
};

export const SWAP_SLICE_NAME = "swap";

const matches = (
  fromTokenAccount: TokenAccount,
  toTokenAccount: TokenAccount
) => (pool: Pool): boolean => pool.matches(fromTokenAccount, toTokenAccount);

export const selectPoolForTokenPair = createAsyncThunk(
  SWAP_SLICE_NAME + "/selectPoolForTokenPair",
  async (arg, thunkAPI): Promise<SerializablePool | null> => {
    const state: RootState = thunkAPI.getState() as RootState;
    const {
      fromTokenAccount: serializedFromTokenAccount,
      toTokenAccount: serializedToTokenAccount,
    } = state.swap;
    if (!serializedFromTokenAccount || !serializedToTokenAccount) return null;

    const fromTokenAccount = TokenAccount.from(serializedFromTokenAccount);
    const toTokenAccount = TokenAccount.from(serializedToTokenAccount);

    const pools = state.pool.availablePools.map((serializedPool) =>
      Pool.from(serializedPool)
    );
    const foundPool =
      pools.find(matches(fromTokenAccount, toTokenAccount)) || null;
    return foundPool && foundPool.serialize();
  }
);

export const executeSwap = createAsyncThunk(
  SWAP_SLICE_NAME + "/executeSwap",
  async (arg, thunkAPI): Promise<string> => {
    const state: RootState = thunkAPI.getState() as RootState;
    const walletState = state.wallet;
    const {
      fromTokenAccount: serializedFromTokenAccount,
      fromAmount,
      toTokenAccount: serializedToTokenAccount,
      selectedPool,
    } = state.swap;
    const wallet = WalletAPI.getWallet();

    const PoolAPI = APIFactory(walletState.cluster);

    if (
      !serializedFromTokenAccount ||
      !serializedToTokenAccount ||
      !wallet ||
      !selectedPool
    )
      return "";

    const swapParameters: SwapParameters = {
      fromAccount: TokenAccount.from(serializedFromTokenAccount),
      toAccount: TokenAccount.from(serializedToTokenAccount),
      wallet,
      fromAmount,
      pool: Pool.from(selectedPool),
    };

    const transactionSignature = await PoolAPI.swap(swapParameters).catch(
      dispatchErrorNotification(thunkAPI.dispatch)
    );
    thunkAPI.dispatch(
      addNotification({
        message: "Transaction sent",
        options: {
          action: <ViewTxOnExplorer txSignature={transactionSignature} />,
        },
      })
    );

    return transactionSignature;
  }
);

const normalize = (swapState: SwapState): SwapState => {
  const toAmount = getToAmount(
    swapState.fromAmount,
    swapState.fromTokenAccount?.mint,
    swapState.selectedPool
  );

  return {
    ...swapState,
    toAmount,
  };
};

const swapSlice = createSlice({
  name: SWAP_SLICE_NAME,
  initialState,
  reducers: {
    selectFromTokenAccount: (
      state,
      action: PayloadAction<SerializableTokenAccount>
    ) => ({
      ...state,
      fromTokenAccount: action.payload,
    }),
    selectToTokenAccount: (
      state,
      action: PayloadAction<SerializableTokenAccount>
    ) => ({
      ...state,
      toTokenAccount: action.payload,
    }),
    setFromAmount: (state, action: PayloadAction<number>) => ({
      ...state,
      fromAmount: action.payload,
    }),
    setToAmount: (state) => ({
      ...state,
      toAmount: getToAmount(
        state.fromAmount,
        state.fromTokenAccount?.mint,
        state.selectedPool
      ),
    }),

    updateSwapState: (state, action: PayloadAction<Partial<SwapState>>) =>
      normalize({
        ...state,
        ...action.payload,
      }),
  },
  extraReducers: (builder) => {
    builder.addCase(selectPoolForTokenPair.fulfilled, (state, action) => ({
      ...state,
      selectedPool: action.payload || undefined,
    }));
  },
});

export const {
  selectFromTokenAccount,
  selectToTokenAccount,
  setFromAmount,
  setToAmount,
} = swapSlice.actions;
export default swapSlice.reducer;
