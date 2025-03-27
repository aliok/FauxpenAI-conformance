import {Result} from "../lib/result";
import {escapeCSVValue} from "../lib/util";
import {readResultsFile} from "./io";

export async function report(resultsFile:string) {
    let results:Record<string, Result<any>> = readResultsFile(resultsFile);
    console.log(`Loaded ${Object.keys(results).length} results from file.`);

    let resultsArray = Object.values(results);
    let csv = "Scenario,Group,Status,NonTerminalLatestError,Spec\n";
    for (const result of resultsArray) {
        let status = "";
        let error = "";

        if (result.response === null && (result.errors === null || result.errors.length === 0)) {
            status = "Not executed";
        } else if (result.response !== null) {
            status = "" + result.response.status;
        }

        if (result.response === null && result.errors && result.errors.length > 0) {
            let latestError = result.errors[result.errors.length - 1];
            status = "" + latestError.statusCode;
            error = JSON.stringify(latestError.message);
        }

        let spec = result.scenario.spec.factors.map(p => (p as any).name).join(", ");

        csv += `${escapeCSVValue(result.scenario.key)},${escapeCSVValue(result.scenario.spec.group)},${escapeCSVValue(status)},${escapeCSVValue(error)},${escapeCSVValue(spec)}\n`;

    }
    console.log("CSV report:");
    console.log(csv);
}
