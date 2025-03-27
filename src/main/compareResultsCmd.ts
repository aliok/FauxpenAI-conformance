import {FactorSet} from "../lib/factorSet";
import {Result} from "../lib/result";
import {readResultsFile} from "./io";
import {API_CHAT_COMPLETIONS, API_EMBEDDINGS} from "./vars";

interface ComparisonResult {
    key:string;
    method:string;
    diffs:Diff[];
}

interface Diff {
    text:string;
    left:string;
    right:string;
    message?:string;
}

interface ComparisonMethod {
    (api:string, left:Result<any>, right:Result<any>):Diff[];
}

const comparisonMethods:Record<string, ComparisonMethod> = {
    "base": function (api:string, left:Result<any>, right:Result<any>):Diff[] {
        // if the right result does not exist, return immediately
        if (!right) {
            return [{
                text: "Right result is null",
                left: "",
                right: ""
            }];
        }

        // this should never happen, but just in case
        if (left.key !== right.key) {
            throw new Error(`Keys do not match: ${left.key} !== ${right.key}`);
        }

        // TODO: can be errored?
        // if left response is null, then we're dealing with a spec that's not fully executed
        if (!left.response) {
            return [{
                text: "Left result is not executed",
                left: "",
                right: ""
            }];
        }
        // TODO: can be errored?
        // same for the right
        if (!right.response) {
            return [{
                text: "Right result is not executed",
                left: "",
                right: ""
            }];
        }

        const diffs:Diff[] = [];

        // compare the status codes
        if (left.response.status !== right.response.status) {
            let diff:Diff = {
                text: "Status code",
                left: left.response.status.toString(),
                right: right.response.status.toString()
            };

            if (left.response.status >= 400 && left.response.status <= 500 && right.response.status < 400) {
                diff.message = "Left response body: " + JSON.stringify(left.response.body);
            } else if (right.response.status >= 400 && right.response.status <= 500 && left.response.status < 400) {
                diff.message = "Right response body: " + JSON.stringify(right.response.body);
            }

            diffs.push(diff);
        }

        // compare the content type header
        const leftContentType = left.response.headers?.["content-type"];
        const rightContentType = right.response.headers?.["content-type"];
        if (leftContentType !== rightContentType) {
            diffs.push({
                text: "Content-Type",
                left: leftContentType || "",
                right: rightContentType || ""
            });
        }
        return diffs;
    },

    "structure": function (api:string, left:Result<any>, right:Result<any>):Diff[] {
        const diffs:Diff[] = [];

        switch (api) {
            case API_EMBEDDINGS:
            case API_CHAT_COMPLETIONS: {
                // we handle the case that status codes are different in another method
                if (left.response?.status !== right.response?.status) {
                    return [];
                }

                if (left.response?.body) {
                    const jsonDiffs = diffJSONStructures(left.response.body, right.response?.body);
                    for (const diff of jsonDiffs) {
                        diffs.push({
                            text: "Response body " + diff.text,
                            left: diff.left,
                            right: diff.right
                        });
                    }
                }

                break;
            }
            default: {
                throw new Error(`Unknown API: ${api}`);
            }
        }

        return diffs;
    }
};

export async function compareResults(left:string, right:string, api:string, methods:string[], verbose:boolean) {
    const leftResults:Record<string, Result<any>> = readResultsFile(left);
    const rightResults:Record<string, Result<any>> = readResultsFile(right);

    console.log(`Loaded ${Object.keys(leftResults).length} results from file ${left}`);
    console.log(`Loaded ${Object.keys(rightResults).length} results from file ${right}`);

    const comparisonResults:{ [key:string]:{ [method:string]:ComparisonResult } } = {};

    const matchCounts:{ [method:string]:number } = {};
    const groupedDiffs:{ [category:string]:{ [change:string]:number } } = {};

    for (const method of methods) {
        if (!comparisonMethods[method]) {
            console.log(`Unknown comparison method: ${method}`);
            continue;
        }

        const compare = comparisonMethods[method];

        for (const [key, leftResult] of Object.entries(leftResults)) {
            if (rightResults[key] === undefined) {
                console.log(`Key ${key} not found in right results`);
                continue;
            }

            const rightResult = rightResults[key];
            const diffs = compare(api, leftResult, rightResult);

            comparisonResults[key] = comparisonResults[key] || {};
            comparisonResults[key][method] = {key, method, diffs};

            if (!matchCounts[method]) matchCounts[method] = 0;
            if (diffs.length === 0) matchCounts[method]++; // No diffs = perfect match

            // Group diffs for summary
            for (const diff of diffs) {
                const category = diff.text; // "Status Code", "Body", etc.
                const change = `${diff.left} → ${diff.right}`;

                if (!groupedDiffs[category]) groupedDiffs[category] = {};
                if (!groupedDiffs[category][change]) groupedDiffs[category][change] = 0;

                groupedDiffs[category][change]++;
            }
        }
    }

    const totalEntries = Object.keys(leftResults).length;

    // Print Final Match Summary
    console.log("\n===== Final Comparison Summary =====");
    for (const method of methods) {
        if (matchCounts[method] !== undefined) {
            const percentage = ((matchCounts[method] / totalEntries) * 100).toFixed(2);
            let icon = "✅"; // Default: Pass
            if (parseFloat(percentage) < 0) {
                icon = "❌"; // Fail
            } else if (parseFloat(percentage) < 75) {
                icon = "⚠️"; // Warning
            }

            console.log(`${icon}  ${method}: ${percentage}% (${matchCounts[method]}/${totalEntries})`);
        }
    }

    // Print Summary
    console.log("\n===== Summary =====");
    for (const [category, changes] of Object.entries(groupedDiffs)) {
        console.log(`🟡 ${category}`);
        for (const [change, count] of Object.entries(changes)) {
            console.log(`   ${change}: ${count} times`);
        }
    }

    // Print verbose output if requested
    if (verbose) {
        console.log("\n===== Detailed Differences =====");
        for (const [key, methods] of Object.entries(comparisonResults)) {
            for (const [method, result] of Object.entries(methods)) {
                if (result.diffs.length === 0) {
                    continue; // Skip if no diffs
                }
                console.log(`\n🔍 Key: ${result.key} (Method: ${method}) ${specName(leftResults[result.key].scenario.spec)}`);
                for (const diff of result.diffs) {
                    console.log(`  - ${diff.text}: "${diff.left}" → "${diff.right}"`);
                    if (diff.message) {
                        console.log(`    Message: ${diff.message}`);
                    }
                }
            }
        }
    }
}

function getObjectPaths(obj:any, prefix = ''):Set<string> {
    const paths = new Set<string>();

    function traverse(o:any, path:string) {
        if (o !== null && typeof o === 'object') {
            if (Array.isArray(o) && o.length > 0) {
                traverse(o[0], `${path}[]`);
            } else {
                for (const key of Object.keys(o)) {
                    const newPath = path ? `${path}.${key}` : key;
                    paths.add(newPath);
                    traverse(o[key], newPath);
                }
            }
        }
    }

    traverse(obj, prefix);
    return paths;
}

function diffJSONStructures(json1:any, json2:any):Diff[] {
    const paths1 = getObjectPaths(json1);
    const paths2 = getObjectPaths(json2);

    const onlyInJson1 = [...paths1].filter(p => !paths2.has(p));
    const onlyInJson2 = [...paths2].filter(p => !paths1.has(p));

    const diffs:Diff[] = [];
    const reportedPaths = new Set<string>();

    // Function to check if a path is a parent of another
    function isParentPath(parent:string, child:string):boolean {
        return child.startsWith(`${parent}.`);
    }

    onlyInJson1.forEach(path => {
        // Skip if any parent path has been reported
        if (![...reportedPaths].some(parent => isParentPath(parent, path))) {
            diffs.push({
                text: `field '${path}' only exists in left`,
                left: path,
                right: '',
            });
            reportedPaths.add(path);
        }
    });

    onlyInJson2.forEach(path => {
        // Skip if any parent path has been reported
        if (![...reportedPaths].some(parent => isParentPath(parent, path))) {
            diffs.push({
                text: `field '${path}' only exists in right`,
                left: '',
                right: path,
            });
            reportedPaths.add(path);
        }
    });

    return diffs;
}

function specName(factorSet:FactorSet):string {
    return factorSet.factors.map(p => (p as any).name).join(", ");
}
