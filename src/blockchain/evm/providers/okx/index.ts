// --------------------- npm package ---------------------
import { Web3 } from "web3";
import * as cryptoJS from "crypto-js";
import { createWalletClient, erc20Abi, http, publicActions } from "viem";
import { privateKeyToAccount, privateKeyToAddress } from "viem/accounts";
import { base } from "viem/chains";

import { config } from "dotenv";
config();

const viemClient = createWalletClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL),
  account: privateKeyToAccount(process.env.EVM_PRIVATE_KEY as `0x${string}`),
}).extend(publicActions);

const API_BASE_URL = "https://www.okx.com/api/v5/dex/aggregator";

// gasPrice or GasLimit ratio
const GAS_PRICE_RATIO = BigInt(15); // *15 to avoid GasPrice too low

const PASSPHRASE = process.env.OKX_PASSPHRASE;
const OKX_API_KEY = process.env.OKX_API_KEY;
const PRIVATE_KEY = process.env.EVM_PRIVATE_KEY;
const SECRET_KEY = process.env.OKX_SECRET_KEY;

const DEFAULT_SLIPPAGE = "0.03";

const USER_ADDRESS = privateKeyToAddress(PRIVATE_KEY as `0x${string}`);

const CHAIN_CONFIGS = {
  "1": {
    rpcUrl: process.env.MAINNET_RPC_URL as string,
    spenderAddress: "0x40aA958dd87FC8305b97f2BA922CDdCa374bcD7f",
    web3: new Web3(process.env.MAINNET_RPC_URL as string),
  },
  "8453": {
    rpcUrl: process.env.BASE_RPC_URL as string,
    spenderAddress: "0x57df6092665eb6058DE53939612413ff4B09114E",
    web3: new Web3(process.env.BASE_RPC_URL as string),
  },
  "42161": {
    rpcUrl: process.env.ARBITRUM_RPC_URL as string,
    spenderAddress: "0x70cBb871E8f30Fc8Ce23609E9E0Ea87B6b222F58",
    web3: new Web3(process.env.ARBITRUM_RPC_URL as string),
  },
  "56": {
    rpcUrl: process.env.BSC_RPC_URL as string,
    spenderAddress: "0x2c34A2Fb1d0b4f55de51E1d0bDEfaDDce6b7cDD6",
    web3: new Web3(process.env.BSC_RPC_URL as string),
  },
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
  ownerAddress: string;
  spenderAddress: string;
  web3: Web3;
  tokenAddress: string;
};

async function getAllowance({
  ownerAddress,
  spenderAddress,
  web3,
  tokenAddress,
}: GetAllowanceParams) {
  const tokenContract = new web3.eth.Contract(erc20Abi, tokenAddress);
  try {
    const allowance = await tokenContract.methods
      .allowance(ownerAddress, spenderAddress)
      .call();
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
  return fetch(apiRequestUrl, {
    method: "get",
    headers,
  })
    .then((res) => res.json())
    .then((res) => {
      return res;
    });
}

type SendApproveTxParams = {
  ownerAddress: string;
  fromAmount: string;
  web3: Web3;
  chainId: string;
  fromTokenAddress: string;
};

async function sendApproveTx({
  ownerAddress,
  fromAmount,
  web3,
  chainId,
  fromTokenAddress,
}: SendApproveTxParams) {
  let gasPrice = await web3.eth.getGasPrice();
  let nonce = await web3.eth.getTransactionCount(ownerAddress);
  const { data } = await approveTransaction({
    chainId: chainId,
    tokenContractAddress: fromTokenAddress,
    approveAmount: fromAmount,
  });

  const txObject = {
    nonce: nonce,
    to: fromTokenAddress, // approve token address
    gasLimit: data[0].gasLimit * 2, // avoid GasLimit too low
    gasPrice: (gasPrice * BigInt(3)) / BigInt(2), // avoid GasPrice too low
    data: data[0].data, // approve callData
    value: 0, // approve value fix 0
  };
  const { rawTransaction } = await web3.eth.accounts.signTransaction(
    txObject,
    PRIVATE_KEY
  );
  await web3.eth.sendSignedTransaction(rawTransaction);
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
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  slippage: string;
  userWalletAddress: string;
};

async function getSwapData(swapParams: SwapParams) {
  const apiRequestUrl = getAggregatorRequestUrl("/swap", swapParams);
  const res = await fetch(apiRequestUrl, {
    method: "get",
    headers: getHeaderParams(apiRequestUrl),
  });
  return res.json();
}

async function sendAndSwapViem(swapData: any) {
  const nonce = await viemClient.getTransactionCount({
    address: viemClient.account.address,
  });

  const swapDataTxInfo = swapData.swapData[0].tx;

  try {
    const tx = await viemClient.signTransaction({
      chain: base,
      account: viemClient.account,
      data: swapDataTxInfo.data,
      gasPrice: BigInt(swapDataTxInfo.gasPrice) * BigInt(GAS_PRICE_RATIO), // avoid GasPrice too low,
      to: swapDataTxInfo.to,
      value: swapDataTxInfo.value,
      gas: BigInt(swapDataTxInfo.gas) * BigInt(GAS_PRICE_RATIO), // avoid GasLimit too low
      nonce,
    });
    const hash = await viemClient.sendRawTransaction({
      serializedTransaction: tx,
    });
    const receipt = await viemClient.waitForTransactionReceipt({ hash });
    const logs = receipt.logs;
  } catch (error) {
    console.log("error:", error);
  }
}

type ExecuteSwapParams = {
  chainId: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
  slippage: string;
};

export async function executeOkxSwap({
  chainId,
  fromTokenAddress,
  toTokenAddress,
  fromAmount,
  slippage = DEFAULT_SLIPPAGE,
}: ExecuteSwapParams) {
  if (!CHAIN_CONFIGS[chainId]) {
    throw new Error(`Chain ID ${chainId} is not supported`);
  }
  const chainConfig = CHAIN_CONFIGS[chainId as keyof typeof CHAIN_CONFIGS];
  const spenderAddress = chainConfig.spenderAddress;

  const allowanceAmount = await getAllowance({
    ownerAddress: USER_ADDRESS,
    spenderAddress,
    web3: chainConfig.web3,
    tokenAddress: fromTokenAddress,
  });
  if (allowanceAmount < parseFloat(fromAmount)) {
    await sendApproveTx({
      ownerAddress: USER_ADDRESS,
      fromAmount,
      web3: chainConfig.web3,
      chainId: chainId,
      fromTokenAddress,
    });
  }

  // don't need that actually
  // const quote = await getQuote({
  //   amount: fromAmount,
  //   chainId,
  //   toTokenAddress,
  //   fromTokenAddress,
  // });

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

  await sendAndSwapViem({
    swapData: swapData.data,
    web3: chainConfig.web3,
    userAddress: USER_ADDRESS,
  });
}
