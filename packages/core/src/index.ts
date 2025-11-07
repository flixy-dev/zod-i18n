import { $ZodErrorMap } from "zod/v4/core";
import i18next, { i18n } from "i18next";

const jsonStringifyReplacer = (_: string, value: any): any => {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
};

function joinValues<T extends any[]>(array: T, separator = " | "): string {
  return array
    .map((val) => (typeof val === "string" ? `'${val}'` : val))
    .join(separator);
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null) return false;

  for (const key in value) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) return false;
  }

  return true;
};

const getKeyAndValues = (
  param: unknown,
  defaultKey: string
): {
  values: Record<string, unknown>;
  key: string;
} => {
  if (typeof param === "string") return { key: param, values: {} };

  if (isRecord(param)) {
    const key =
      "key" in param && typeof param.key === "string" ? param.key : defaultKey;
    const values =
      "values" in param && isRecord(param.values) ? param.values : {};
    return { key, values };
  }

  return { key: defaultKey, values: {} };
};

export type MakeZodI18nMap = (option?: ZodI18nMapOption) => $ZodErrorMap;

export type ZodI18nMapOption = {
  t?: i18n["t"];
  ns?: string | readonly string[];
  handlePath?: HandlePathOption | false;
};

export type HandlePathOption = {
  context?: string;
  ns?: string | readonly string[];
  keyPrefix?: string;
};

const defaultNs = "zod";

export const makeZodI18nMap: MakeZodI18nMap = (option) => (issue) => {
  const { t, ns, handlePath } = {
    t: i18next.t,
    ns: defaultNs,
    ...option,
    handlePath:
      option?.handlePath !== false
        ? {
            context: "with_path",
            ns: option?.ns ?? defaultNs,
            keyPrefix: undefined,
            ...option?.handlePath,
          }
        : null,
  };

  let message: string;
  message = issue.message ?? "Invalid value";

  const path =
    issue?.path && !!handlePath
      ? {
          context: handlePath.context,
          path: t(
            [handlePath.keyPrefix, issue.path.join(".")]
              .filter(Boolean)
              .join("."),
            {
              ns: handlePath.ns,
              defaultValue: issue.path.join("."),
            }
          ),
        }
      : {};

  switch (issue.code) {
    case "invalid_type":
      if (issue.expected === "undefined") {
        message = t("errors.invalid_type_received_undefined", {
          ns,
          defaultValue: message,
          ...path,
        });
      } else if (issue.expected === "null") {
        message = t("errors.invalid_type_received_null", {
          ns,
          defaultValue: message,
          ...path,
        });
      } else {
        message = t("errors.invalid_type", {
          expected: t(`types.${issue.expected}`, {
            defaultValue: issue.expected,
            ns,
          }),
          received: t(`types.${issue.received}`, {
            defaultValue: issue.received,
            ns,
          }),
          ns,
          defaultValue: message,
          ...path,
        });
      }
      break;
    case "invalid_value":
      message = t("errors.invalid_literal", {
        expected: JSON.stringify(issue.expected, jsonStringifyReplacer),
        ns,
        defaultValue: message,
        ...path,
      });
      break;
    case "unrecognized_keys":
      message = t("errors.unrecognized_keys", {
        keys: joinValues(issue.keys, ", "),
        count: issue.keys.length,
        ns,
        defaultValue: message,
        ...path,
      });
      break;
    case "invalid_union":
      message = t("errors.invalid_union", {
        ns,
        defaultValue: message,
        ...path,
      });
      break;
    case "invalid_format":
      if (issue.format === "date") {
        message = t("errors.invalid_date", {
          ns,
          defaultValue: message,
          ...path,
        });
      } else if (issue.format === "starts_with") {
        message = t(`errors.invalid_string.startsWith`, {
          startsWith: issue.format,
          ns,
          defaultValue: message,
          ...path,
        });
      } else if (issue.format === "ends_with") {
        message = t(`errors.invalid_string.endsWith`, {
          endsWith: issue.format,
          ns,
          defaultValue: message,
          ...path,
        });
      } else {
        message = t(`errors.invalid_string.${issue.format}`, {
          validation: t(`validations.${issue.format}`, {
            defaultValue: issue.format,
            ns,
          }),
          ns,
          defaultValue: message,
          ...path,
        });
      }
      break;
    case "too_small":
      const minimum =
        issue.origin === "date"
          ? new Date(Number(issue.minimum))
          : issue.minimum;
      message = t(
        `errors.too_small.${issue.origin}.${
          issue.exact
            ? "exact"
            : issue.inclusive
            ? "inclusive"
            : "not_inclusive"
        }`,
        {
          minimum,
          count: typeof minimum === "number" ? minimum : undefined,
          ns,
          defaultValue: message,
          ...path,
        }
      );
      break;
    case "too_big":
      const maximum =
        issue.origin === "date"
          ? new Date(Number(issue.maximum))
          : issue.maximum;
      message = t(
        `errors.too_big.${issue.origin}.${
          issue.exact
            ? "exact"
            : issue.inclusive
            ? "inclusive"
            : "not_inclusive"
        }`,
        {
          maximum,
          count: typeof maximum === "number" ? maximum : undefined,
          ns,
          defaultValue: message,
          ...path,
        }
      );
      break;
    case "custom":
      const { key, values } = getKeyAndValues(
        issue.params?.i18n,
        "errors.custom"
      );

      message = t(key, {
        ...values,
        ns,
        defaultValue: message,
        ...path,
      });
      break;
    case "not_multiple_of":
      message = t("errors.not_multiple_of", {
        multipleOf: issue.divisor,
        ns,
        defaultValue: message,
        ...path,
      });
      break;
    default:
  }

  return { message };
};

export const zodI18nMap = makeZodI18nMap();
