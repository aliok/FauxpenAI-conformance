import {Factor} from "./factor";
import {FactorSet} from "./factorSet";

export class TestSuite {
    private readonly factorSets:FactorSet[];

    constructor(factorSets:FactorSet[]) {
        this.factorSets = factorSets;
    }

    extend(...factors:Factor[]):TestSuite {
        let newSets:FactorSet[] = [];

        for (const t of this.factorSets) {
            newSets.push(t.expand(...factors));
        }

        return new TestSuite(newSets);
    }

    merge(other:TestSuite):TestSuite {
        let newSets:FactorSet[] = [];

        newSets.push(...this.factorSets);
        newSets.push(...other.factorSets)

        return new TestSuite(newSets);
    }

    getSets() {
        return this.factorSets;
    }

    product(other:TestSuite):TestSuite {
        let sets:FactorSet[] = [];

        for (const t of this.factorSets) {
            for (const q of other.getSets()) {
                // factorSets.push(...t.innerProduct(q));
                sets.push(t.expand(...q.factors));
            }
        }

        return new TestSuite(sets);
    }
}
