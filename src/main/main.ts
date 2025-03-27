import yargs from "yargs";
import {compareResults} from "./compareResultsCmd";
import {createScenarios} from "./createScenariosCmd";
import {report} from "./reportCmd";
import {runScenarios} from "./runScenariosCmd";
import {API_CHAT_COMPLETIONS, API_EMBEDDINGS} from "./vars";

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

    y = y.command("compareResults", "Compare the results of the scenarios for 2 runs", (subcmd) => {
        subcmd.usage(`
            Usage: $0 compareResults [options].
        
            $0 compareResults compares the results of 2 runs. It prints a CSV content to stdout which can be used to create a report.
        `)
            .option("specFile", {
                type: "string",
                demandOption: true,
                description: "Path to the first results gzip file.",
            })
            .option("resultsFile", {
                type: "string",
                demandOption: true,
                description: "Path to the second results gzip file.",
            })
            .option("api", {
                type: "string",
                choices: [API_CHAT_COMPLETIONS, API_EMBEDDINGS],
                demandOption: false,
                description: "API to compare scenarios for. Only required if the comparison methods requires it",
            })
            .option("methods", {
                type: "array",
                demandOption: true,
                // TODO: explain methods
                description: "Methods to use for the comparison. Currently only 'base' is supported.",
            })
            .option("verbose", {
                type: "boolean",
                default: false,
                description: "Verbose output with the keys of the scenarios that are different and the differences.",
            });
    }, async (argv) => {
        console.log(`Going to compare the results from ${argv.specFile} and ${argv.resultsFile}`);
        console.log(`API: ${argv.api}`);
        console.log(`Methods: ${argv.methods}`);
        console.log(`Verbose: ${argv.verbose}`);

        await compareResults(
            argv.specFile as string,
            argv.resultsFile as string,
            argv.api as string,
            argv.methods as string[],
            argv.verbose as boolean,
        );
    })

    await y.parse();
}
