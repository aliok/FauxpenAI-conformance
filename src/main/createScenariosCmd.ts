import {scenarios as chatCompletionScenarios} from "../apis/chatcompletions/scenarios";
import {scenarios as embeddingsScenarios} from "../apis/embeddings/scenarios";
import {buildGroupCounts, Scenario, writeScenarios} from "../lib/scenario";
import {API_CHAT_COMPLETIONS, API_EMBEDDINGS} from "./vars";

export async function createScenarios(api:string, outputFile:string) {
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
