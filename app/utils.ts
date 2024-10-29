export function translateRulesToJSONSchema(
  rules: any,
  fieldToMakeRequired: string
) {
  // Helper function to translate individual rule
  function translateSingleRule(rule: any) {
    const { field, operator, value } = rule;

    switch (operator) {
      case "beginsWith":
        return {
          properties: {
            [field]: {
              type: "string",
              pattern: `^${value}`,
            },
          },
        };

      case "in":
        const values = value.split(",").map((val: string) => val.trim());
        return {
          properties: {
            [field]: {
              enum: values,
            },
          },
        };

      case ">":
        return {
          properties: {
            [field]: {
              type: "number",
              minimum: parseFloat(value),
              exclusiveMinimum: true,
            },
          },
        };

      case ">=":
        return {
          properties: {
            [field]: {
              type: "number",
              minimum: parseFloat(value),
            },
          },
        };

      case "<":
        return {
          properties: {
            [field]: {
              type: "number",
              maximum: parseFloat(value),
              exclusiveMaximum: true,
            },
          },
        };

      case "<=":
        return {
          properties: {
            [field]: {
              type: "number",
              maximum: parseFloat(value),
            },
          },
        };

      case "=":
      case "==":
        return {
          properties: {
            [field]: {
              const: isNaN(value) ? value : parseFloat(value),
            },
          },
        };

      case "!=":
        return {
          not: {
            properties: {
              [field]: {
                const: isNaN(value) ? value : parseFloat(value),
              },
            },
          },
        };

      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }

  // Process the rules structure
  function processRules(rulesObj: any) {
    if (!rulesObj.rules || !Array.isArray(rulesObj.rules)) {
      throw new Error("Invalid rules structure");
    }

    const translatedRules = rulesObj.rules.map(translateSingleRule);

    // Handle combinator
    let condition;
    if (rulesObj.combinator === "and") {
      condition = {
        allOf: translatedRules,
      };
    } else if (rulesObj.combinator === "or") {
      condition = {
        anyOf: translatedRules,
      };
    } else {
      throw new Error(`Unsupported combinator: ${rulesObj.combinator}`);
    }

    // Handle not operator
    if (rulesObj.not === true) {
      condition = { not: condition };
    }

    return condition;
  }

  // Create the final JSON Schema
  const schema = {
    type: "object",
    properties: {},
    if: processRules(rules),
    then: {
      required: [fieldToMakeRequired],
    },
  };

  return schema;
}
// Schema Types
interface JSONSchema {
    type: string;
    properties: Record<string, SchemaProperty>;
    allOf?: ConditionalRule[];
  }
  
  interface SchemaProperty {
    type: string;
    required?: string[];
    enum?: string[];
    pattern?: string;
    errorMessage?: string;
    const?: string;
  }
  
  interface ConditionalRule {
    if: {
      type: string;
      properties: Record<string, SchemaProperty>;
      required?: string[];
    };
    then: {
      required: string[];
    };
  }
  
  // Rule Types
  interface BaseRule {
    field: string;
    operator: string;
    value: string | boolean | number;
  }
  
  interface ConditionalGroupRule {
    type: 'conditional';
    if: {
      combinator: 'and' | 'or';
      rules: BaseRule[];
    };
    then: {
      field: string;
      required: boolean;
    };
  }
  
  interface BaseGroupRule {
    type: 'base';
    rules: BaseRule[];
  }
  
  type ProcessedRule = BaseGroupRule | ConditionalGroupRule;
  
  export function translateSchemaToRules(schema: JSONSchema): ProcessedRule[] {
    // Helper to extract required field from if/then structure
    function getRequiredField(thenClause: { required: string[] }): string | null {
      return thenClause.required?.[0] || null;
    }
  
    // Helper to translate property conditions
    function translatePropertyConditions(
      properties: Record<string, SchemaProperty>,
      required: string[] = []
    ): BaseRule[] {
      const rules: BaseRule[] = [];
      
      for (const [field, condition] of Object.entries(properties)) {
        if (condition.const !== undefined) {
          rules.push({
            field,
            operator: "=",
            value: condition.const
          });
        } else if (condition.enum) {
          rules.push({
            field,
            operator: "in",
            value: condition.enum.join(", ")
          });
        } else if (condition.pattern) {
          // Handle different pattern cases
          if (condition.pattern === '^[0-9]+$') {
            rules.push({
              field,
              operator: "matches",
              value: "numeric"
            });
          } else if (condition.pattern === '^[2-9]$') {
            rules.push({
              field,
              operator: "matches",
              value: "single-digit-2-9"
            });
          } else if (condition.pattern === '^(?:50[1-9]|5[1-9][0-9]|[6-9][0-9]{2}|[1-9][0-9]{3,})$') {
            rules.push({
              field,
              operator: ">",
              value: "500"
            });
          } else if (condition.pattern === '^[1-9][0-9]*$') {
            rules.push({
              field,
              operator: "matches",
              value: "positive-integer"
            });
          } else if (condition.pattern === '^([1-9]|[12][0-9])$') {
            rules.push({
              field,
              operator: "matches",
              value: "1-29"
            });
          } else {
            rules.push({
              field,
              operator: "matches",
              value: condition.pattern
            });
          }
        }
        
        // Add required field condition if specified
        if (required.includes(field)) {
          rules.push({
            field,
            operator: "required",
            value: true
          });
        }
      }
      
      return rules;
    }
  
    // Process a single conditional rule
    function processConditionalRule(rule: ConditionalRule): {
      conditions: BaseRule[];
      requiredField: string;
    } | null {
      const ifClause = rule.if;
      const thenClause = rule.then;
      const requiredField = getRequiredField(thenClause);
      
      if (!ifClause || !requiredField) {
        return null;
      }
  
      const conditions: BaseRule[] = [];
      
      // Process property conditions
      if (ifClause.properties) {
        conditions.push(...translatePropertyConditions(
          ifClause.properties,
          ifClause.required || []
        ));
      }
  
      if (conditions.length === 0) {
        return null;
      }
  
      return {
        conditions,
        requiredField
      };
    }
  
    // Main processing function
    function processSchema(schema: JSONSchema): ProcessedRule[] {
      const rules: ProcessedRule[] = [];
      
      // Process top-level properties
      if (schema.properties) {
        const baseRules = translatePropertyConditions(schema.properties);
        if (baseRules.length > 0) {
          rules.push({
            type: "base",
            rules: baseRules
          });
        }
      }
  
      // Process conditional rules
      if (schema.allOf) {
        for (const rule of schema.allOf) {
          const processed = processConditionalRule(rule);
          if (processed) {
            rules.push({
              type: "conditional",
              if: {
                combinator: "and",
                rules: processed.conditions
              },
              then: {
                field: processed.requiredField,
                required: true
              }
            });
          }
        }
      }
  
      return rules;
    }
  
    return processSchema(schema);
  }
  
  // Helper function to validate translated rules
  function validateTranslatedRules(rules: ProcessedRule[]): boolean {
    try {
      for (const rule of rules) {
        if (!['base', 'conditional'].includes(rule.type)) {
          return false;
        }
  
        if (rule.type === 'conditional') {
          if (!rule.if.combinator || !Array.isArray(rule.if.rules)) {
            return false;
          }
          if (!rule.then.field || typeof rule.then.required !== 'boolean') {
            return false;
          }
        }
  
        if (rule.type === 'base' && !Array.isArray(rule.rules)) {
          return false;
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // Example usage:
  const schema: JSONSchema = {
    type: "object",
    properties: {
      jobTitle: {
        type: "string",
        required: [],
        enum: [
          "sales_representative",
          "account_manager",
          "project_manager",
          "developer",
          "designer",
        ],
      },
      // ... rest of your schema
    },
    allOf: [
      // ... your conditional rules
    ]
  };
