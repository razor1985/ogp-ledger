// src/consensus/schemaValidator.js
export function validateSchema(tx) {
    // Basic field validation for local testing
    const required = ["from", "to", "amount"];
    for (const field of required) {
      if (!(field in tx)) {
        console.error(`❌ Missing field: ${field}`);
        return false;
      }
    }
  
    if (typeof tx.amount !== "number" || tx.amount <= 0) {
      console.error("❌ Invalid amount");
      return false;
    }
  
    console.log("✅ Schema validated successfully");
    return true;
  }
  