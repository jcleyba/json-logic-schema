import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

class JsonLogicToSchema {
  operators: Record<string, (values: any[]) => any>;
  constructor() {
    this.operators = {
      // Equality
      "==": this.convertEquality.bind(this),
      "===": this.convertStrictEquality.bind(this),
      equal: this.convertEquality.bind(this),

      // Comparison
      ">": this.convertGreaterThan.bind(this),
      ">=": this.convertGreaterThanEqual.bind(this),
      "<": this.convertLessThan.bind(this),
      "<=": this.convertLessThanEqual.bind(this),
      gt: this.convertGreaterThan.bind(this),
      gte: this.convertGreaterThanEqual.bind(this),
      lt: this.convertLessThan.bind(this),
      lte: this.convertLessThanEqual.bind(this),

      // Logical
      "&&": this.convertAnd.bind(this),
      and: this.convertAnd.bind(this),
      "||": this.convertOr.bind(this),
      or: this.convertOr.bind(this),
      "!": this.convertNot.bind(this),
      not: this.convertNot.bind(this),

      // Membership
      in: this.convertIn.bind(this),
      var: this.convertVar.bind(this),

      // Additional operators
      "!=": this.convertNotEqual.bind(this),
      "!==": this.convertNotEqual.bind(this),
      between: this.convertBetween.bind(this),

      // String pattern matching
      startsWith: this.convertStartsWith.bind(this),
      endsWith: this.convertEndsWith.bind(this),
    };
  }

  convert(jsonLogic: any) {
    if (typeof jsonLogic !== "object" || jsonLogic === null) {
      return { const: jsonLogic };
    }

    const operator = Object.keys(jsonLogic)[0];
    const values = jsonLogic[operator];

    if (!this.operators[operator]) {
      throw new Error(
        `Unsupported operator: ${operator}. Supported operators are: ${Object.keys(
          this.operators
        ).join(", ")}`
      );
    }

    return this.operators[operator](values);
  }

  convertStartsWith(values: any[]) {
    const [str, prefix] = values;
    if (this.isVar(str)) {
      return {
        properties: {
          [this.getVarPath(str)]: {
            type: "string",
            pattern: `^${this.escapeRegExp(prefix)}`,
          },
        },
      };
    }
    return {
      type: "string",
      pattern: `^${this.escapeRegExp(prefix)}`,
    };
  }

  convertEndsWith(values: any[]) {
    const [str, suffix] = values;
    if (this.isVar(str)) {
      return {
        properties: {
          [this.getVarPath(str)]: {
            type: "string",
            pattern: `${this.escapeRegExp(suffix)}$`,
          },
        },
      };
    }
    return {
      type: "string",
      pattern: `${this.escapeRegExp(suffix)}$`,
    };
  }

  // Helper method to escape special regex characters
  escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  convertVar(path: string) {
    if (typeof path === "string" && path.includes(".")) {
      return { $ref: "#/properties/" + path.split(".").join("/properties/") };
    }
    return { $ref: "#/properties/" + path };
  }

  convertEquality(values: any[]) {
    const [left, right] = values;
    if (this.isVar(left)) {
      return {
        properties: {
          [this.getVarPath(left)]: {
            const: right,
          },
        },
      };
    }
    return { const: left === right };
  }

  convertNotEqual(values: any[]) {
    const [left, right] = values;
    if (this.isVar(left)) {
      return {
        properties: {
          [this.getVarPath(left)]: {
            not: { const: right },
          },
        },
      };
    }
    return { not: { const: left === right } };
  }

  convertStrictEquality(values: any[]) {
    return this.convertEquality(values);
  }

  convertGreaterThan(values: any[]) {
    const [left, right] = values;
    if (this.isVar(left)) {
      return {
        properties: {
          [this.getVarPath(left)]: {
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
  }

  convertGreaterThanEqual(values: any[]) {
    // Check if it's a between operation (3 values)
    if (values.length === 3) {
      const [min, value, max] = values;
      if (this.isVar(value)) {
        return {
          properties: {
            [this.getVarPath(value)]: {
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

    // Standard >= comparison
    const [left, right] = values;
    if (this.isVar(left)) {
      return {
        properties: {
          [this.getVarPath(left)]: {
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
  }

  convertLessThan(values: any[]) {
    const [left, right] = values;
    if (this.isVar(left)) {
      return {
        properties: {
          [this.getVarPath(left)]: {
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
  }

  convertLessThanEqual(values: any[]) {
    // Check if it's a between operation (3 values)
    if (values.length === 3) {
      const [min, value, max] = values;
      // Check if we're dealing with dates (assuming ISO date strings)
      const isDate = typeof min === 'string' && !isNaN(Date.parse(min));
      
      if (this.isVar(value)) {
        return {
          properties: {
            [this.getVarPath(value)]: {
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

    // Standard <= comparison
    const [left, right] = values;
    if (this.isVar(left)) {
      return {
        properties: {
          [this.getVarPath(left)]: {
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
  }

  convertBetween(values: any[]) {
    const [min, value, max] = values;
    if (this.isVar(value)) {
      return {
        properties: {
          [this.getVarPath(value)]: {
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

  convertAnd(values: any[]) {
    return {
      allOf: values.map((value) => this.convert(value)),
    };
  }

  convertOr(values: any[]) {
    return {
      anyOf: values.map((value) => this.convert(value)),
    };
  }

  convertNot(value: any) {
    return {
      not: this.convert(Array.isArray(value) ? value[0] : value),
    };
  }

  convertIn(values: any[]) {
    const [item, list] = values;
    if (this.isVar(item)) {
      return {
        properties: {
          [this.getVarPath(item)]: {
            enum: list,
          },
        },
      };
    }
    return {
      enum: list,
    };
  }

  isVar(value: any) {
    return typeof value === "object" && value !== null && "var" in value;
  }

  getVarPath(varObj: any) {
    return typeof varObj.var === "string" ? varObj.var : varObj.var.toString();
  }

  wrapSchema(schema: any) {
    return {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      ...schema,
    };
  }
}

const JsonLogicConverter = () => {
  const [inputValue, setInputValue] = useState(
    '{\n  "and": [\n    { ">=": [{ "var": "age" }, 18] },\n    { "in": [{ "var": "status" }, ["active", "pending"]] }\n  ]\n}'
  );
  const [outputValue, setOutputValue] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const examples = {
    simple: '{\n  "==": [{ "var": "age" }, 18]\n}',
    complex:
      '{\n  "and": [\n    { ">=": [{ "var": "age" }, 18] },\n    { "in": [{ "var": "status" }, ["active", "pending"]] }\n  ]\n}',
    between: '{\n  "and": [\n    { ">=": [{ "var": "score" }, 0] },\n    { "<=": [{ "var": "score" }, 100] }\n  ]\n}',
    nested:
      '{\n  "or": [\n    { "and": [\n      { ">": [{ "var": "age" }, 18] },\n      { "<": [{ "var": "age" }, 65] }\n    ]},\n    { "==": [{ "var": "vipStatus" }, true] }\n  ]\n}',
    stringPattern:
      '{\n  "and": [\n    { "startsWith": [{ "var": "email" }, "admin"] },\n    { "endsWith": [{ "var": "email" }, "@company.com"] }\n  ]\n}',
  };

  const handleConvert = () => {
    try {
      const jsonLogic = JSON.parse(inputValue);
      const converter = new JsonLogicToSchema();
      const result = converter.wrapSchema(converter.convert(jsonLogic));
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
          <CardTitle>JsonLogic to JSON Schema Converter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block font-medium">JsonLogic Input</label>
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
              <label className="block font-medium">JSON Schema Output</label>
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
