import fs from "node:fs";
import OpenAI from "openai";
import yargs from "yargs";
import zlib from "zlib";
import {sanitizeResponseBody as chatCompletionsRespSanitize} from "../apis/chatcompletions/sanitize";
import {scenarios as chatCompletionScenarios} from "../apis/chatcompletions/scenarios";
import {sanitizeResponseBody as embeddingsRespSanitize} from "../apis/embeddings/sanitize";
import {scenarios as embeddingsScenarios} from "../apis/embeddings/scenarios";
import {Result} from "../lib/result";
import {buildGroupCounts, Scenario, writeScenarios} from "../lib/scenario";
import {ScenarioRunner} from "../lib/scenarioRunner";
import {escapeCSVValue} from "../lib/util";
import {sanitizeResponseHeaders} from "./sanitize";

const API_CHAT_COMPLETIONS = "chatcompletions";
const API_EMBEDDINGS = "embeddings";

export async function main() {
    let y = yargs(process.argv.slice(2))
        .usage("Usage: $0 <command> [options]")
        .strictCommands()
        .demandCommand(1, 1, "You need to specify a command.", "You can only specify one command.")
        .wrap(null);

    y = y.command("createScenarios", "Create scenarios for the given API", (subcmd) => {
        subcmd.usage(`Usage: $0 createScenarios [options]`)
            .example(
                `$0 createScenarios --api=${API_CHAT_COMPLETIONS} --outputFile=./scenarios.json`,
                "Create scenarios for the OpenAI Chat Completions API and save them to ./scenarios.json",
            )
            .option("api", {
                type: "string",
                choices: [API_CHAT_COMPLETIONS, API_EMBEDDINGS],
                demandOption: true,
                description: "API to create scenarios for.",
            })
            .option("outputFile", {
                type: "string",
                demandOption: true,
                description: "Path to the output scenarios file.",
            });
    }, async (argv) => {
        console.log(`Going to create scenarios for ${argv.api} and save them to ${argv.outputFile}`);
        await createScenarios(argv.api as string, argv.outputFile as string);
    });

    y = y.command("runScenarios", "Run scenarios for the given API", (subcmd) => {
        subcmd.usage(`
            Usage: $0 runScenarios [options]
            
            $0 executes scenarios against the OpenAI API. 
        
            It stops in any of these cases:
             - All scenarios are executed
             - There is a rate limit error
             - There are scenarios that are not done, but the max number of trials is reached.
             
             OpenAI API key is required. It should be set in the environment variable OPENAI_API_KEY.`)
            .example(
                "$0 runScenarios --api=chatcompletions --scenariosFile=./scenarios.json --resultsFile=./results.json.gz",
                "Run scenarios for the OpenAI Chat Completions API and save the results to ./results.json.gz",
            )
            .option("api", {
                type: "string",
                choices: [API_CHAT_COMPLETIONS, API_EMBEDDINGS],
                demandOption: true,
                description: "API to create scenarios for.",
            })
            .option("scenariosFile", {
                type: "string",
                demandOption: true,
                description: "Path to the scenarios file. Any scenarios not existing in the " +
                    "resultsFile will be added to the resultsFile.",
            })
            .option("resultsFile", {
                type: "string",
                demandOption: true,
                description: "Path to the results gzip file. If the file doesn't exist, it will be " +
                    "created from the content of the scenarios file. If exists, scenarios in the file will be executed. " +
                    "This allows to resume the execution of scenarios that are not done yet." +
                    "\n" +
                    "The file is gzipped as the results can be large. "
            })
            .option("baseUrl", {
                type: "string",
                default: "https://api.openai.com/v1",
                description: "Base URL for the API server"
            })
            .option("rateLimit", {type: "number", default: 0.3, description: "Rate limit in requests per second."})
            .option("maxTrials", {
                type: "number",
                default: 3,
                description: "Max trials for each scenario. A scenario will be retried in case of a network/IO " +
                    "failure or a server side 5xx error. "
            })
            .option("passes", {
                type: "number",
                default: 5,
                description: "Number of passes to run until the finish condition is reached. " +
                    "This number should be larger than the number of maxTrials."
            })
    }, async (argv) => {
        console.log(`Going to run scenarios from ${argv.scenariosFile} and save the results to ${argv.resultsFile}`);
        console.log(`API: ${argv.api}`);
        console.log(`Base URL: ${argv.baseUrl}`);
        console.log(`Rate limit: ${argv.rateLimit}`);
        console.log(`Max trials: ${argv.maxTrials}`);
        console.log(`Passes: ${argv.passes}`);
        console.log(`Results file: ${argv.resultsFile}`);

        // read OPENAI_API_KEY
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("OPENAI_API_KEY environment variable is not set.");
        }

        await runScenarios(
            apiKey,
            argv.api as string,
            argv.scenariosFile as string,
            argv.resultsFile as string,
            argv.baseUrl as string,
            argv.rateLimit as number,
            argv.maxTrials as number,
            argv.passes as number,
        );
    });

    y = y.command("report", "Report the results of the scenarios", (subcmd) => {
        subcmd.usage(`
            Usage: $0 report [options].
        
            $0 prints a CSV content to stdout which can be used to create a report.
        `)
            .option("resultsFile", {
                type: "string",
                demandOption: true,
                description: "Path to the results gzip file.",
            });
    }, async (argv) => {
        console.log(`Going to report the results from ${argv.resultsFile}`);
        console.log(`Results file: ${argv.resultsFile}`);

        await report(argv.resultsFile as string);
    });

    await y.parse();
}

async function createScenarios(api:string, outputFile:string) {
    let scenarios:Scenario<any>[] = [];

    switch (api) {
        case API_CHAT_COMPLETIONS:
            scenarios = await chatCompletionScenarios();
            break;
        case API_EMBEDDINGS:
            scenarios = await embeddingsScenarios();
            break;
        default:
            throw new Error(`Unknown API: ${api}`);
    }

    const groups = buildGroupCounts(scenarios);
    console.log(`Total test scenarios: ${scenarios.length}`);
    console.log("Scenario groups:");
    for (const [group, count] of groups) {
        console.log(` - ${group}: ${count}`);
    }

    writeScenarios(outputFile, scenarios);
}

async function runScenarios(apiKey:string, api:string, scenariosFile:string, resultsFile:string, baseUrl:string, rateLimit:number, maxTrials:number, passes:number) {
    let url = "";
    let method = "POST";
    let responseHeaderSanitizer = sanitizeResponseHeaders;
    let responseBodySanitizer = function (body:any) {
    };

    switch (api) {
        case API_CHAT_COMPLETIONS:
            url = `${baseUrl}/chat/completions`;
            responseBodySanitizer = chatCompletionsRespSanitize;
            break;
        case API_EMBEDDINGS:
            url = `${baseUrl}/embeddings`;
            responseBodySanitizer = embeddingsRespSanitize;
            break;
        default:
            throw new Error(`Unknown API: ${api}`);
    }

    // first read the results file
    // if it doesn't exist, create it, with the exact content of scenarios.json
    // then, for each test case in the results file that's not executed, execute it
    // after every execution, write the results to the file, without waiting for all the test cases to finish

    let results:Record<string, Result<any>> = readResultsFile(resultsFile);
    console.log(`Loaded ${Object.keys(results).length} results from file.`);

    // insert missing scenarios into the result s file
    let scenarios:Record<string, Scenario<any>> = readScenariosFile(scenariosFile);
    for (const [key, scenario] of Object.entries(scenarios)) {
        if (!results[key]) {
            results[key] = new Result(scenario, null as any);
        }
    }

    registerGracefulExit(function () {
        writeResultsFile(resultsFile, results);
    });

    // /////////////////////////////////////////////////////////////////
    // /////////////////////////////////////////////////////////////////
    // // TODO: remove this
    // let resultsArray = Object.values(results);
    // let testIndex = 0;
    // // find an entry with stream=true
    // for (let i = 1; i < resultsArray.length; i++) {
    //     // let go = resultsArray[i].scenario.requestBody.stream && resultsArray[i].scenario.requestBody.stream_options && resultsArray[i].scenario.requestBody.stream_options?.include_usage;
    //     // if (go) {
    //     //     testIndex = i;
    //     //     console.log(`Found streaming test case at index ${testIndex}`);
    //     //     break;
    //     // }
    //     testIndex = i;
    //     break
    // }
    // resultsArray = [resultsArray[testIndex]];
    // /////////////////////////////////////////////////////////////////
    // /////////////////////////////////////////////////////////////////


    let resultsArray = Object.values(results);
    let runner = new ScenarioRunner(resultsArray, {
        url,
        method,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        rateLimit: rateLimit,     // 3 requests every 10 seconds
        onProgress: (completed, total) => {
            console.log(`Completed ${completed} of ${total} scenarios`);
        },
        onError: (error, scenarioKey) => {
            console.error(`Error in scenario ${scenarioKey}:`, error);
        },
        maxTrials: maxTrials,
        responseHeaderSanitizer,
        responseBodySanitizer,
    });

    // TODO: run for N times, until there's nothing to run
    // TODO: think about runner.stopped though
    for (let i = 0; i < passes; i++) {
        console.log(`Iteration ${i + 1} of ${passes}`);
        // TODO: check if there are any scenarios to run
        if (runner.isStopped()) {
            console.log("Runner is stopped. Exiting.");
            break;
        }
        await runner.run();
    }

    console.log("All scenarios executed");
    console.log("Writing results to file...");
    writeResultsFile(resultsFile, results);
}

async function report(resultsFile:string) {
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


function readResultsFile(filePath:string):Record<string, Result<any>> {
    if (isEmptyFile(filePath)) {
        // we can ignore the error, and start the tests from scratch
        console.info(`Results file ${filePath} does not exist or is empty. Starting from scratch.`);
        return {};
    }

    return readFile(filePath, true) as Record<string, Result<any>>;
}

function readScenariosFile(filePath:string) {
    if (isEmptyFile(filePath)) {
        throw new Error(`Scenarios file ${filePath} does not exist or is empty.`);
    }

    return readFile(filePath, false) as Record<string, Scenario<any>>;
}

function isEmptyFile(filePath:string) {
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        return true
    }

    // check if the file is empty
    return fs.statSync(filePath).size === 0;
}

function readFile(filePath:string, gzip:boolean):any {
    // Check if the file is readable/writable
    try {
        fs.accessSync(filePath, fs.constants.R_OK | fs.constants.W_OK);
    } catch (err) {
        // this is a critical error. we can't ignore and start the tests from scratch.
        console.error(`File ${filePath} is not readable or writable.`);
        throw new Error(`File ${filePath} is not readable or writable.`);
    }

    // Read the file
    let data:string;
    try {
        if (gzip) {
            const compressedData = fs.readFileSync(filePath);
            data = zlib.gunzipSync(compressedData).toString("utf-8");
        } else {
            data = fs.readFileSync(filePath, "utf-8");
        }
    } catch (err) {
        // this is a critical error. we can't ignore and start the tests from scratch.
        console.error(`Error reading file ${filePath}: ${err}`);
        throw new Error(`Error reading file ${filePath}: ${err}`);
    }

    // Parse the JSON data
    let theMap:Record<string, Result<any>>;
    try {
        theMap = JSON.parse(data) as Record<string, Result<any>>;
    } catch (err) {
        console.error(`Error parsing JSON data from file ${filePath}: ${err}`);
        throw new Error(`Error parsing JSON data from file ${filePath}: ${err}`);
    }

    return theMap;
}

function writeResultsFile(filePath:string, results:Record<string, Result<OpenAI.ChatCompletionCreateParams>>) {
    console.log(`Writing results to ${filePath}...`);

    // sort the test cases by key
    const sortedKeys = Object.keys(results).sort();
    const sortedResults:Record<string, Result<OpenAI.Chat.ChatCompletionCreateParams>> = {};
    for (const key of sortedKeys) {
        sortedResults[key] = results[key];
    }

    try {
        const jsonString = JSON.stringify(sortedResults, null, 2);
        const compressedData = zlib.gzipSync(jsonString);
        fs.writeFileSync(filePath, compressedData);
        console.log(`File successfully written as Gzip: ${filePath}`);
    } catch (err) {
        console.error(`Error writing Gzip file ${filePath}: ${err}`);
        throw new Error(`Error writing Gzip file ${filePath}: ${err}`);
    }
}

function registerGracefulExit(callback:() => void) {
    let logAndExit = function () {
        console.log("Exiting");
        callback();
        process.exit();
    };

    // handle graceful exit
    //do something when app is closing
    // process.on('exit', logAndExit);
    //catches ctrl+c event
    process.on('SIGINT', logAndExit);
    process.on('SIGTERM', logAndExit);
    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', logAndExit);
    process.on('SIGUSR2', logAndExit);

    process.on('unhandledRejection', (reason, p) => {
        console.error(reason, 'Unhandled Rejection at Promise', p);
        logAndExit();
    });
    process.on('uncaughtException', err => {
        console.error(err, 'Uncaught Exception thrown');
        logAndExit();
    });
}
