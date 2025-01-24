
import type {
  JSONSchema7,
  JSONSchema7Type,
  PropertySchema,
  QueryStructure,
  RuleOperatorName,
} from "./types";

const determineOperator = (property: JSONSchema7): RuleOperatorName => {
  if (
    ("minimum" in property && "maximum" in property) ||
    ("exclusiveMinimum" in property && "exclusiveMaximum" in property)
  ) {
    return "between";
  }

  if ("minimum" in property) {
    return ">=";
  }

  if ("exclusiveMaximum" in property) {
    return "<";
  }

  if ("maximum" in property) {
    return "<=";
  }

  if ("pattern" in property && property.pattern?.startsWith("^")) {
    return "startsWith";
  }

  if ("pattern" in property && property.pattern?.endsWith("$")) {
    return "endsWith";
  }

  if ("enum" in property) {
    return "in";
  }

  if ("not" in property) {
    return typeof property.not === "object" ? "notIn" : "!=";
  }

  if ("const" in property) {
    return "==";
  }

  return "==";
};

const mapToValue = (property: JSONSchema7): JSONSchema7Type | undefined => {
  if ("minimum" in property) {
    return property.minimum;
  }

  if ("exclusiveMaximum" in property) {
    return property.exclusiveMaximum;
  }

  if ("maximum" in property) {
    return property.maximum;
  }

  if ("exclusiveMinimum" in property && property.exclusiveMinimum) {
    return property.exclusiveMinimum;
  }

  if ("pattern" in property && property.pattern) {
    if (property.pattern.startsWith("^")) {
      return property.pattern.slice(1, -2);
    }
    if (property.pattern.endsWith("$")) {
      return property.pattern.slice(2, -1);
    }
  }

  if ("enum" in property && Array.isArray(property.enum)) {
    return property.enum;
  }

  if ("not" in property && typeof property.not === "object" && "enum" in property.not) {
    return property.not.enum;
  }

  if ("not" in property && typeof property.not === "object" && "const" in property.not) {
    return property.not.const;
  }

  if ("const" in property) {
    return property.const;
  }

  return undefined;
};

export const transformJsonSchemaToRules = (schema: PropertySchema): QueryStructure => {
  if (!schema.if?.allOf?.length && !schema.if?.anyOf?.length) {
    return {
      combinator: "and",
      rules: [],
    };
  }

  const combinator = schema.if?.allOf?.length ? "and" : "or";
  const ruleList = schema.if?.allOf?.length ? schema.if.allOf : schema.if.anyOf;

  const rules = ruleList.map((rule) => {
    const field = Object.keys(rule.properties)[0];

    return {
      field,
      operator: determineOperator(rule.properties[field]),
      value: mapToValue(rule.properties[field]),
    };
  });

  const queryFields: QueryStructure = {
    combinator,
    rules,
  };

  return queryFields;
};
