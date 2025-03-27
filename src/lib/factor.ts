import {FactorSet} from "./factorSet";
import {getHash} from "./util";

export interface Factor {
    isNegative():boolean;

    isPrimary():boolean;

    getName():string;

    getKey():string;

    apply(target:any):void;
}

export abstract class AbstractFactor implements Factor {
    protected negative:boolean;
    protected primary:boolean;
    protected name:string;
    protected key:string;

    protected constructor(negative:boolean, primary:boolean, name:string) {
        this.negative = negative;
        this.primary = primary;
        this.name = name;
        this.key = getHash(name);
    }

    getName():string {
        return this.name;
    }

    isNegative():boolean {
        return this.negative;
    }

    isPrimary():boolean {
        return this.primary;
    }

    getKey():string {
        return this.key;
    }

    insert(...factorSets:FactorSet[]) {
        const out:FactorSet[] = [];
        for (const t of factorSets) {
            out.push(t.expand(this));
        }
        return out;
    }

    abstract apply(target:any):void;
}

