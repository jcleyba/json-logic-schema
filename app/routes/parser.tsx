import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

class SchemaToJsonLogic {
  convert(schema: any): any {
    if (!schema || typeof schema !== "object") {
      return schema;
    }

    // Handle $ref
    if (schema.$ref) {
      return {
        var: schema.$ref
          .replace("#/properties/", "")
          .replace(/\/properties\//g, "."),
      };
    }

    // Handle const
    if ("const" in schema) {
      return { "==": [{ var: "value" }, schema.const] };
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
      return { in: [{ var: "value" }, schema.enum] };
    }

    // Handle pattern
    if (schema.pattern) {
      const defaultValue = schema.default || "";
      if (schema.pattern.startsWith("^")) {
        return { startsWith: [{ var: "value" }, defaultValue] };
      }
      if (schema.pattern.endsWith("$")) {
        return { endsWith: [{ var: "value" }, defaultValue] };
      }
      return { match: [{ var: "value" }, defaultValue] };
    }

    // Handle logical operators
    if (schema.allOf) {
      return { and: schema.allOf.map((sch: any) => this.convert(sch)) };
    }
    if (schema.anyOf) {
      return { or: schema.anyOf.map((sch: any) => this.convert(sch)) };
    }
    if (schema.not) {
      return { "!": this.convert(schema.not) };
    }

    // Handle properties
    if (schema.properties) {
      const conditions = Object.entries(schema.properties).map(
        ([key, value]: [string, any]) => {
          const converted = this.convert(value);
          // Replace all {var: "value"} with {var: key}
          const replacedVars = JSON.parse(
            JSON.stringify(converted).replace(
              /"var"\s*:\s*"value"/g,
              `"var": "${key}"`
            )
          );
          return replacedVars;
        }
      );
      return conditions.length === 1 ? conditions[0] : { and: conditions };
    }

    // Handle boolean type
    if (schema.type === "boolean") {
      return { "==": [{ var: "value" }, true] }; // Default comparison, can be overridden by other rules
    }

    // Handle array type
    if (schema.type === "array" && schema.items) {
      if (schema.items.enum) {
        // For arrays with enum items, check if all items are in the enum
        return {
          all: [
            { var: "value" },
            { in: [{ var: "" }, schema.items.enum] }
          ]
        };
      }
      // Add more array type handling as needed
      return this.convert(schema.items);
    }

    return schema;
  }
}

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
      const converter = new SchemaToJsonLogic();
      const result = converter.convert(schema);
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
