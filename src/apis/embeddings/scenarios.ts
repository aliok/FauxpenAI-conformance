import OpenAI from 'openai';
import {FactorSet} from "../../lib/factorSet";
import {createScenarios} from "../../lib/scenario";
import {TestSuite} from "../../lib/testSuite";
import * as Factors from "./factors";

export async function scenarios() {
    const suites:TestSuite[] = [];

    let negativeSuite = Factors.RegistryInstance.createNegativeTestSuite("negative");
    // test the negative cases with 3 models
    suites.push(negativeSuite.extend(Factors.Model.EMBEDDING_ADA_002, Factors.Input.STRING));
    suites.push(negativeSuite.extend(Factors.Model.EMBEDDING_3_SMALL, Factors.Input.STRING));
    suites.push(negativeSuite.extend(Factors.Model.EMBEDDING_3_LARGE, Factors.Input.STRING));

    // since we're always passing models above, let's add cases for invalid models
    let negativeModelSuite:TestSuite = new TestSuite([
        new FactorSet(Factors.Model.BLANK.getName(), [Factors.Model.BLANK], "negative_model"),
        new FactorSet(Factors.Model.UNKNOWN.getName(), [Factors.Model.UNKNOWN], "negative_model"),
    ]);
    suites.push(negativeModelSuite);

    // the sanity cases are the same for all models, so we can just add them once
    let sanitySuite = sanityTestSuite();
    suites.push(sanitySuite.extend(Factors.Model.EMBEDDING_ADA_002));
    suites.push(sanitySuite.extend(Factors.Model.EMBEDDING_3_SMALL));
    suites.push(sanitySuite.extend(Factors.Model.EMBEDDING_3_LARGE));

    // for each message factor value, we create a new test case
    let inputParams = Factors.SeedRegistryInstance.getValues(Factors.Input);
    let inputCases:FactorSet[] = [];
    for (const messageParam of inputParams) {
        inputCases.push(new FactorSet(messageParam.getName(), [messageParam], "input"));
    }
    suites.push(new TestSuite(inputCases).extend(Factors.Model.EMBEDDING_ADA_002));

    let pairwiseSuite = Factors.RegistryInstance.createCombinationTestSuite("pairwise", 2);
    // pairwise with 1 model only, as there are too many combinations
    suites.push(pairwiseSuite.extend(Factors.Model.EMBEDDING_ADA_002, Factors.Input.STRING));

    // create execution specs
    return createScenarios(suites, () => {
        return {} as OpenAI.Embeddings.EmbeddingCreateParams
    });
}

function sanityTestSuite():TestSuite {
    let sanitySuite = Factors.RegistryInstance.createSanityTestSuite("sanity");
    let seedSanitySuite = Factors.SeedRegistryInstance.createSanityTestSuite("seed_sanity");
    // we want to cross product the sanity cases with the seed sanity cases
    return sanitySuite.product(seedSanitySuite);
}
