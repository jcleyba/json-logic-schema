import type { JSONSchema7 } from "json-schema";
import { escapeRegExp, isNaN } from "lodash-es";
import {
  isValidValue,
  type JsonLogicReservedOperations,
  type JsonLogicRulesLogic,
  type JsonLogicVar,
} from "react-querybuilder";

type AddOps = Record<JsonLogicReservedOperations, never> & {
  "!"?: (values: JsonLogicRulesLogic<AddOps>[]) => JSONSchema7;
  "!="?: typeof convertNotEqual;
  "!=="?: typeof convertStrictNotEqual;
  "&&"?: (values: JsonLogicRulesLogic<AddOps>[]) => JSONSchema7;
  "<"?: typeof convertLessThan;
  "<="?: typeof convertLessThanEqual;
  "=="?: typeof convertEquality;
  "==="?: typeof convertStrictEquality;
  ">"?: typeof convertGreaterThan;
  ">="?: typeof convertGreaterThanEqual;
  "||"?: (values: JsonLogicRulesLogic<AddOps>[]) => JSONSchema7;
  and?: (values: JsonLogicRulesLogic<AddOps>[]) => JSONSchema7;
  between?: typeof convertBetween;
  endsWith?: typeof convertEndsWith;
  equal?: typeof convertEquality;
  gte?: typeof convertGreaterThanEqual;
  in?: typeof convertIn;
  lt?: typeof convertLessThan;
  lte?: typeof convertLessThanEqual;
  not?: (values: JsonLogicRulesLogic<AddOps>[]) => JSONSchema7;
  or?: (values: JsonLogicRulesLogic<AddOps>[]) => JSONSchema7;
  startsWith?: typeof convertStartsWith;
  var?: typeof convertVar;
};

type JsonLogicValue =
  | [JsonLogicVar, ...unknown[]]
  | JsonLogicVar
  | [number, JsonLogicVar, number]
  | [undefined, JsonLogicVar, undefined];
export type JsonLogicObject = Partial<Record<keyof AddOps, JsonLogicValue>>;

const isVar = (value: JsonLogicVar): boolean => {
  return typeof value === "object" && "var" in value;
};

const getVarPath = (varObj: JsonLogicVar): string => {
  return typeof varObj.var === "string" ? varObj.var : (varObj.var?.toString() ?? "");
};

const convertStartsWith = (values: [JsonLogicVar, string]): JSONSchema7 => {
  const [str, prefix] = values;
  if (isVar(str)) {
    return {
      properties: {
        [getVarPath(str)]: {
          type: "string",
          pattern: `^${escapeRegExp(prefix)}`,
        },
      },
    };
  }
  return {
    type: "string",
    pattern: `^${escapeRegExp(prefix)}`,
  };
};

const convertEndsWith = (values: [JsonLogicVar, string]): JSONSchema7 => {
  const [str, suffix] = values;
  if (isVar(str)) {
    return {
      properties: {
        [getVarPath(str)]: {
          type: "string",
          pattern: `${escapeRegExp(suffix)}$`,
        },
      },
    };
  }
  return {
    type: "string",
    pattern: `${escapeRegExp(suffix)}$`,
  };
};

const convertVar = (path: unknown): JSONSchema7 => {
  if (typeof path === "string" && path.includes(".")) {
    return { $ref: `#/properties/${path.split(".").join("/properties/")}` };
  }
  if (typeof path === "string") {
    return { $ref: `#/properties/${path}` };
  }
  throw new Error("Invalid path");
};

const convertEquality = (values: [JsonLogicVar, JsonLogicVar]): JSONSchema7 => {
  const [left, right] = values;
  if (isVar(left)) {
    return {
      properties: {
        [getVarPath(left)]: {
          const: right,
        },
      },
    };
  }
  return { const: left === right };
};

const convertNotEqual = (values: [JsonLogicVar, JsonLogicVar]): JSONSchema7 => {
  const [left, right] = values;
  if (isVar(left)) {
    return {
      properties: {
        [getVarPath(left)]: {
          not: { const: right },
        },
      },
    };
  }
  return { not: { const: left === right } };
};

const convertStrictEquality = (values: [JsonLogicVar, JsonLogicVar]): JSONSchema7 =>
  convertEquality(values);

const convertGreaterThan = (values: [JsonLogicVar, number]): JSONSchema7 => {
  const [left, right] = values;
  if (isVar(left)) {
    return {
      properties: {
        [getVarPath(left)]: {
          type: "number",
          exclusiveMinimum: right,
        },
      },
    };
  }
  return {
    type: "number",
    exclusiveMinimum: right,
  };
};

const convertGreaterThanEqual = (
  values: [number, JsonLogicVar, number] | [JsonLogicVar, number],
): JSONSchema7 => {
  if (values.length === 3) {
    const [min, value, max] = values;
    if (isVar(value)) {
      return {
        properties: {
          [getVarPath(value)]: {
            type: "number",
            minimum: min,
            maximum: max,
          },
        },
      };
    }
    return {
      type: "number",
      minimum: min,
      maximum: max,
    };
  }

  const [left, right] = values;
  if (isVar(left)) {
    return {
      properties: {
        [getVarPath(left)]: {
          type: "number",
          minimum: right,
        },
      },
    };
  }
  return {
    type: "number",
    minimum: right,
  };
};

const convertLessThan = (values: [JsonLogicVar, number]): JSONSchema7 => {
  const [left, right] = values;
  if (isVar(left)) {
    return {
      properties: {
        [getVarPath(left)]: {
          type: "number",
          exclusiveMaximum: right,
        },
      },
    };
  }
  return {
    type: "number",
    exclusiveMaximum: right,
  };
};

const convertLessThanEqual = (
  values: [number, JsonLogicVar, number] | [JsonLogicVar, number],
): JSONSchema7 => {
  if (values.length === 3) {
    const [min, value, max] = values;
    const isDate = typeof min === "string" && !isNaN(Date.parse(min));

    if (isVar(value)) {
      return {
        properties: {
          [getVarPath(value)]: {
            type: "string",
            ...(isDate && { format: "date" }),
            minimum: min,
            maximum: max,
          },
        },
      };
    }
    return {
      type: "string",
      ...(isDate && { format: "date" }),
      minimum: min,
      maximum: max,
    };
  }

  const [left, right] = values;
  if (isVar(left)) {
    return {
      properties: {
        [getVarPath(left)]: {
          type: "number",
          maximum: right,
        },
      },
    };
  }
  return {
    type: "number",
    maximum: right,
  };
};

const convertBetween = (
  values: [number, JsonLogicVar, number] | [JsonLogicVar, number],
): JSONSchema7 => {
  if (values.length === 3) {
    const [min, value, max] = values;
    if (isVar(value)) {
      return {
        properties: {
          [getVarPath(value)]: {
            type: "number",
            minimum: min,
            maximum: max,
          },
        },
      };
    }
    return {
      type: "number",
      minimum: min,
      maximum: max,
    };
  }

  const [left, right] = values;
  if (isVar(left)) {
    return {
      properties: {
        [getVarPath(left)]: {
          type: "number",
          minimum: right,
        },
      },
    };
  }
  return {
    type: "number",
    minimum: right,
  };
};

const convertIn = (values: [JsonLogicVar, JsonLogicVar[]]): JSONSchema7 => {
  const [item, list] = values;
  if (isVar(item)) {
    return {
      properties: {
        [getVarPath(item)]: {
          enum: list,
        },
      },
    };
  }
  return {
    enum: list,
  };
};

const convertStrictNotEqual = (values: [JsonLogicVar, JsonLogicVar]): JSONSchema7 => {
  return convertNotEqual(values);
};

const convert = (jsonLogic: JsonLogicObject | null): JSONSchema7 => {
  if (!isValidValue(jsonLogic)) {
    return { const: jsonLogic };
  }

  const getOperation = (operator: keyof AddOps, values: JsonLogicValue): JSONSchema7 => {
    switch (operator) {
      case "==":
        return convertEquality(values as [JsonLogicVar, JsonLogicVar]);
      case "===":
        return convertStrictEquality(values as [JsonLogicVar, JsonLogicVar]);
      case "!=":
        return convertNotEqual(values as [JsonLogicVar, JsonLogicVar]);
      case "!==":
        return convertStrictNotEqual(values as [JsonLogicVar, JsonLogicVar]);
      case "&&":
      case "and":
        return {
          allOf: (values as Record<string, unknown>[]).map((value) => convert(value)),
        };
      case "||":
      case "or":
        return {
          anyOf: (values as Record<string, unknown>[]).map((value) => convert(value)),
        };
      case "!":
      case "not":
        return {
          not: convert((values as Record<string, unknown>[])[0]),
        };
      case "in":
        return convertIn(values as [JsonLogicVar, JsonLogicVar[]]);
      case "var":
        return convertVar(values);
      case "startsWith":
        return convertStartsWith(values as [JsonLogicVar, string]);
      case "endsWith":
        return convertEndsWith(values as [JsonLogicVar, string]);
      case "between":
        return convertBetween(values as [number, JsonLogicVar, number]);
      case "<":
      case "lt":
        return convertLessThan(values as [JsonLogicVar, number]);
      case ">":
        return convertGreaterThan(values as [JsonLogicVar, number]);
      case "<=":
      case "lte":
        return convertLessThanEqual(values as [JsonLogicVar, number]);
      case ">=":
      case "gte":
        return convertGreaterThanEqual(values as [JsonLogicVar, number]);
      case "equal":
        return convertEquality(values as [JsonLogicVar, JsonLogicVar]);
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  };

  const operator = Object.keys(jsonLogic)[0] as keyof AddOps;

  const values = jsonLogic[operator];

  if (!values) {
    throw new Error(`No values for operator: ${operator}`);
  }

  return getOperation(operator, values);
};

const wrapSchema = (schema: JSONSchema7) => ({
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  ...schema,
});

export { convert, wrapSchema };
