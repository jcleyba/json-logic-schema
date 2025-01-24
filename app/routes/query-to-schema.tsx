import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildFieldJsonSchema,
  transformJsonSchemaToRules,
} from "@/utils/rule-builder";
import { PropertySchema } from "@/utils/rule-builder/types";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { useState } from "react";
import QueryBuilder, { RuleGroupType } from "react-querybuilder";

const QueryToSchemaConverter = () => {
  const [inputValue, setInputValue] = useState("");
  const [outputValue, setOutputValue] = useState<RuleGroupType>();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const examples = {
    "Musician Profile": JSON.stringify(
      {
        if: {
          allOf: [
            {
              properties: { isMusician: { type: "boolean", enum: [true] } },
              required: ["isMusician"],
            },
          ],
        },
        then: {
          required: ["instrument", "alsoPlays"],
          properties: {
            instrument: { type: "string" },
            alsoPlays: { type: "array", items: { type: "string" } },
          },
        },
      },
      null,
      2
    ),

    "Personal Details": JSON.stringify(
      {
        if: {
          allOf: [
            {
              properties: {
                age: { type: "number", minimum: 18 },
                gender: { type: "string", enum: ["male", "female", "other"] },
              },
              required: ["age", "gender"],
            },
          ],
        },
        then: {
          required: ["firstName", "lastName", "description"],
          properties: {
            height: { type: "number" },
            description: { type: "string", minLength: 10 },
          },
        },
      },
      null,
      2
    ),

    "Job Application": JSON.stringify(
      {
        if: {
          anyOf: [
            {
              properties: {
                job: { type: "string", enum: ["developer", "designer"] },
              },
              required: ["job"],
            },
          ],
        },
        then: {
          required: ["birthdate", "description"],
          properties: {
            birthdate: { type: "string", format: "date" },
            description: { type: "string", maxLength: 500 },
          },
        },
      },
      null,
      2
    ),

    "Time Settings": JSON.stringify(
      {
        if: {
          allOf: [
            {
              properties: {
                datetime: { type: "string", format: "date-time" },
              },
              required: ["datetime"],
            },
          ],
        },
        then: {
          required: ["alarm"],
          properties: {
            alarm: { type: "string", format: "time" },
          },
        },
      },
      null,
      2
    ),

    "Grouped Fields": JSON.stringify(
      {
        if: {
          anyOf: [
            {
              properties: {
                groupedField1: { type: "string" },
                groupedField2: { type: "string" },
              },
              required: ["groupedField1"],
            },
          ],
        },
        then: {
          required: ["groupedField3", "groupedField4"],
          properties: {
            groupedField3: { type: "string" },
            groupedField4: { type: "string" },
          },
        },
      },
      null,
      2
    ),
  };

  const handleConvert = () => {
    try {
      const schema = JSON.parse(inputValue);
      const result = transformJsonSchemaToRules(schema);

      setOutputValue(result);
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
          <CardTitle>QB Rules JSON to JSON Schema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block font-medium">QB Rules JSON Input</label>
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
              <QueryBuilder query={outputValue} fields={[
                {
                  name: 'firstName',
                  label: 'First Name',
                },
                {
                  name: 'lastName',
                  label: 'Last Name',
                },
                {
                  name: 'age',
                  label: 'Age',
                },
                {
                  name: 'isMusician',
                  label: 'Is Musician',
                },
                {
                  name: 'instrument',
                  label: 'Instrument',
                },
                {
                  name: 'alsoPlays',
                  label: 'Also Plays',
                },
                {
                  name: 'gender',
                  label: 'Gender',
                },
                {
                  name: 'height',
                  label: 'Height',
                },
                {
                  name: 'job',
                  label: 'Job',
                },
                {
                  name: 'description',
                  label: 'Description',
                },
                {
                  name: 'birthdate',
                  label: 'Birth Date',
                },
                {
                  name: 'datetime',
                  label: 'Date Time',
                },
                {
                  name: 'alarm',
                  label: 'Alarm',
                },
                {
                  name: 'groupedField1',
                  label: 'Grouped Field 1',
                },
                {
                  name: 'groupedField2',
                  label: 'Grouped Field 2',
                },
                {
                  name: 'groupedField3',
                  label: 'Grouped Field 3',
                },
                {
                  name: 'groupedField4',
                  label: 'Grouped Field 4',
                }
              ]} />
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

export default QueryToSchemaConverter;
