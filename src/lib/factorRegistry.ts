import {Factor} from "./factor";
import {FactorSet} from "./factorSet";
import {TestSuite} from "./testSuite";
import {generateTuples} from "./util";

export class FactorRegistry<T extends Factor> {

    /**
     * This is a map of type to factor values.
     * This is similar to EnumMap in Java, where you have a class with static values.
     *
     *
     * For example, for the following type:
     *
     * ```typescript
     * class MyFactor {
     *    static readonly A = new MyFactor("A");
     *    static readonly B = new MyFactor("B");
     * }
     * ```
     *
     * The intention is to have a map like this:
     * ```
     * { "MyFactor": [A, B] }
     * ```
     */
    private readonly factorValuesByTypeMap:Map<Function, T[]>;

    constructor() {
        this.factorValuesByTypeMap = new Map<Function, T[]>();
    }

    register(_type:Function, factor:T):void {
        if (!this.factorValuesByTypeMap.has(_type)) {
            this.factorValuesByTypeMap.set(_type, []);
        }
        this.factorValuesByTypeMap.get(_type)?.push(factor);
    }

    getValues(type:Function):T[] {
        return this.factorValuesByTypeMap.get(type) || [];
    }

    // TODO: validation
    // TODO: - must have 1 happy
    // TODO: - what else?

    createNegativeTestSuite(group:string):TestSuite {
        // create a new test suite  for each negative value of each type

        let sets:FactorSet[] = [];

        for (const [_, factorInstances] of this.factorValuesByTypeMap) {
            for (const factorValue of factorInstances) {
                if (factorValue.isNegative()) {
                    // create a new factor set for each negative value
                    sets.push(new FactorSet(factorValue.getName(), [factorValue], group));
                }
            }

        }

        return new TestSuite(sets);
    }

    createSanityTestSuite(group:string):TestSuite {
        // create a new suite for each "primary" value of each type
        let sets:FactorSet[] = [];
        for (const [_, factorInstances] of this.factorValuesByTypeMap) {
            for (const factorValue of factorInstances) {
                if (factorValue.isPrimary()) {
                    // create a new factor set for each primary value
                    sets.push(new FactorSet(factorValue.getName(), [factorValue], group));
                }
            }
        }

        return new TestSuite(sets);
    }

    createCombinationTestSuite(group:string, n:number = 2) {
        const buckets:T[][] = [];
        for (const [_, factorInstance] of this.factorValuesByTypeMap) {
            // only include non-negative factor values.
            // negative values fail independent of the other factors, why combine them?
            const filteredFactors = factorInstance.filter(p => !p.isNegative());
            buckets.push(filteredFactors);
        }

        const tuples = generateTuples(buckets, n);

        const sets:FactorSet[] = [];
        for (const tuple of tuples) {
            const name = tuple.map(p => p.getName()).join("+");
            sets.push(new FactorSet(name, tuple, group));
        }
        return new TestSuite(sets);
    }
}
