/**
 * Copyright (c) Whales Corp. 
 * All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { TupleItem, Tuple } from "./tuple";

export class TupleReader {
    private readonly items: TupleItem[];

    constructor(items: TupleItem[]) {
        this.items = [...items];
    }

    get remaining() {
        return this.items.length;
    }

    peek() {
        if (this.items.length === 0) {
            throw Error('EOF');
        }
        return this.items[0];
    }

    pop() {
        if (this.items.length === 0) {
            throw Error('EOF');
        }
        let res = this.items[0];
        this.items.splice(0, 1);
        return res;
    }

    skip(num: number = 1) {
        for (let i = 0; i < num; i++) {
            this.pop();
        }
        return this;
    }

    readBigNumber() {
        let popped = this.pop();
        if (popped.type !== 'int') {
            throw Error('Not a number');
        }
        return popped.value;
    }

    readBigNumberOpt() {
        let popped = this.pop();
        if (popped.type === 'null') {
            return null;
        }
        if (popped.type !== 'int') {
            throw Error('Not a number');
        }
        return popped.value;
    }

    readNumber() {
        return Number(this.readBigNumber());
    }

    readNumberOpt() {
        let r = this.readBigNumberOpt();
        if (r !== null) {
            return Number(r);
        } else {
            return null;
        }
    }

    readBoolean() {
        let res = this.readNumber();
        return res === 0 ? false : true;
    }

    readBooleanOpt() {
        let res = this.readNumberOpt();
        if (res !== null) {
            return res === 0 ? false : true;
        } else {
            return null;
        }
    }

    readAddress() {
        let r = this.readCell().beginParse().loadAddress();
        if (r !== null) {
            return r;
        } else {
            throw Error('Not an address');
        }
    }

    readAddressOpt() {
        let r = this.readCellOpt();
        if (r !== null) {
            return r.beginParse().loadMaybeAddress();
        } else {
            return null;
        }
    }

    readCell() {
        let popped = this.pop();
        if (popped.type !== 'cell' && popped.type !== 'slice' && popped.type !== 'builder') {
            throw Error('Not a cell: ' + popped.type);
        }
        return popped.cell;
    }

    readCellOpt() {
        let popped = this.pop();
        if (popped.type === 'null') {
            return null;
        }
        if (popped.type !== 'cell' && popped.type !== 'slice' && popped.type !== 'builder') {
            throw Error('Not a cell');
        }
        return popped.cell;
    }

    readTuple() {
        let popped = this.pop();
        if (popped.type !== 'tuple') {
            throw Error('Not a number');
        }
        return new TupleReader(popped.items);
    }

    readTupleOpt() {
        let popped = this.pop();
        if (popped.type === 'null') {
            return null;
        }
        if (popped.type !== 'tuple') {
            throw Error('Not a number');
        }
        return new TupleReader(popped.items);
    }

    private _readCons(cons: TupleReader): TupleItem[] {
        const result: TupleItem[] = []
        while (true) {
            var current = cons.pop();
            if (current.type != 'tuple') {
                throw Error('Const consists only from tuple elements');
            }
            var items = ((current) as Tuple).items;
            result.push(items.slice(0,-1).pop()!);
            const next = items.pop();
            if (!['tuple', 'null'].includes(next!.type)) {
                throw Error('Const payload could be only tuple');
            }
            if (next!.type == "null") {
                return result
            }
            cons = new TupleReader([next] as Tuple[]);
        }
    }

    readCons() {
        return this._readCons(this)
    }

    readBuffer() {
        let s = this.readCell().beginParse();
        if (s.remainingRefs !== 0) {
            throw Error('Not a buffer');
        }
        if (s.remainingBits % 8 !== 0) {
            throw Error('Not a buffer');
        }
        return s.loadBuffer(s.remainingBits / 8);
    }

    readBufferOpt() {
        let popped = this.peek();
        if (popped.type === 'null') {
            return null;
        }
        let s = this.readCell().beginParse();
        if (s.remainingRefs !== 0) {
            throw Error('Not a buffer');
        }
        if (s.remainingBits % 8 !== 0) {
            throw Error('Not a buffer');
        }
        return s.loadBuffer(s.remainingBits / 8);
    }

    readString() {
        let s = this.readCell().beginParse();
        return s.loadStringTail();
    }

    readStringOpt() {
        let popped = this.peek();
        if (popped.type === 'null') {
            return null;
        }
        let s = this.readCell().beginParse();
        return s.loadStringTail();
    }
}