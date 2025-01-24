import type { JSONSchema7, JSONSchema7Type } from "json-schema";
import type { RuleType } from "react-querybuilder";

type RuleFieldName = string;

export type RuleOperatorName =
  | "=="
  | "!=="
  | "==="
  | "equal"
  | "!="
  | "startsWith"
  | "endsWith"
  | ">"
  | ">="
  | "<"
  | "<="
  | "between"
  | "in"
  | "notIn"
  | "gte"
  | "gt"
  | "lte"
  | "lt"
  | "beginsWith"

export type QueryStructure = {
  combinator: "and" | "or";
  rules: RuleType<RuleFieldName, RuleOperatorName, JSONSchema7Type | undefined>[];
};

export type PropertySchema = {
  if:
    | {
        [key in "allOf" | "anyOf"]: key extends "allOf"
          ? { properties: Record<string, JSONSchema7>; required: string[] }[]
          : never;
      }
    | {
        [key in "allOf" | "anyOf"]: key extends "anyOf"
          ? { properties: Record<string, JSONSchema7>; required: string[] }[]
          : never;
      };
  then: { required: string[] };
};

export { type JSONSchema7, type JSONSchema7Type } from "json-schema";

