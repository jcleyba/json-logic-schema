import { ajvResolver } from "@hookform/resolvers/ajv";
import { json } from "@remix-run/node";
import Ajv from "ajv";
import { useForm } from "react-hook-form";

// Define the JSON Schema
const schema = {
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
    expenseType: {
      type: "string",
      enum: ["meal", "travel", "supplies", "software"],
      required: [],
    },
    amount: {
      type: "string",
      pattern: "^[0-9]+$",
      errorMessage: "Invalid amount",
      required: [],
    },
    clientName: {
      type: "string",
    },
    projectCode: { type: "string" },
    mileage: {
      type: "string",
      pattern: "^[0-9]+$",
      errorMessage: "Invalid mileage",
    },
    vehicleType: { type: "string", enum: ["personal", "company", "rental"] },
    numberOfAttendeess: {
      type: "string",
      pattern: "^[2-9]$",
      errorMessage: "Invalid number of attendees",
    },
    mealType: {
      type: "string",
      enum: ["breakfast", "lunch", "dinner", "snacks"],
    },
    travelDestination: { type: "string" },
    travelDuration: { type: "string", pattern: "^([1-9]|[12][0-9])$" },
  },
  allOf: [
    // Client Name dependency
    {
      if: {
        type: "object",
        properties: {
          jobTitle: { enum: ["sales_representative", "account_manager"] },
          amount: {
            type: "string",
            pattern: "^(?:50[1-9]|5[1-9][0-9]|[6-9][0-9]{2}|[1-9][0-9]{3,})$",
          },
        },
        required: ["jobTitle", "amount"],
      },
      then: { required: ["clientName"] },
    },
    // Project Code dependency
    {
      if: {
        type: "object",
        properties: { jobTitle: { enum: ["project_manager", "developer"] } },
        required: ["jobTitle"],
      },
      then: { required: ["projectCode"] },
    },
    // Travel-related fields dependencies
    {
      if: {
        type: "object",
        properties: { expenseType: { const: "travel" } },
        required: ["expenseType"],
      },
      then: { required: ["mileage"] },
    },
    {
      if: {
        type: "object",
        properties: {
          expenseType: { const: "travel" },
          mileage: { type: "string", pattern: "^[1-9][0-9]*$" },
        },
        required: ["expenseType", "mileage"],
      },
      then: { required: ["vehicleType"] },
    },
    // Meal-related fields dependencies
    {
      if: {
        type: "object",
        properties: { expenseType: { const: "meal" } },
        required: ["expenseType"],
      },
      then: { required: ["numberOfAttendees", "mealType"] },
    },
    // Travel destination and duration dependencies
    {
      if: {
        type: "object",
        properties: {
          expenseType: { const: "travel" },
          amount: {
            type: "string",
            pattern: "^(1[0-9][0-9]|[2-9][0-9][0-9]|[0-9]{4,})(\\.\\d{1,2})?$",
          },
        },
        required: ["expenseType", "amount"],
      },
      then: { required: ["travelDestination", "travelDuration"] },
    },
  ],
};

export async function loader() {
  return json(null);
}

type SchemaProperty = {
  type: string;
  enum?: string[];
  pattern?: string;
  required?: boolean;
};

function getRequiredFields(formData: any, schema: any) {
  const ajv = new Ajv({ allErrors: true });
  const requiredFields = new Set<string>();

  // Add base required fields if they exist in the schema
  if (schema.required) {
    schema.required.forEach((field: string) => requiredFields.add(field));
  }

  // Check each conditional requirement (allOf)
  schema.allOf?.forEach((condition: any) => {
    const { if: ifClause, then: thenClause } = condition;

    // Validate if the condition applies
    const validate = ajv.compile(ifClause);
    if (validate(formData)) {
      // Add required fields from the then clause
      thenClause.required?.forEach((field: string) =>
        requiredFields.add(field)
      );
    }
  });

  return requiredFields;
}

export default function ExpenseForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: ajvResolver(schema),
    mode: "onChange",
  });

  // Watch all fields
  const formValues = watch();

  // Get required fields based on current form values
  const requiredFields = getRequiredFields(formValues, schema);
  const onSubmit = (data: any) => {
    console.log(data);
  };

  const renderField = (fieldName: string, fieldSchema: SchemaProperty) => {
    const fieldError = errors[fieldName];
    const isRequired = fieldSchema.required || requiredFields.has(fieldName);
    if (!isRequired) return null;

    if (fieldSchema.enum) {
      return (
        <div key={fieldName} className="mb-4">
          <label className="block mb-1 capitalize">
            {fieldName.replace(/([A-Z])/g, " $1")}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
          <select
            {...register(fieldName)}
            className="w-full p-2 border rounded"
          >
            <option value="">
              Select {fieldName.replace(/([A-Z])/g, " $1").toLowerCase()}
            </option>
            {fieldSchema.enum.map((option) => (
              <option key={option} value={option}>
                {option
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
          {fieldError && (
            <p className="text-red-500 text-sm">
              {fieldError.message as string}
            </p>
          )}
        </div>
      );
    }

    return (
      <div key={fieldName} className="mb-4">
        <label className="block mb-1 capitalize">
          {fieldName.replace(/([A-Z])/g, " $1")}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type="text"
          {...register(fieldName)}
          className="w-full p-2 border rounded"
          placeholder={
            fieldSchema.pattern ? `Pattern: ${fieldSchema.pattern}` : ""
          }
        />
        {fieldError && (
          <p className="text-red-500 text-sm">{fieldError.message as string}</p>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {Object.entries(schema.properties).map(([fieldName, fieldSchema]) =>
          renderField(fieldName, fieldSchema as SchemaProperty)
        )}
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
