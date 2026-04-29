#!/usr/bin/env tsx

/**
 * TypeScript API Type Generator
 * Generates TypeScript types from backend Pydantic schemas
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

interface SchemaInfo {
  name: string;
  imports: string[];
  properties: Record<string, Property>;
  required: string[];
}

interface Property {
  type: string;
  optional: boolean;
  description?: string;
  constraints?: string[];
}

// Mapping from Python types to TypeScript types
const TYPE_MAPPING: Record<string, string> = {
  str: "string",
  int: "number",
  float: "number",
  bool: "boolean",
  datetime: "string", // ISO string
  "uuid.UUID": "string",
  Decimal: "string", // Use string for precision
  list: "Array",
  dict: "Record",
  Optional: "null | ",
  Union: " | ",
  Literal: " | ",
};

// Extract schema information from Python files
function extractSchemas(pythonCode: string): SchemaInfo[] {
  const schemas: SchemaInfo[] = [];
  const lines = pythonCode.split("\n");
  let currentSchema: Partial<SchemaInfo> | null = null;
  let indentLevel = 0;
  let inClass = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip comments and empty lines
    if (line.startsWith("#") || line === "") continue;

    // Detect class definition
    if (line.startsWith("class ") && "BaseModel" in line) {
      // Save previous schema if exists
      if (currentSchema && currentSchema.name) {
        schemas.push(currentSchema as SchemaInfo);
      }

      // Start new schema
      const className = line.match(/class\s+(\w+)/)?.[1];
      if (className) {
        currentSchema = {
          name: className,
          imports: [],
          properties: {},
          required: [],
        };
        inClass = true;
        indentLevel = line.match(/^\s*/)?.[0].length || 0;
      }
      continue;
    }

    // End of class
    if (inClass && line.startsWith(" ") && line.length <= indentLevel) {
      inClass = false;
      if (currentSchema && currentSchema.name) {
        schemas.push(currentSchema as SchemaInfo);
        currentSchema = null;
      }
      continue;
    }

    // Parse properties within class
    if (inClass && currentSchema) {
      const propertyMatch = line.match(/^(\s*)(\w+):\s*(.+)$/);
      if (propertyMatch) {
        const [, indent, propName, propType] = propertyMatch;
        const propertyInfo = parsePropertyType(propType);

        currentSchema.properties[propName] = {
          ...propertyInfo,
          optional: propType.includes("Optional"),
        };

        if (!propertyInfo.optional) {
          currentSchema.required!.push(propName);
        }
      }
    }
  }

  // Save last schema
  if (currentSchema && currentSchema.name) {
    schemas.push(currentSchema as SchemaInfo);
  }

  return schemas;
}

function parsePropertyType(typeString: string): Property {
  let type = typeString;
  let optional = false;
  let constraints: string[] = [];

  // Handle Optional
  if (type.includes("Optional[")) {
    optional = true;
    type = type.replace("Optional[", "").replace("]", "");
  }

  // Handle Union (multiple types)
  if (type.includes("Union[")) {
    const unionTypes = type.match(/Union\[(.+)\]/)?.[1];
    if (unionTypes) {
      const types = unionTypes.split(",").map((t) => t.trim());
      type = types.map((t) => mapPythonTypeToTS(t)).join(" | ");
    }
  }

  // Handle List/Array
  if (type.includes("list[")) {
    const itemType = type.match(/list\[(.+)\]/)?.[1];
    if (itemType) {
      type = `Array<${mapPythonTypeToTS(itemType)}>`;
    }
  }

  // Handle Dict
  if (type.includes("dict[")) {
    const dictTypes = type.match(/dict\[(.+),\s*(.+)\]/);
    if (dictTypes) {
      const [keyType, valueType] = dictTypes.slice(1);
      type = `Record<${mapPythonTypeToTS(keyType)}, ${mapPythonTypeToTS(valueType)}>`;
    }
  }

  // Handle Field constraints
  if (type.includes("Field(")) {
    const fieldMatch = type.match(/(.+?)\s*=\s*Field\((.+)\)/);
    if (fieldMatch) {
      type = fieldMatch[1];
      const constraintsStr = fieldMatch[2];

      // Extract constraints
      if (constraintsStr.includes("gt=")) {
        const gt = constraintsStr.match(/gt=(\d+)/)?.[1];
        if (gt) constraints.push(`min: ${gt}`);
      }
      if (constraintsStr.includes("lt=")) {
        const lt = constraintsStr.match(/lt=(\d+)/)?.[1];
        if (lt) constraints.push(`max: ${lt}`);
      }
      if (constraintsStr.includes("min_length=")) {
        const minLen = constraintsStr.match(/min_length=(\d+)/)?.[1];
        if (minLen) constraints.push(`minLength: ${minLen}`);
      }
      if (constraintsStr.includes("max_length=")) {
        const maxLen = constraintsStr.match(/max_length=(\d+)/)?.[1];
        if (maxLen) constraints.push(`maxLength: ${maxLen}`);
      }
    }
  }

  // Default type mapping
  if (!type.includes("Array") && !type.includes("Record") && !type.includes(" | ")) {
    type = mapPythonTypeToTS(type);
  }

  return {
    type: optional ? `null | ${type}` : type,
    optional,
    constraints,
  };
}

function mapPythonTypeToTS(pythonType: string): string {
  // Clean up the type string
  const cleanType = pythonType.trim();

  // Direct mapping
  if (TYPE_MAPPING[cleanType]) {
    return TYPE_MAPPING[cleanType];
  }

  // Handle common patterns
  if (cleanType.includes("List[")) {
    const innerType = cleanType.match(/List\[(.+)\]/)?.[1];
    return `Array<${mapPythonTypeToTS(innerType || "any")}>`;
  }

  if (cleanType.includes("Dict[")) {
    const dictTypes = cleanType.match(/Dict\[(.+),\s*(.+)\]/);
    if (dictTypes) {
      const [keyType, valueType] = dictTypes.slice(1);
      return `Record<${mapPythonTypeToTS(keyType)}, ${mapPythonTypeToTS(valueType)}>`;
    }
  }

  // Default to any for unknown types
  return "any";
}

function generateTypeScriptInterface(schema: SchemaInfo): string {
  const lines: string[] = [];

  // Add imports
  if (schema.imports.length > 0) {
    lines.push(...schema.imports);
    lines.push("");
  }

  // Add JSDoc comment
  lines.push("/**");
  lines.push(` * ${schema.name} API schema`);
  if (Object.keys(schema.properties).length > 0) {
    lines.push(" */");
  } else {
    lines.push(" * @deprecated This schema has no properties");
    lines.push(" */");
  }

  // Add interface definition
  lines.push(`export interface ${schema.name} {`);

  // Add properties
  for (const [propName, propInfo] of Object.entries(schema.properties)) {
    const optional = propInfo.optional ? "?" : "";
    const comment =
      propInfo.constraints?.length > 0 ? ` // ${propInfo.constraints.join(", ")}` : "";

    lines.push(`  ${propName}${optional}: ${propInfo.type};${comment}`);
  }

  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

function generateTypeScriptFile(schemas: SchemaInfo[]): string {
  const lines: string[] = [];

  // Add file header
  lines.push("/**");
  lines.push(" * Generated TypeScript types from backend Pydantic schemas");
  lines.push(" * @generated");
  lines.push(` * @generated-at ${new Date().toISOString()}`);
  lines.push(" */");
  lines.push("");

  // Add common imports
  lines.push("// Common types");
  lines.push("export type ChainId = string;");
  lines.push("export type Address = string;");
  lines.push("export type TransactionHash = string;");
  lines.push("export type HTLCHash = string;");
  lines.push("export type AssetSymbol = string;");
  lines.push("");

  // Add utility types
  lines.push("// Utility types");
  lines.push("export interface PaginatedResponse<T> {");
  lines.push("  data: T[];");
  lines.push("  total: number;");
  lines.push("  page: number;");
  lines.push("  limit: number;");
  lines.push("  hasNext: boolean;");
  lines.push("  hasPrev: boolean;");
  lines.push("}");
  lines.push("");

  lines.push("export interface ApiResponse<T = any> {");
  lines.push("  success: boolean;");
  lines.push("  data?: T;");
  lines.push("  error?: {");
  lines.push("    code: string;");
  lines.push("    message: string;");
  lines.push("    details?: any;");
  lines.push("  };");
  lines.push("}");
  lines.push("");

  lines.push("export interface ApiError {");
  lines.push("  code: string;");
  lines.push("  message: string;");
  lines.push("  details?: any;");
  lines.push("  timestamp: string;");
  lines.push("}");
  lines.push("");

  // Add schema interfaces
  for (const schema of schemas) {
    lines.push(generateTypeScriptInterface(schema));
  }

  // Add API client types
  lines.push("// API Client types");
  lines.push("export interface ChainBridgeApiClient {");
  lines.push("  // HTLC operations");
  lines.push("  createHTLC(data: HTLCCreate): Promise<ApiResponse<HTLCResponse>>;");
  lines.push("  claimHTLC(id: string, data: HTLCClaim): Promise<ApiResponse<HTLCResponse>>;");
  lines.push("  getHTLC(id: string): Promise<ApiResponse<HTLCStatusResponse>>;");
  lines.push(
    "  listHTLCS(params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<HTLCResponse>>>;"
  );
  lines.push("");
  lines.push("  // Order operations");
  lines.push("  createOrder(data: OrderCreate): Promise<ApiResponse<OrderResponse>>;");
  lines.push("  matchOrder(id: string, data: OrderMatch): Promise<ApiResponse<OrderResponse>>;");
  lines.push("  getOrder(id: string): Promise<ApiResponse<OrderResponse>>;");
  lines.push(
    "  listOrders(params?: { page?: number; limit?: number }): Promise<ApiResponse<PaginatedResponse<OrderResponse>>>;"
  );
  lines.push("");
  lines.push("  // Fee operations");
  lines.push(
    "  estimateFees(data: FeeEstimateRequest): Promise<ApiResponse<SwapFeeBreakdownResponse>>;"
  );
  lines.push(
    "  getExchangeRates(data: ExchangeRateRequest): Promise<ApiResponse<RateQuoteResponse>>;"
  );
  lines.push("");
  lines.push("  // Auth operations");
  lines.push("  createApiKey(data: APIKeyCreate): Promise<ApiResponse<APIKeyResponse>>;");
  lines.push("  refreshToken(token: string): Promise<ApiResponse<TokenResponse>>;");
  lines.push("}");
  lines.push("");

  return lines.join("\n");
}

async function generateTypes() {
  try {
    console.log("🔍 Extracting schemas from backend...");

    // Get backend schema files
    const backendDir = join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "backend",
      "app",
      "schemas"
    );
    const schemaFiles = [
      "htlc.py",
      "order.py",
      "swap.py",
      "auth.py",
      "fees.py",
      "asset.py",
      "chain.py",
      "dispute.py",
    ];

    const allSchemas: SchemaInfo[] = [];

    for (const file of schemaFiles) {
      const filePath = join(backendDir, file);
      if (existsSync(filePath)) {
        console.log(`  📄 Processing ${file}...`);
        const content = readFileSync(filePath, "utf-8");
        const schemas = extractSchemas(content);
        allSchemas.push(...schemas);
        console.log(`    ✅ Found ${schemas.length} schemas`);
      } else {
        console.log(`  ⚠️  File not found: ${file}`);
      }
    }

    console.log(`\n📊 Total schemas found: ${allSchemas.length}`);

    // Generate TypeScript content
    console.log("🔧 Generating TypeScript types...");
    const tsContent = generateTypeScriptFile(allSchemas);

    // Ensure output directory exists
    const outputDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "types", "api");
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Write output file
    const outputFile = join(outputDir, "generated.ts");
    writeFileSync(outputFile, tsContent);

    console.log(`✅ Types generated successfully: ${outputFile}`);
    console.log(`📝 Generated ${allSchemas.length} schema interfaces`);

    // Generate index file
    const indexContent = `// Generated API types
export * from './generated';

// Re-export commonly used types
export type { 
  HTLCCreate, 
  HTLCResponse, 
  HTLCStatusResponse,
  OrderCreate, 
  OrderResponse,
  SwapResponse,
  FeeEstimateRequest,
  SwapFeeBreakdownResponse,
  APIKeyCreate,
  APIKeyResponse,
  ApiResponse,
  PaginatedResponse,
  ChainBridgeApiClient
} from './generated';
`;

    const indexFile = join(outputDir, "index.ts");
    writeFileSync(indexFile, indexContent);
    console.log(`📄 Index file created: ${indexFile}`);

    // Run TypeScript check
    console.log("🔍 Running TypeScript check...");
    try {
      execSync("cd ../frontend && npm run type-check", { stdio: "inherit" });
      console.log("✅ TypeScript check passed");
    } catch (error) {
      console.log("⚠️  TypeScript check failed - please review generated types");
    }
  } catch (error) {
    console.error("❌ Error generating types:", error);
    process.exit(1);
  }
}

// Run the generator
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTypes();
}

export { generateTypes, extractSchemas, generateTypeScriptFile };
