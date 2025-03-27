import {Factor} from "./factor";
import {getHash} from "./util";

export class FactorSet {
    readonly name:string;
    readonly factors:Factor[];
    readonly key:string;
    group:string;

    constructor(name:string, factors:Factor[], group:string) {
        this.name = name;
        this.factors = factors;
        this.sortFactors();
        this.key = getHash(this.factors.map(p => p.getKey()).join(","));
        this.group = group;
    }

    expand(...newFactors:Factor[]):FactorSet {
        const expandedFactors = [...this.factors, ...newFactors];
        return new FactorSet(this.name, expandedFactors, this.group);
    }

    add(...others:FactorSet[]) {
        let out:FactorSet[] = [];
        for (const t of others) {
            out.push(this.expand(...t.factors));
        }
        return out;
    }

    private sortFactors() {
        this.factors.sort((a, b) => a.getKey().localeCompare(b.getKey()));
    }

    apply(target:any) {
        for (const p of this.factors) {
            p.apply(target);
        }
    }
}
