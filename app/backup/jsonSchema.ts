import type { JSONSchema7, JSONSchema7Definition } from "json-schema";

import type { JsonLogicObject } from "./jsonLogic";

// Type guard functions
const isJSONSchema7 = (schema: JSONSchema7Definition): schema is JSONSchema7 =>
  typeof schema === "object";

// Main converter function with type safety
export const convert = (schema: JSONSchema7): JsonLogicObject => {
  if (!isJSONSchema7(schema)) {
    return {};
  }

  // Handle $ref
  if (schema.$ref) {
    return {
      var: schema.$ref
        .replace("#/properties/", "")
        .replaceAll("/properties/", "."),
    };
  }

  // Handle const with type safety
  if ("const" in schema) {
    return {
      "==": [{ var: "value" }, schema.const],
    };
  }

  // Handle type + range restrictions for both numbers and dates
  if (
    (schema.type === "number" || schema.type === "string") &&
    ("minimum" in schema ||
      "maximum" in schema ||
      "exclusiveMinimum" in schema ||
      "exclusiveMaximum" in schema)
  ) {
    if ("minimum" in schema && "maximum" in schema) {
      return { "<=": [schema.minimum, { var: "value" }, schema.maximum] };
    }
    if ("minimum" in schema) {
      return { ">=": [{ var: "value" }, schema.minimum] };
    }
    if ("maximum" in schema) {
      return { "<=": [{ var: "value" }, schema.maximum] };
    }
    if ("exclusiveMinimum" in schema) {
      return { ">": [{ var: "value" }, schema.exclusiveMinimum] };
    }
    if ("exclusiveMaximum" in schema) {
      return { "<": [{ var: "value" }, schema.exclusiveMaximum] };
    }
  }

  // Handle enum
  if (schema.enum) {
    return {
      in: [{ var: "value" }, schema.enum],
    };
  }

  // Handle pattern
  if (schema.pattern) {
    if (schema.pattern.startsWith("^")) {
      return {
        startsWith: [{ var: "value" }, schema.pattern],
      };
    }
    if (schema.pattern.endsWith("$")) {
      return {
        endsWith: [{ var: "value" }, schema.pattern],
      };
    }
  }

  // Handle logical operators
  if (schema.allOf) {
    return {
      and: schema.allOf
        .filter((sch) => isJSONSchema7(sch))
        .map((sch) => convert(sch)),
    };
  }
  if (schema.anyOf) {
    return {
      or: schema.anyOf
        .filter((sch) => isJSONSchema7(sch))
        .map((sch) => convert(sch)),
    };
  }
  if (schema.not && isJSONSchema7(schema.not)) {
    return { "!": convert(schema.not) };
  }

  // Handle properties with type safety
  if (schema.properties) {
    const conditions = Object.entries(schema.properties).map(([key, value]) => {
      if (!isJSONSchema7(value)) return {};

      const converted = convert(value);
      const replacedVars = JSON.parse(
        JSON.stringify(converted).replaceAll(
          /"var"\s*:\s*"value"/g,
          `"var": "${key}"`
        )
      ) as Record<string, unknown>;

      return replacedVars;
    });

    return conditions.length === 1 ? conditions[0] : { and: conditions };
  }

  // Handle boolean type
  if (schema.type === "boolean") {
    return { "==": [{ var: "value" }, true] };
  }

  // Handle array type
  if (
    schema.type === "array" &&
    schema.items &&
    !Array.isArray(schema.items) &&
    isJSONSchema7(schema.items)
  ) {
    if (schema.items.enum) {
      return {
        all: [{ var: "value" }, { in: [{ var: "" }, schema.items.enum] }],
      };
    }
    return convert(schema.items);
  }

  return {};
};
