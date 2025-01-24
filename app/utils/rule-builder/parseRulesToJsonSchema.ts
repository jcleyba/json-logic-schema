
import { isArray } from "util";
import type { JSONSchema7, PropertySchema, QueryStructure, RuleOperatorName } from "./types";

export const buildFieldJsonSchema = (
  parentFieldName: string,
  query: QueryStructure,
): PropertySchema => {
  const fieldRules = query.rules.map((rule) => {
    switch (rule.operator) {
      case "==":
      case "===":
      case "equal":
        return {
          properties: { [rule.field]: { const: rule.value } },
          required: [rule.field],
        };
      case "!=":
      case "!==":
        return {
          properties: { [rule.field]: { not: { const: rule.value } } },
          required: [rule.field],
        };
      case "beginsWith":
      case "startsWith":
        return {
          properties: { [rule.field]: { type: "string", pattern: `^${rule.value?.toString()}.*` } },
          required: [rule.field],
        };
      case "endsWith":
        return {
          properties: { [rule.field]: { type: "string", pattern: `.*${rule.value?.toString()}$` } },
          required: [rule.field],
        };
      case ">":
      case "gt":
        return {
          properties: { [rule.field]: { type: "number", exclusiveMinimum: rule.value } },
          required: [rule.field],
        };
      case ">=":
      case "gte":
        return {
          properties: { [rule.field]: { type: "number", minimum: rule.value } },
          required: [rule.field],
        };
      case "<":
      case "lt":
        return {
          properties: { [rule.field]: { type: "number", exclusiveMaximum: rule.value } },
          required: [rule.field],
        };
      case "<=":
      case "lte":
        return {
          properties: { [rule.field]: { type: "number", maximum: rule.value } },
          required: [rule.field],
        };
      case "between":
        if (Array.isArray(rule.value) && rule.value.length === 2) {
          return {
            properties: {
              [rule.field]: { type: "number", minimum: rule.value[0], maximum: rule.value[1] },
            },
            required: [rule.field],
          };
        }
        break;
      case "in":
        return {
          properties: {
            [rule.field]: { enum: Array.isArray(rule.value) ? rule.value : [rule.value] },
          },
          required: [rule.field],
        };
      case "notIn":
        return {
          properties: {
            [rule.field]: { not: { enum: Array.isArray(rule.value) ? rule.value : [rule.value] } },
          },
          required: [rule.field],
        };
      default:
        console.warn(`Unsupported operator: ${rule.operator as RuleOperatorName}`);
    }
    return {};
  });

  const combinator = query.combinator === "and" ? "allOf" : "anyOf";

  return {
    if: {
      [combinator]: fieldRules,
      [combinator === "allOf" ? "anyOf" : "allOf"]: [],
    } as PropertySchema["if"],
    // eslint-disable-next-line unicorn/no-thenable
    then: { required: [parentFieldName] },
  };
};

export const buildFormJsonSchema = (fieldRules: PropertySchema[]): JSONSchema7 => {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    allOf: fieldRules,
  };
};
