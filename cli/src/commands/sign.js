import { createWalletClient, http, fallback, formatUnits, decodeEventLog, publicActions } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { 
  estimateSignZap, 
  getTokenBalance, 
  getTokenAllowance,
  TOKEN_MAP, 
  TOKEN_DECIMALS, 
  ZAP_V2_ABI, 
  ERC20_ABI, 
  ZAP_CONTRACT,
  BASE_RPC_ENDPOINTS,
} from "../contract.js";

const MAX_UINT256 = 2n ** 256n - 1n;

function applySlippage(amount, slippagePercent) {
  // Use BigInt math to avoid precision loss: amount * (100 + slippage) / 100
  return (amount * BigInt(Math.round((100 + slippagePercent) * 100))) / 10000n;
}

export async function sign(opts) {
  const { url, hours, token: tokenOpt, slippage: slippageOpt } = opts;
  const privateKey = opts.privateKey || process.env.PRIVATE_KEY;
  
  const guaranteeHours = parseInt(hours);
  const slippage = parseFloat(slippageOpt || 5);
  
  if (guaranteeHours < 0 || guaranteeHours > 24) {
    console.error("❌ Hours must be between 0 and 24");
    process.exit(1);
  }

  if (!privateKey) {
    console.error("❌ Private key required. Use --private-key or set PRIVATE_KEY environment variable.");
    process.exit(1);
  }

  try {
    const account = privateKeyToAccount(privateKey);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: fallback(
        BASE_RPC_ENDPOINTS.map(url => http(url, { timeout: 30_000, retryCount: 1 })),
        { rank: false }
      ),
    }).extend(publicActions);

    console.log(`\n🚀 Signing on Signet\n`);
    console.log(`  URL: ${url}`);
    console.log(`  Hours: ${guaranteeHours}`);
    console.log(`  Slippage: ${slippage}%`);
    console.log(`  Wallet: ${account.address}`);

    let selectedToken, tokenAddress;
    
    if (tokenOpt === "auto") {
      // Auto token selection logic
      const result = await selectBestToken(account.address, guaranteeHours, slippage);
      selectedToken = result.token;
      tokenAddress = result.address;
      
      console.log(`  Auto-selected token: ${selectedToken.toUpperCase()}`);
    } else {
      selectedToken = tokenOpt.toLowerCase();
      tokenAddress = TOKEN_MAP[selectedToken];
      
      if (!tokenAddress) {
        console.error(`❌ Unknown token: ${tokenOpt}. Use: eth, usdc, mt, hunt, auto`);
        process.exit(1);
      }
      
      console.log(`  Token: ${selectedToken.toUpperCase()}`);
    }

    // Get estimate for the selected token
    const estimate = await estimateSignZap(tokenAddress, guaranteeHours);
    const tokenDecimals = TOKEN_DECIMALS[selectedToken];
    const estimatedAmount = estimate.fromTokenAmount;
    
    // Add slippage buffer (BigInt-safe)
    const maxFromTokenAmount = applySlippage(estimatedAmount, slippage);
    
    console.log(`  Estimated cost: ${formatUnits(estimatedAmount, tokenDecimals)} ${selectedToken.toUpperCase()}`);
    console.log(`  Max amount (with ${slippage}% slippage): ${formatUnits(maxFromTokenAmount, tokenDecimals)} ${selectedToken.toUpperCase()}`);

    // Check balance
    const balance = await getTokenBalance(selectedToken, account.address);
    if (balance < maxFromTokenAmount) {
      console.error(`❌ Insufficient balance. Need: ${formatUnits(maxFromTokenAmount, tokenDecimals)}, Have: ${formatUnits(balance, tokenDecimals)}`);
      process.exit(1);
    }

    // For ERC20 tokens, check and approve if needed
    if (tokenAddress !== TOKEN_MAP.eth) {
      const allowance = await getTokenAllowance(selectedToken, account.address, ZAP_CONTRACT);
      
      if (allowance < maxFromTokenAmount) {
        console.log(`  Approving ${selectedToken.toUpperCase()}...`);
        
        const approveHash = await walletClient.writeContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [ZAP_CONTRACT, MAX_UINT256],
        });
        
        console.log(`  Approve TX: ${approveHash}`);
        await walletClient.waitForTransactionReceipt({ hash: approveHash });
        console.log(`  ✅ Approval confirmed`);
      } else {
        console.log(`  ✅ ${selectedToken.toUpperCase()} already approved`);
      }
    }

    // Execute the sign transaction
    console.log(`  Signing...`);
    
    const signTxHash = await walletClient.writeContract({
      address: ZAP_CONTRACT,
      abi: ZAP_V2_ABI,
      functionName: "sign",
      args: [tokenAddress, url, maxFromTokenAmount, guaranteeHours],
      value: tokenAddress === TOKEN_MAP.eth ? maxFromTokenAmount : 0n,
    });
    
    console.log(`  Sign TX: ${signTxHash}`);
    
    // Wait for receipt and parse events
    const receipt = await walletClient.waitForTransactionReceipt({ hash: signTxHash });
    console.log(`  ✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Parse the Signed event
    try {
      const signedEvent = receipt.logs.find(log => {
        try {
          const decoded = decodeEventLog({
            abi: ZAP_V2_ABI,
            eventName: "Signed",
            data: log.data,
            topics: log.topics,
          });
          return decoded.eventName === "Signed";
        } catch {
          return false;
        }
      });

      if (signedEvent) {
        const decoded = decodeEventLog({
          abi: ZAP_V2_ABI,
          eventName: "Signed",
          data: signedEvent.data,
          topics: signedEvent.topics,
        });
        
        const tokenUsed = decoded.args.fromTokenUsed;
        const huntUsed = decoded.args.huntUsed;
        
        console.log(`\n🎉 Successfully signed on Signet!\n`);
        console.log(`  Token used: ${formatUnits(tokenUsed, tokenDecimals)} ${selectedToken.toUpperCase()}`);
        console.log(`  HUNT used: ${formatUnits(huntUsed, 18)} HUNT`);
        console.log(`  TX Hash: ${signTxHash}`);
        console.log(`  Block: ${receipt.blockNumber}`);
        console.log(`  URL: ${url}`);
        console.log(`  Guarantee: ${guaranteeHours} hours`);
      } else {
        console.log(`\n✅ Transaction successful but could not parse event details`);
        console.log(`  TX Hash: ${signTxHash}`);
        console.log(`  Block: ${receipt.blockNumber}`);
      }
    } catch (error) {
      console.log(`\n✅ Transaction successful but could not parse event: ${error.message}`);
      console.log(`  TX Hash: ${signTxHash}`);
      console.log(`  Block: ${receipt.blockNumber}`);
    }
    
  } catch (err) {
    console.error("❌", err.message);
    process.exit(1);
  }
}

async function selectBestToken(walletAddress, guaranteeHours, slippage) {
  const priorityOrder = ["hunt", "usdc", "eth", "mt"];
  
  for (const token of priorityOrder) {
    try {
      const tokenAddress = TOKEN_MAP[token];
      const balance = await getTokenBalance(token, walletAddress);
      const estimate = await estimateSignZap(tokenAddress, guaranteeHours);
      const estimatedAmount = estimate.fromTokenAmount;
      
      // Apply slippage buffer (BigInt-safe)
      const requiredAmount = applySlippage(estimatedAmount, slippage);
      
      if (balance >= requiredAmount) {
        return { token, address: tokenAddress };
      }
    } catch (error) {
      // Continue to next token if this one fails
      continue;
    }
  }
  
  throw new Error("No token found with sufficient balance for the estimated cost");
}