import {existsSync, mkdirSync, writeFileSync} from "fs";
import {dirname} from "path";
import {FactorSet} from "./factorSet";
import {TestSuite} from "./testSuite";

export interface Scenario<Target> {
    readonly key:string;
    readonly spec:FactorSet;
    readonly requestBody:Target;
}

export function createScenarios<T>(suites:TestSuite[], baseFn:() => T):Scenario<T>[] {
    const scenarios:Scenario<T>[] = [];
    for (const suite of suites) {
        const factorSets = suite.getSets();
        for (const factorSet of factorSets) {
            const body = baseFn();
            factorSet.apply(body);
            scenarios.push({
                key: factorSet.key,
                spec: factorSet,
                requestBody: body
            });
        }
    }
    return scenarios;
}

export function buildGroupCounts(scenarios:Scenario<any>[]) {
    // break down by groups
    const groups = new Map<string, number>();
    for (const t of scenarios) {
        const group = t.spec.group;
        if (groups.has(group)) {
            groups.set(group, groups.get(group)! + 1);
        } else {
            groups.set(group, 1);
        }
    }
    return groups;
}


export function writeScenarios<T>(filePath:string, scenarios:Scenario<T>[]):void {
    // create a map out of scenarios
    const theMap:Record<string, Scenario<T>> = {};
    for (const t of scenarios) {
        theMap[t.key] = t;
    }
    // sort the map by key
    const sortedKeys = Object.keys(theMap).sort();
    const sortedMap:Record<string, Scenario<T>> = {};
    for (const key of sortedKeys) {
        sortedMap[key] = theMap[key];
    }

    const jsonString = JSON.stringify(sortedMap, null, 2);

    // Ensure the directory exists
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
        mkdirSync(dir, {recursive: true});
    }

    // Write to file
    writeFileSync(filePath, jsonString, 'utf-8');
}
