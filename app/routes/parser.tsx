import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

import type { JSONSchema7, JSONSchema7Definition } from "json-schema";
import type { JsonLogicVar } from "react-querybuilder";

// Define precise types for JSON Logic operations
type JsonLogicComparison =
  | { "==": [JsonLogicVar, JsonLogicVar] }
  | { "===": [JsonLogicVar, JsonLogicVar] }
  | { "!=": [JsonLogicVar, JsonLogicVar] }
  | { "!==": [JsonLogicVar, JsonLogicVar] }
  | { ">=": [JsonLogicVar, JsonLogicVar] }
  | { "<=": [JsonLogicVar, JsonLogicVar] }
  | { ">": [JsonLogicVar, JsonLogicVar] }
  | { "<": [JsonLogicVar, JsonLogicVar] }
  | { between: [number, JsonLogicVar, number] | [JsonLogicVar, number] }
  | { gte: [number, JsonLogicVar, number] | [JsonLogicVar, number] }
  | { lt: [JsonLogicVar, JsonLogicVar] }
  | { lte: [JsonLogicVar, JsonLogicVar] }
  | { equal: [JsonLogicVar, JsonLogicVar] };

type JsonLogicString =
  | {
      startsWith: [JsonLogicVar, string];
    }
  | {
      endsWith: [JsonLogicVar, string];
    };

type JsonLogicArray = {
  in: [JsonLogicValue, JsonLogicValue[]];
};

type JsonLogicLogical =
  | { and: JsonLogicVar[] }
  | { "&&": JsonLogicVar[] }
  | { or: JsonLogicVar[] }
  | { "||": JsonLogicVar[] }
  | { "!": JsonLogicVar[] }
  | { not: JsonLogicVar[] };

type JsonLogicValue = JsonLogicVar | string | number | boolean;
export type JsonLogicObject =
  | JsonLogicVar
  | JsonLogicComparison
  | JsonLogicString
  | JsonLogicArray
  | JsonLogicLogical
  | Record<string, unknown>;

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
      "==": [{ var: "value" }, schema.const as JsonLogicValue],
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
      in: [{ var: "value" }, schema.enum as unknown[]],
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
      ) as JsonLogicObject;

      return replacedVars;
    });

    return conditions.length === 1 ? conditions[0] : { and: conditions };
  }

  // Handle boolean type
  if (schema.type === "boolean") {
    return { "==": [{ var: "value" }, true] }; // Default comparison, can be overridden by other rules
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

const JsonLogicConverter = () => {
  const [inputValue, setInputValue] = useState(
    '{\n  "properties": {\n    "age": {\n      "const": 18\n    }\n  }\n}'
  );
  const [outputValue, setOutputValue] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const examples = {
    simple:
      '{\n  "properties": {\n    "age": {\n      "const": 18\n    }\n  }\n}',
    complex:
      '{\n  "allOf": [\n    {\n      "properties": {\n        "age": {\n          "type": "number",\n          "minimum": 18\n        }\n      }\n    },\n    {\n      "properties": {\n        "status": {\n          "enum": ["active", "pending"]\n        }\n      }\n    }\n  ]\n}',
    between:
      '{\n  "properties": {\n    "score": {\n      "type": "number",\n      "minimum": 0,\n      "maximum": 100\n    }\n  }\n}',
    nested:
      '{\n  "or": [\n    { "and": [\n      { ">": [{ "var": "age" }, 18] },\n      { "<": [{ "var": "age" }, 65] }\n    ]},\n    { "==": [{ "var": "vipStatus" }, true] }\n  ]\n}',
    stringPattern:
      '{\n  "and": [\n    { "startsWith": [{ "var": "email" }, "admin"] },\n    { "endsWith": [{ "var": "email" }, "@company.com"] }\n  ]\n}',
    comprehensive: `{
    "allOf": [
      {
        "properties": {
          "firstName": {
            "type": "string",
            "pattern": "^[A-Z][a-z]+$",
            "default": "John"
          },
          "lastName": {
            "type": "string",
            "pattern": "^[A-Z][a-zA-Z'-]+$",
            "default": "Doe"
          },
          "age": {
            "type": "number",
            "minimum": 18,
            "maximum": 120
          },
          "isMusician": {
            "type": "boolean"
          },
          "instrument": {
            "type": "string",
            "enum": ["piano", "guitar", "drums", "violin", "bass"]
          },
          "alsoPlays": {
            "type": "array",
            "items": {
              "enum": ["piano", "guitar", "drums", "violin", "bass"]
            }
          },
          "gender": {
            "enum": ["male", "female", "non-binary", "prefer not to say"]
          },
          "height": {
            "type": "number",
            "minimum": 0,
            "maximum": 300,
            "exclusiveMinimum": 0
          },
          "job": {
            "type": "string",
            "pattern": "^[A-Za-z\\\\s]+$",
            "default": "Engineer"
          },
          "description": {
            "type": "string",
            "minLength": 10,
            "maxLength": 500
          },
          "birthdate": {
            "type": "string",
            "pattern": "^\\\\d{4}-\\\\d{2}-\\\\d{2}$",
            "default": "2000-01-01"
          },
          "datetime": {
            "type": "string",
            "pattern": "^\\\\d{4}-\\\\d{2}-\\\\d{2}T\\\\d{2}:\\\\d{2}:\\\\d{2}Z$",
            "default": "2000-01-01T00:00:00Z"
          },
          "alarm": {
            "type": "string",
            "pattern": "^\\\\d{2}:\\\\d{2}$",
            "default": "00:00"
          }
        }
      },
      {
        "anyOf": [
          {
            "properties": {
              "groupedField1": { "const": "A" },
              "groupedField2": { "const": "B" }
            }
          },
          {
            "properties": {
              "groupedField3": { "const": "C" },
              "groupedField4": { "const": "D" }
            }
          }
        ]
      }
    ]
  }`,
  };

  const handleConvert = () => {
    try {
      const schema = JSON.parse(inputValue);
      const result = convert(schema);
      setOutputValue(JSON.stringify(result, null, 2));
      setError("");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
      setSuccess(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>JSON Schema to JsonLogic Converter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block font-medium">JSON Schema Input</label>
              <textarea
                className="w-full h-64 p-2 border rounded font-mono text-sm bg-gray-50"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setSuccess(false);
                }}
              />
              <div className="flex gap-2 flex-wrap">
                {Object.entries(examples).map(([key, value]) => (
                  <button
                    key={key}
                    className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
                    onClick={() => setInputValue(value)}
                  >
                    {key} example
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block font-medium">JSON Logic Output</label>
              <textarea
                className="w-full h-64 p-2 border rounded font-mono text-sm bg-gray-50"
                value={outputValue}
                readOnly
              />
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={handleConvert}
            >
              Convert
            </button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-600">
                  Conversion successful!
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JsonLogicConverter;
