import OpenAI from 'openai';
import {FactorSet} from "../../lib/factorSet";
import {createScenarios} from "../../lib/scenario";
import {TestSuite} from "../../lib/testSuite";
import * as Factors from "./factors";

export async function scenarios() {
    const suites:TestSuite[] = [];

    let negativeSuite = Factors.RegistryInstance.createNegativeTestSuite("negative");
    // test the negative cases with 3 models
    suites.push(negativeSuite.extend(Factors.Model.GPT_4, Factors.Messages.SYSTEM_AND_USER_MESSAGE));
    suites.push(negativeSuite.extend(Factors.Model.GPT_4O, Factors.Messages.SYSTEM_AND_USER_MESSAGE));
    suites.push(negativeSuite.extend(Factors.Model.GPT_4O_AUDIO_PREVIEW, Factors.Messages.SYSTEM_AND_USER_MESSAGE));

    let negativeSeedSuite = Factors.SeedRegistryInstance.createNegativeTestSuite("negative_seed");
    // test the negative seed cases with 3 models
    suites.push(negativeSeedSuite.extend(Factors.Model.GPT_4));
    suites.push(negativeSeedSuite.extend(Factors.Model.GPT_4O));
    suites.push(negativeSeedSuite.extend(Factors.Model.GPT_4O_AUDIO_PREVIEW));

    // since we're always passing models above, let's add cases for invalid models
    let negativeModelSuite:TestSuite = new TestSuite([
        new FactorSet(Factors.Model.BLANK.getName(), [Factors.Model.BLANK], "negative_model"),
        new FactorSet(Factors.Model.UNKNOWN.getName(), [Factors.Model.UNKNOWN], "negative_model"),
    ]);
    suites.push(negativeModelSuite);

    // the sanity cases are the same for all models, so we can just add them once
    let sanitySuite = sanityTestSuite();
    suites.push(sanitySuite.extend(Factors.Model.GPT_4));
    suites.push(sanitySuite.extend(Factors.Model.GPT_4O));
    suites.push(sanitySuite.extend(Factors.Model.GPT_4O_AUDIO_PREVIEW));

    // for each message factor value, we create a new test case
    let messageParams = Factors.SeedRegistryInstance.getValues(Factors.Messages);
    let messageCases:FactorSet[] = [];
    for (const messageParam of messageParams) {
        messageCases.push(new FactorSet(messageParam.getName(), [messageParam], "message"));
    }
    suites.push(new TestSuite(messageCases).extend(Factors.Model.GPT_4));

    let pairwiseSuite = Factors.RegistryInstance.createCombinationTestSuite("pairwise", 2);
    // pairwise with 1 model only, as there are too many combinations
    suites.push(pairwiseSuite.extend(Factors.Model.GPT_4, Factors.Messages.SYSTEM_AND_USER_MESSAGE));

    // add streaming cases - only for the sanity cases
    let streamingSuite = sanitySuite.extend(Factors.Model.GPT_4O, Factors.Stream.TRUE);
    // set the group to "streaming"
    for (const t of streamingSuite.getSets()) {
        t.group = "streaming";
    }
    suites.push(streamingSuite.extend(Factors.StreamOptions.TRUE));
    suites.push(streamingSuite.extend(Factors.StreamOptions.FALSE));
    suites.push(streamingSuite.extend(Factors.StreamOptions.BLANK));
    suites.push(streamingSuite.extend(Factors.StreamOptions.NOT_A_BOOLEAN));

    return createScenarios(suites, () => {
        return {} as OpenAI.Chat.ChatCompletionCreateParams
    });
}

function sanityTestSuite():TestSuite {
    let sanitySuite = Factors.RegistryInstance.createSanityTestSuite("sanity");
    let seedSanitySuite = Factors.SeedRegistryInstance.createSanityTestSuite("seed_sanity");
    // we want to cross product the sanity cases with the seed sanity cases
    return sanitySuite.product(seedSanitySuite);
}
