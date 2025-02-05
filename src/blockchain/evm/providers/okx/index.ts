// --------------------- npm package ---------------------
import * as cryptoJS from "crypto-js";
import { Address, erc20Abi } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { WalletClientConfig } from "../../evm.service";
import { config } from "dotenv";
config();

const API_BASE_URL = "https://www.okx.com/api/v5/dex/aggregator";

// gasPrice or GasLimit ratio
const GAS_PRICE_RATIO = BigInt(15); // *15 to avoid GasPrice too low

const PASSPHRASE = process.env.OKX_PASSPHRASE;
const OKX_API_KEY = process.env.OKX_API_KEY;
const PRIVATE_KEY = process.env.EVM_PRIVATE_KEY;
const SECRET_KEY = process.env.OKX_SECRET_KEY;

const DEFAULT_SLIPPAGE = "0.03";

const USER_ADDRESS = privateKeyToAddress(PRIVATE_KEY as `0x${string}`);

export const OKX_SPENDER_ADDRESSES = {
  "1": "0x40aA958dd87FC8305b97f2BA922CDdCa374bcD7f",
  "8453": "0x57df6092665eb6058DE53939612413ff4B09114E",
  "42161": "0x70cBb871E8f30Fc8Ce23609E9E0Ea87B6b222F58",
  "56": "0x2c34A2Fb1d0b4f55de51E1d0bDEfaDDce6b7cDD6",
} as const;

function getAggregatorRequestUrl(methodName, queryParams) {
  return (
    API_BASE_URL +
    methodName +
    "?" +
    new URLSearchParams(queryParams).toString()
  );
}

function getHeaderParams(path: string) {
  const date = new Date();

  const okx_path = path.replace("https://www.okx.com", "");
  return {
    "Content-Type": "application/json",
    "OK-ACCESS-KEY": OKX_API_KEY,
    "OK-ACCESS-SIGN": cryptoJS.enc.Base64.stringify(
      cryptoJS.HmacSHA256(date.toISOString() + "GET" + okx_path, SECRET_KEY)
    ),
    "OK-ACCESS-TIMESTAMP": date.toISOString(),
    "OK-ACCESS-PASSPHRASE": PASSPHRASE,
  };
}

type GetAllowanceParams = {
  ownerAddress: Address;
  spenderAddress: Address;
  client: WalletClientConfig;
  tokenAddress: Address;
};

async function getAllowance({
  ownerAddress,
  spenderAddress,
  client,
  tokenAddress,
}: GetAllowanceParams) {
  try {
    const allowance = await client.readContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "allowance",
      args: [ownerAddress, spenderAddress],
    });
    return parseFloat(allowance as unknown as string);
  } catch (error) {
    console.error("Failed to query allowance:", error);
  }
}

type ApproveTransactionParams = {
  chainId: string;
  tokenContractAddress: string;
  approveAmount: string;
};

async function approveTransaction(
  approveTransactionParams: ApproveTransactionParams
) {
  const apiRequestUrl = getAggregatorRequestUrl(
    "/approve-transaction",
    approveTransactionParams
  );
  console.log("apiRequestUrl:", apiRequestUrl);

  const headers = getHeaderParams(apiRequestUrl);
  console.log("headers:", headers);
  const res = await fetch(apiRequestUrl, {
    method: "get",
    headers,
  });
  return res.json();
}

type SendApproveTxParams = {
  ownerAddress: Address;
  fromAmount: string;
  client: WalletClientConfig;
  chainId: string;
  fromTokenAddress: Address;
  spenderAddress: Address;
};

async function sendApproveTx({
  ownerAddress,
  fromAmount,
  client,
  chainId,
  fromTokenAddress,
  spenderAddress,
}: SendApproveTxParams) {
 
  const { data } = await approveTransaction({
    chainId: chainId,
    tokenContractAddress: fromTokenAddress,
    approveAmount: fromAmount,
  });

  const hash = await client.writeContract({
    address: fromTokenAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [spenderAddress, BigInt(fromAmount)],
    chain: client.chain,
    account: client.account,
  });

  return hash;
  // const txObject = {
  //   nonce: nonce,
  //   to: fromTokenAddress, // approve token address
  //   gasLimit: data[0].gasLimit * 2, // avoid GasLimit too low
  //   gasPrice: (gasPrice * BigInt(3)) / BigInt(2), // avoid GasPrice too low
  //   data: data[0].data, // approve callData
  //   value: 0, // approve value fix 0
  // };

  // const serializedTransaction = await client.signTransaction({
  //   ...txObject,
  //   account: client.account,
  //   chain: client.chain,
  // });
  // await client.sendRawTransaction({ serializedTransaction });
}

type QuoteParams = {
  amount: string;
  chainId: string;
  toTokenAddress: string;
  fromTokenAddress: string;
};

async function getQuote(quoteParams: QuoteParams) {
  const apiRequestUrl = getAggregatorRequestUrl("/quote", quoteParams);
  const res = await fetch(apiRequestUrl, {
    method: "get",
    headers: getHeaderParams(apiRequestUrl),
  });
  return res.json();
}

type SwapParams = {
  chainId: string;
  fromTokenAddress: Address;
  toTokenAddress: Address;
  amount: string;
  slippage: string;
  userWalletAddress: Address;
};

export async function getSwapData(swapParams: SwapParams) {
  const apiRequestUrl = getAggregatorRequestUrl("/swap", swapParams);
  const res = await fetch(apiRequestUrl, {
    method: "get",
    headers: getHeaderParams(apiRequestUrl),
  });
  return res.json();
}

type SendAndSwapParams = {
  swapData: any;
  client: WalletClientConfig;
};

async function sendAndSwap({ swapData, client }: SendAndSwapParams) {
  const nonce = await client.getTransactionCount({
    address: client.account.address,
  });

  const swapDataTxInfo = swapData[0].tx;

  try {
    const tx = await client.signTransaction({
      chain: client.chain,
      account: client.account,
      data: swapDataTxInfo.data,
      gasPrice: BigInt(swapDataTxInfo.gasPrice) * BigInt(GAS_PRICE_RATIO), // avoid GasPrice too low,
      to: swapDataTxInfo.to,
      value: swapDataTxInfo.value,
      gas: BigInt(swapDataTxInfo.gas) * BigInt(GAS_PRICE_RATIO), // avoid GasLimit too low
      nonce,
    });
    const hash = await client.sendRawTransaction({
      serializedTransaction: tx,
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    const logs = receipt.logs;
  } catch (error) {
    console.log("error:", error);
  }
}

type ExecuteSwapParams = {
  chainId: string;
  fromTokenAddress: Address;
  toTokenAddress: Address;
  fromAmount: string;
  slippage: string;
  client: WalletClientConfig;
};

export async function executeOkxSwap({
  chainId,
  fromTokenAddress,
  toTokenAddress,
  fromAmount,
  slippage = DEFAULT_SLIPPAGE,
  client,
}: ExecuteSwapParams) {
  const spenderAddress =
    OKX_SPENDER_ADDRESSES[chainId as keyof typeof OKX_SPENDER_ADDRESSES];

  const allowanceAmount = await getAllowance({
    ownerAddress: USER_ADDRESS,
    spenderAddress,
    client,
    tokenAddress: fromTokenAddress,
  });
  if (allowanceAmount < parseFloat(fromAmount)) {
    await sendApproveTx({
      ownerAddress: USER_ADDRESS,
      fromAmount,
      client,
      chainId: chainId,
      fromTokenAddress,
      spenderAddress,
    });
  }

  const swapData = await getSwapData({
    chainId,
    fromTokenAddress,
    toTokenAddress,
    amount: fromAmount,
    slippage,
    userWalletAddress: USER_ADDRESS,
  });

  if (swapData.code !== "0") {
    throw new Error(swapData.message);
  }

  await sendAndSwap({
    swapData: swapData.data,
    client,
  });
}
