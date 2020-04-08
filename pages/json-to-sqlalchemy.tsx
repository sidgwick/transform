import ConversionPanel from "@components/ConversionPanel";
import { useCallback } from "react";
import * as React from "react";

function jsonToSQLAlchemyModel(json, typename) {
  let scope;
  let code = "";
  let tabs = 0;

  try {
    scope = JSON.parse(json.replace(/\.0/g, ".1")); // hack that forces floats to stay as floats
  } catch (e) {
    return {
      code: "",
      error: e.message
    };
  }

  let tablename = format(typename || "TableName");
  let className = tablename
    .replace(/_([a-z])/g, (_, x) => x.toUpperCase())
    .replace(/^(.)/, x => x.toUpperCase());
  append(`class ${className}(db.Model):\n`);
  ++tabs;
  indent(tabs);
  append(`__tablename__ = ${tablename}\n`);
  parseStruct(scope);

  return { code: code };

  function parseStruct(scope) {
    const keys = Object.keys(scope);
    for (const i in keys) {
      const keyname = keys[i];
      indent(tabs);
      append(`${format(keyname)} = db.Column(${dbType(scope[keyname])})\n`);
    }
  }

  function indent(tabs) {
    for (let i = 0; i < tabs; i++) code += "    ";
  }

  function append(str) {
    code += str;
  }

  // Sanitizes and formats a string to make an appropriate identifier in Python
  function format(str) {
    if (!str) return "";
    else if (str.match(/^\d+$/)) str = "num" + str;
    else if (str.charAt(0).match(/\d/)) {
      const numbers = {
        "0": "zero_",
        "1": "one_",
        "2": "two_",
        "3": "three_",
        "4": "four_",
        "5": "five_",
        "6": "six_",
        "7": "seven_",
        "8": "eight_",
        "9": "nine_"
      };
      str = numbers[str.charAt(0)] + str.substr(1);
    }

    return (
      str
        .replace(/([A-Z])/g, "_$1")
        .replace(/[^a-z0-9_]/gi, "")
        .replace(/[_]+/g, "_")
        .replace(/^_/, "")
        .toLowerCase() || "NAMING_FAILED"
    );
  }

  // Determines the most appropriate Go type
  function dbType(val) {
    if (val === null) return "db.LargeBinary";

    switch (typeof val) {
      case "string":
        if (/\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(\+\d\d:\d\d|Z)/.test(val)) {
          return "db.DateTime";
        } else return "db.String";
      case "number":
        if (val % 1 === 0) {
          if (val > -2147483648 && val < 2147483647) return "db.Integer";
          else return "db.BigInteger";
        } else return "db.Numeric";
      case "boolean":
        return "db.Boolean";
      case "object":
        return "db.PickleType";
      default:
        return "db.LargeBinary";
    }
  }
}

export default function() {
  const transformer = useCallback(async ({ value }) => {
    let res = jsonToSQLAlchemyModel(value, "");
    return res.code;
  }, []);

  return (
    <ConversionPanel
      transformer={transformer}
      editorTitle="JSON"
      editorLanguage="json"
      resultTitle="SQLAlchemy Model"
      resultLanguage={"go"}
    />
  );
}
