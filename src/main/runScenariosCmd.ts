import fs from "node:fs";
import OpenAI from "openai";
import zlib from "zlib";
import {sanitizeResponseBody as chatCompletionsRespSanitize} from "../apis/chatcompletions/sanitize";
import {sanitizeResponseBody as embeddingsRespSanitize} from "../apis/embeddings/sanitize";
import {Result} from "../lib/result";
import {Scenario} from "../lib/scenario";
import {ScenarioRunner} from "../lib/scenarioRunner";
import {registerGracefulExit} from "./gracefulExit";
import {isEmptyFile, readFile, readResultsFile} from "./io";
import {sanitizeResponseHeaders} from "./sanitize";
import {API_CHAT_COMPLETIONS, API_EMBEDDINGS} from "./vars";

export async function runScenarios(apiKey:string, api:string, scenariosFile:string, resultsFile:string, baseUrl:string, rateLimit:number, maxTrials:number, passes:number) {
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

function readScenariosFile(filePath:string) {
    if (isEmptyFile(filePath)) {
        throw new Error(`Scenarios file ${filePath} does not exist or is empty.`);
    }

    return readFile(filePath, false) as Record<string, Scenario<any>>;
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
