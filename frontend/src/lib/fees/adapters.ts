/**
 * Chain-specific fee estimator adapters
 * Provides a common interface for fee estimation across different blockchains
 */

// Common fee estimation interface
export interface FeeEstimate {
  // Fee amounts in native units
  slowFee: number;
  averageFee: number;
  fastFee: number;

  // Fee currency/unit information
  feeUnit: string;
  feeDecimals: number;

  // Additional metadata
  blockTime: number; // in seconds
  congestionLevel: number; // 0-100 percentage

  // Timestamps
  timestamp: number;
  network: "mainnet" | "testnet";
}

export interface FeeEstimatorAdapter {
  // Core estimation methods
  getCurrentFees(): Promise<FeeEstimate>;
  estimateFeeForConfirmation(blocks: number): Promise<number>;

  // Chain metadata
  getChainInfo(): ChainInfo;

  // Health checks
  isHealthy(): Promise<boolean>;
}

export interface ChainInfo {
  name: string;
  chainId: string;
  nativeCurrency: string;
  explorerUrl: string;
  supportedNetworks: ("mainnet" | "testnet")[];
}

// Base adapter with common functionality
export abstract class BaseFeeAdapter implements FeeEstimatorAdapter {
  protected network: "mainnet" | "testnet";
  protected chainInfo: ChainInfo;

  constructor(network: "mainnet" | "testnet", chainInfo: ChainInfo) {
    this.network = network;
    this.chainInfo = chainInfo;
  }

  abstract getCurrentFees(): Promise<FeeEstimate>;
  abstract estimateFeeForConfirmation(blocks: number): Promise<number>;

  getChainInfo(): ChainInfo {
    return this.chainInfo;
  }

  async isHealthy(): Promise<boolean> {
    try {
      const fees = await this.getCurrentFees();
      return fees.timestamp > Date.now() - 60000; // Fresh data within 1 minute
    } catch {
      return false;
    }
  }

  protected createFeeEstimate(
    slowFee: number,
    averageFee: number,
    fastFee: number,
    feeUnit: string,
    feeDecimals: number,
    blockTime: number,
    congestionLevel: number
  ): FeeEstimate {
    return {
      slowFee,
      averageFee,
      fastFee,
      feeUnit,
      feeDecimals,
      blockTime,
      congestionLevel,
      timestamp: Date.now(),
      network: this.network,
    };
  }
}

// Stellar fee estimator adapter
export class StellarFeeAdapter extends BaseFeeAdapter {
  private stellarRpcUrl: string;

  constructor(network: "mainnet" | "testnet") {
    const chainInfo: ChainInfo = {
      name: "Stellar",
      chainId: network === "mainnet" ? "stellar-public" : "stellar-testnet",
      nativeCurrency: "XLM",
      explorerUrl:
        network === "mainnet"
          ? "https://stellarchain.io"
          : "https://stellar.expert/explorer/testnet",
      supportedNetworks: ["mainnet", "testnet"],
    };

    super(network, chainInfo);
    this.stellarRpcUrl =
      network === "mainnet" ? "https://horizon.stellar.org" : "https://horizon-testnet.stellar.org";
  }

  async getCurrentFees(): Promise<FeeEstimate> {
    try {
      const response = await fetch(`${this.stellarRpcUrl}/fee_stats`);
      const data = await response.json();

      // Stellar fees are in stroops (1 XLM = 10^7 stroops)
      const feeStats = data.last_ledger_fee || data.fee_charged || 100;
      const congestionLevel = this.calculateCongestion(data);

      return this.createFeeEstimate(
        Math.round(feeStats * 0.5), // Slow
        Math.round(feeStats), // Average
        Math.round(feeStats * 2), // Fast
        "stroops",
        7,
        5, // ~5 second block time
        congestionLevel
      );
    } catch (error) {
      console.error("Failed to fetch Stellar fees:", error);
      // Fallback to default fees
      return this.createFeeEstimate(100, 100, 200, "stroops", 7, 5, 25);
    }
  }

  async estimateFeeForConfirmation(blocks: number): Promise<number> {
    const fees = await this.getCurrentFees();

    // Stellar has consistent fees regardless of confirmation blocks
    // Use fast fee for priority
    return blocks <= 2 ? fees.fastFee : fees.averageFee;
  }

  private calculateCongestion(feeStats: any): number {
    // Calculate congestion based on fee distribution
    const maxFeeRate = feeStats.max_fee_rate || 1000;
    const minFeeRate = feeStats.min_fee_rate || 100;
    const modeFeeRate = feeStats.mode_fee_rate || 100;

    // Congestion based on how close mode is to max
    const congestion = ((modeFeeRate - minFeeRate) / (maxFeeRate - minFeeRate)) * 100;
    return Math.min(100, Math.max(0, congestion));
  }
}

// Bitcoin fee estimator adapter
export class BitcoinFeeAdapter extends BaseFeeAdapter {
  private mempoolApiUrl: string;

  constructor(network: "mainnet" | "testnet") {
    const chainInfo: ChainInfo = {
      name: "Bitcoin",
      chainId: network === "mainnet" ? "bitcoin-mainnet" : "bitcoin-testnet",
      nativeCurrency: "BTC",
      explorerUrl:
        network === "mainnet" ? "https://mempool.space" : "https://mempool.space/testnet",
      supportedNetworks: ["mainnet", "testnet"],
    };

    super(network, chainInfo);
    this.mempoolApiUrl =
      network === "mainnet" ? "https://mempool.space/api" : "https://mempool.space/testnet/api";
  }

  async getCurrentFees(): Promise<FeeEstimate> {
    try {
      const response = await fetch(`${this.mempoolApiUrl}/v1/fees/recommended`);
      const data = await response.json();

      // Bitcoin fees are in satoshis per virtual byte (sat/vB)
      const congestionLevel = await this.calculateCongestion();

      return this.createFeeEstimate(
        Math.round(data.hourFee || data.minimumFee || 1), // Slow (1 hour)
        Math.round(data.halfHourFee || data.hourFee || 2), // Average (30 min)
        Math.round(data.fastestFee || data.halfHourFee || 3), // Fast (10 min)
        "sat/vB",
        0,
        600, // ~10 minute block time
        congestionLevel
      );
    } catch (error) {
      console.error("Failed to fetch Bitcoin fees:", error);
      // Fallback to default fees
      return this.createFeeEstimate(1, 2, 3, "sat/vB", 0, 600, 50);
    }
  }

  async estimateFeeForConfirmation(blocks: number): Promise<number> {
    try {
      const response = await fetch(`${this.mempoolApiUrl}/v1/fees/mempool-blocks`);
      const data = await response.json();

      if (data.length >= blocks) {
        return Math.round(data[blocks - 1].medianFee || data[blocks - 1].feeRange[0]);
      }

      // Fallback to recommended fees
      const fees = await this.getCurrentFees();
      if (blocks <= 1) return fees.fastFee;
      if (blocks <= 3) return fees.averageFee;
      return fees.slowFee;
    } catch {
      const fees = await this.getCurrentFees();
      return fees.averageFee;
    }
  }

  private async calculateCongestion(): Promise<number> {
    try {
      const response = await fetch(`${this.mempoolApiUrl}/v1/mempool`);
      const data = await response.json();

      // Calculate congestion based on mempool size
      const vsize = data.vsize || 0;
      const maxVsize = 150000000; // 150 MB max mempool

      const congestion = (vsize / maxVsize) * 100;
      return Math.min(100, Math.max(0, congestion));
    } catch {
      return 50; // Default congestion
    }
  }
}

// Ethereum fee estimator adapter
export class EthereumFeeAdapter extends BaseFeeAdapter {
  private etherscanApiUrl: string;
  private apiKey: string;

  constructor(network: "mainnet" | "testnet", apiKey?: string) {
    const chainInfo: ChainInfo = {
      name: "Ethereum",
      chainId: network === "mainnet" ? "ethereum-mainnet" : "ethereum-sepolia",
      nativeCurrency: "ETH",
      explorerUrl: network === "mainnet" ? "https://etherscan.io" : "https://sepolia.etherscan.io",
      supportedNetworks: ["mainnet", "testnet"],
    };

    super(network, chainInfo);
    this.etherscanApiUrl =
      network === "mainnet"
        ? "https://api.etherscan.io/api"
        : "https://api-sepolia.etherscan.io/api";
    this.apiKey =
      apiKey ||
      (typeof window !== "undefined" && (window as any).__CHAINBRIDGE_CONFIG__?.etherscanApiKey) ||
      "";
  }

  async getCurrentFees(): Promise<FeeEstimate> {
    try {
      // Try EIP-1559 fees first (for London fork and later)
      const eip1559Fees = await this.getEIP1559Fees();
      if (eip1559Fees) {
        return eip1559Fees;
      }

      // Fallback to legacy gas price
      const response = await fetch(
        `${this.etherscanApiUrl}?module=proxy&action=eth_gasPrice&apikey=${this.apiKey}`
      );
      const data = await response.json();

      if (data.status === "1") {
        const gasPrice = parseInt(data.result, 16); // Hex to decimal
        const congestionLevel = await this.calculateCongestion();

        return this.createFeeEstimate(
          Math.round(gasPrice * 0.8), // Slow
          Math.round(gasPrice), // Average
          Math.round(gasPrice * 1.2), // Fast
          "gwei",
          9,
          12, // ~12 second block time
          congestionLevel
        );
      }
    } catch (error) {
      console.error("Failed to fetch Ethereum fees:", error);
    }

    // Fallback to default fees
    return this.createFeeEstimate(15, 20, 25, "gwei", 9, 12, 50);
  }

  async estimateFeeForConfirmation(blocks: number): Promise<number> {
    try {
      const response = await fetch(
        `${this.etherscanApiUrl}?module=gastracker&action=gasestimate&apikey=${this.apiKey}`
      );
      const data = await response.json();

      if (data.status === "1" && data.result) {
        return Math.round(parseFloat(data.result));
      }
    } catch {
      // Fallback
    }

    const fees = await this.getCurrentFees();
    if (blocks <= 1) return fees.fastFee;
    if (blocks <= 3) return fees.averageFee;
    return fees.slowFee;
  }

  private async getEIP1559Fees(): Promise<FeeEstimate | null> {
    try {
      // Use gas tracker API for EIP-1559 fees
      const response = await fetch(
        `${this.etherscanApiUrl}?module=gastracker&action=gasoracle&apikey=${this.apiKey}`
      );
      const data = await response.json();

      if (data.status === "1" && data.result) {
        const oracle = data.result;
        const congestionLevel = await this.calculateCongestion();

        return this.createFeeEstimate(
          Math.round(parseFloat(oracle.SafeGasPrice)), // Slow
          Math.round(parseFloat(oracle.ProposeGasPrice)), // Average
          Math.round(parseFloat(oracle.FastGasPrice)), // Fast
          "gwei",
          9,
          12,
          congestionLevel
        );
      }
    } catch {
      // Fallback to legacy
    }

    return null;
  }

  private async calculateCongestion(): Promise<number> {
    try {
      const response = await fetch(
        `${this.etherscanApiUrl}?module=gastracker&action=gasoracle&apikey=${this.apiKey}`
      );
      const data = await response.json();

      if (data.status === "1" && data.result) {
        const oracle = data.result;
        const gasUsedRatio = parseFloat(oracle.gasUsedRatio || "0.5");
        return gasUsedRatio * 100;
      }
    } catch {
      // Fallback
    }

    return 50; // Default congestion
  }
}

// Factory for creating fee adapters
export class FeeAdapterFactory {
  private static adapters = new Map<string, FeeEstimatorAdapter>();

  static getAdapter(chain: string, network: "mainnet" | "testnet"): FeeEstimatorAdapter {
    const key = `${chain}-${network}`;

    if (!this.adapters.has(key)) {
      const adapter = this.createAdapter(chain, network);
      this.adapters.set(key, adapter);
    }

    return this.adapters.get(key)!;
  }

  private static createAdapter(chain: string, network: "mainnet" | "testnet"): FeeEstimatorAdapter {
    switch (chain.toLowerCase()) {
      case "stellar":
        return new StellarFeeAdapter(network);
      case "bitcoin":
        return new BitcoinFeeAdapter(network);
      case "ethereum":
        return new EthereumFeeAdapter(network);
      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }
  }

  static getSupportedChains(): string[] {
    return ["stellar", "bitcoin", "ethereum"];
  }

  static clearCache(): void {
    this.adapters.clear();
  }
}

// Utility functions for fee handling
export class FeeUtils {
  static convertFee(amount: number, fromUnit: string, toUnit: string, decimals: number): number {
    if (fromUnit === toUnit) return amount;

    // Convert from base unit to standard unit
    if (fromUnit.includes("sat") || fromUnit.includes("stroops") || fromUnit === "gwei") {
      return amount / Math.pow(10, decimals);
    }

    // Convert from standard unit to base unit
    return amount * Math.pow(10, decimals);
  }

  static estimateTransactionCost(
    feeEstimate: FeeEstimate,
    gasUnits?: number,
    transactionSize?: number
  ): {
    slowCost: number;
    averageCost: number;
    fastCost: number;
    currency: string;
  } {
    const { slowFee, averageFee, fastFee, feeUnit, feeDecimals } = feeEstimate;

    let slowCost = slowFee;
    let averageCost = averageFee;
    let fastCost = fastFee;

    // Ethereum: multiply by gas units
    if (feeUnit === "gwei" && gasUnits) {
      slowCost = slowFee * gasUnits;
      averageCost = averageFee * gasUnits;
      fastCost = fastFee * gasUnits;
    }

    // Bitcoin: multiply by transaction size
    if (feeUnit === "sat/vB" && transactionSize) {
      slowCost = slowFee * transactionSize;
      averageCost = averageFee * transactionSize;
      fastCost = fastFee * transactionSize;
    }

    // Convert to standard units
    const standardSlowCost = this.convertFee(slowCost, feeUnit, "standard", feeDecimals);
    const standardAverageCost = this.convertFee(averageCost, feeUnit, "standard", feeDecimals);
    const standardFastCost = this.convertFee(fastCost, feeUnit, "standard", feeDecimals);

    return {
      slowCost: standardSlowCost,
      averageCost: standardAverageCost,
      fastCost: standardFastCost,
      currency:
        feeEstimate.feeUnit === "gwei" ? "ETH" : feeEstimate.feeUnit === "sat/vB" ? "BTC" : "XLM",
    };
  }

  static getFeeRecommendation(
    feeEstimate: FeeEstimate,
    urgency: "low" | "medium" | "high"
  ): {
    fee: number;
    estimatedTime: number;
    confidence: number;
  } {
    const { slowFee, averageFee, fastFee, blockTime, congestionLevel } = feeEstimate;

    switch (urgency) {
      case "low":
        return {
          fee: slowFee,
          estimatedTime: blockTime * 3, // 3 blocks
          confidence: congestionLevel < 70 ? 0.9 : 0.7,
        };
      case "medium":
        return {
          fee: averageFee,
          estimatedTime: blockTime * 2, // 2 blocks
          confidence: 0.8,
        };
      case "high":
        return {
          fee: fastFee,
          estimatedTime: blockTime, // 1 block
          confidence: 0.95,
        };
    }
  }
}
