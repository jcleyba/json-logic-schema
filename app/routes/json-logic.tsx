import { useState } from "react";
import jsonLogic from "json-logic-js";
import { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  return json({});
}

function translateJsonLogic(jsonLogicExpression: any) {
  // Helper function to recursively translate a single JSON Logic rule
  function translateRule(rule: any) {
    let result = "";

    // Base case: translate primitive values
    if (typeof rule !== "object") {
      return rule.toString();
    }

    // Recursive case: translate rule operators
    const operator = Object.keys(rule)[0];
    const operands = rule[operator];

    switch (operator) {
      case "==":
        result = `equal to ${translateRule(operands[1])}`;
        break;
      case "!=":
        result = `not equal to ${translateRule(operands[1])}`;
        break;
      case ">":
        result = `greater than ${translateRule(operands[1])}`;
        break;
      case ">=":
        result = `greater than or equal to ${translateRule(operands[1])}`;
        break;
      case "<":
        result = `less than ${translateRule(operands[1])}`;
        break;
      case "<=":
        result = `less than or equal to ${translateRule(operands[1])}`;
        break;
      case "and":
        if (operands.length === 1) {
          result = translateRule(operands[0]);
        } else {
          result = `The value must be ${operands
            .map(translateRule)
            .join(" and ")}`;
        }
        break;
      case "or":
        if (operands.length === 1) {
          result = translateRule(operands[0]);
        } else {
          result = `The value must be ${operands
            .map(translateRule)
            .join(" or ")}`;
        }
        break;
      case "if":
        result = `if ${translateRule(operands[0])}, then ${translateRule(
          operands[1]
        )}, otherwise ${translateRule(operands[2])}`;
        break;
      case "var":
        result = `${operands}`;
        break;
      case "in":
        result = `in the set ${translateRule(operands[1])}`;
        break;
      case "merge":
        result = `one of the following: ${operands
          .map(translateRule)
          .join(", ")}`;
        break;
      default:
        result = `${operator} of ${operands.map(translateRule).join(", ")}`;
        break;
    }

    return result;
  }

  const translation = translateRule(jsonLogicExpression);
  return translation.startsWith("The value must be")
    ? translation
    : `The value must be ${translation}`;
}

export default function ExpenseForm() {
  const [formData, setFormData] = useState({
    jobTitle: "",
    expenseType: "",
    amount: "",
    merchantName: "",
    merchantCategory: "",
    clientName: "",
    projectCode: "",
    departmentCode: "",
    mileage: "",
    vehicleType: "",
    numberOfAttendees: "",
    mealType: "",
    travelDestination: "",
    travelDuration: "",
  });

  // Add validation errors state
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Define validation rules using JsonLogic
  const fieldRules = {
    clientName: {
      rule: {
        or: [
          { "==": [{ var: "jobTitle" }, "sales_representative"] },
          { "==": [{ var: "jobTitle" }, "account_manager"] },
        ],
      },
      label: "Client Name",
      type: "text",
      pattern: "email-pattern",
    },
    projectCode: {
      rule: {
        or: [
          { "==": [{ var: "jobTitle" }, "project_manager"] },
          { "==": [{ var: "jobTitle" }, "developer"] },
        ],
      },
      label: "Project Code",
      type: "text",
    },
    mileage: {
      rule: { "==": [{ var: "expenseType" }, "travel"] },
      label: "Mileage",
      type: "number",
    },
    vehicleType: {
      rule: {
        and: [
          { "==": [{ var: "expenseType" }, "travel"] },
          { ">": [{ var: "mileage" }, 0] },
        ],
      },
      label: "Vehicle Type",
      type: "select",
      options: ["Personal", "Company", "Rental"],
    },
    numberOfAttendees: {
      rule: { "==": [{ var: "expenseType" }, "meal"] },
      uiRule: {
        and: [
          { ">": [{ var: "numberOfAttendees" }, 1] },
          { "<": [{ var: "numberOfAttendees" }, 10] },
        ],
      },
      label: "Number of Attendees",
      type: "number",
    },
    mealType: {
      rule: { "==": [{ var: "expenseType" }, "meal"] },
      label: "Meal Type",
      type: "select",
      options: ["Breakfast", "Lunch", "Dinner", "Snacks"],
    },
    travelDestination: {
      rule: {
        and: [
          { "==": [{ var: "expenseType" }, "travel"] },
          { ">": [{ var: "amount" }, 100] },
        ],
      },
      label: "Travel Destination",
      type: "text",
    },
    travelDuration: {
      rule: {
        and: [
          { "==": [{ var: "expenseType" }, "travel"] },
          { ">": [{ var: "amount" }, 100] },
        ],
      },
      uiRule: {
        and: [{ "<": [{ var: "travelDuration" }, 30] }],
      },
      label: "Travel Duration (days)",
      type: "number",
    },
  };

  // Update handleInputChange to validate fields with uiRules
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Validate field if it has a uiRule
    const field = fieldRules[name as keyof typeof fieldRules];
    if (field?.uiRule) {
      const isValid = jsonLogic.apply(field.uiRule, {
        ...formData,
        [name]: value,
      });
      setValidationErrors((prev) => ({
        ...prev,
        [name]: isValid ? "" : getValidationMessage(name),
      }));
    }
  };

  // Helper function to get validation messages
  const getValidationMessage = (fieldName: string) => {
    const uiRule: any =
      fieldRules[fieldName as keyof typeof fieldRules]?.uiRule;
    return uiRule ? translateJsonLogic(uiRule) : "";
  };

  const shouldShowField = (fieldName: string) => {
    const rule: any = fieldRules[fieldName as keyof typeof fieldRules]?.rule;
    return rule ? jsonLogic.apply(rule, formData) : true;
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Expense Form</h1>

      <form className="space-y-4">
        <div>
          <label className="block mb-2">
            Job Title:
            <select
              name="jobTitle"
              value={formData.jobTitle}
              onChange={handleInputChange}
              className="border p-2 w-full rounded"
            >
              <option value="">Select...</option>
              <option value="sales_representative">Sales Representative</option>
              <option value="account_manager">Account Manager</option>
              <option value="project_manager">Project Manager</option>
              <option value="developer">Developer</option>
              <option value="designer">Designer</option>
            </select>
          </label>
        </div>

        <div>
          <label className="block mb-2">
            Expense Type:
            <select
              name="expenseType"
              value={formData.expenseType}
              onChange={handleInputChange}
              className="border p-2 w-full rounded"
            >
              <option value="">Select...</option>
              <option value="meal">Meal</option>
              <option value="travel">Travel</option>
              <option value="supplies">Office Supplies</option>
              <option value="software">Software</option>
            </select>
          </label>
        </div>

        <div>
          <label className="block mb-2">
            Amount:
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              className="border p-2 w-full rounded"
              placeholder="0.00"
            />
          </label>
        </div>

        {/* Conditional fields */}
        {Object.entries(fieldRules).map(
          ([fieldName, field]) =>
            shouldShowField(fieldName) && (
              <div key={fieldName}>
                <label className="block mb-2">
                  {field.label}:
                  {field.type === "select" ? (
                    <select
                      name={fieldName}
                      value={formData[fieldName as keyof typeof formData]}
                      onChange={handleInputChange}
                      className="border p-2 w-full rounded"
                    >
                      <option value="">Select...</option>
                      {field.options?.map((option) => (
                        <option key={option} value={option.toLowerCase()}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      name={fieldName}
                      value={formData[fieldName as keyof typeof formData]}
                      onChange={handleInputChange}
                      className={`border p-2 w-full rounded ${
                        validationErrors[fieldName] ? "border-red-500" : ""
                      }`}
                    />
                  )}
                </label>
                {validationErrors[fieldName] && (
                  <p className="text-red-500 text-sm mt-1">
                    {validationErrors[fieldName]}
                  </p>
                )}
              </div>
            )
        )}

        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={(e) => {
            e.preventDefault();
            console.log("Form data:", formData);
          }}
        >
          Submit Expense
        </button>
      </form>
    </div>
  );
}
