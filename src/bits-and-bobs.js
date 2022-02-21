'use strict';

// Given a Container of some description, you should be able to zip
// any number of sources in the Container.

const isIterable = item => typeof item[Symbol.iterator] === 'function' || typeof item['next'] === 'function';

class RangeStop {
  constructor(value, source = null) {
    this._source = source ?? [];
    this._value = value;
  }

  get value() {
    return this._source?.length ? this._source[this._value] : this._value;
  }

  getFromSource(index) {
    return this._source[index] ?? null;
  }
}

class RangeStep extends RangeStop {
  constructor(value, source = null) {
    super(value, source);
  }
}

class Range {
  constructor(...steps) {
    this.steps = [];
    this.position = 0;
    this.rangeDirection = 1; // Forward by default

    for (let index = 0; index < steps.length; index++) {
      this.steps.push(steps[index] instanceof RangeStop ? steps[index] : new RangeStop(steps[index]));
    }
  }

  *[Symbol.iterator]() {
    for (let rangeIndex = this.position; rangeIndex < this.steps.length; rangeIndex += this.rangeDirection) {
      const currentStep = this.steps[rangeIndex];
      const nextStep = this.steps[rangeIndex + 1] ?? null;

      const isCurrentStepExistent = currentStep instanceof RangeStop;
      const isNextStepExistent = nextStep instanceof RangeStop;
      const isRangeDerivable = currentStep instanceof RangeStep && nextStep instanceof RangeStep;
      const isCurrentStepSourceExistent = Boolean(currentStep?.source);
      const isCurrentNextSourceExistent = Boolean(nextStep?.source);
      const isSourceDistinct = currentStep?.source !== nextStep?.source;
      const isValueDistinct = currentStep?.value !== nextStep?.value

      // Determine approach
      if (!isRangeDerivable && isCurrentStepExistent) {
        yield currentStep.value;
      }

      if (isRangeDerivable && isValueDistinct) {
        const incrementDirection = Math.sign(nextStep?.value - currentStep?.value)
        for (let index = currentStep.value; incrementDirection == 1 ? index < nextStep.value : index > nextStep.value; index += incrementDirection) {
          yield currentStep?.source ? currentStep.getFromSource(index) : index;
        }
      }

      this.position += this.rangeDirection;
    }
  }
  
  getValue() {
    return [...this];
  }

  getBounds() {
    return [this.steps[0]?.value, this.steps[this.steps.length - 1]?.value];
  }
}

// Inclusive range.
class NumberRange extends Range {
  constructor(start, end) {
    super(new RangeStep(start), new RangeStep(end));

    this.rangeDirection = Math.sign(end - start);
    
    // Doesn't work anymore.
    // return new Proxy(this, {
    //   has(target, prop) {
    //     return prop >= target.start.value && prop <= target.end.value;
    //   },
    //   get(target, prop) {
    //     try {
    //       if (prop === 'length') return target.end.value - target.start.value;

    //       if (prop in target) return target[prop];

    //       const parsedProp = parseInt(prop, 10);
    //       if (!Number.isNaN(parsedProp)) {
    //         const result = parsedProp + target.start.value;
    //         if (result >= target.direction * target.end.value || result < target.direction * target.start.value) {
    //           return null;
    //         }
    //         return result;
    //       } else {
    //         throw new Error(`No case for prop named ${prop}. Throwing.`);
    //       }
    //     } catch (error) {
    //       console.error(error);
    //     }
    //   }
    // });
  }
}

class Container {
  constructor() {
    this.sources = [];
    this.value = null;
  }

  addSources(...sources) {
    this.sources.push(...sources.map(source => source instanceof Range || source instanceof RangeStop ? source : new RangeStop(0, [source])));
    return this;
  }
  
  addNumberRange(start, end) {
    this.sources.push(new NumberRange(start, end));
    return this;
  }

  zip() {
    // Zips longest. Pushes `null` if item doesn't exist.

    this.sources.forEach((source, index, arr) => {
    });
    
    let unfinishedSourceIndices = [];
    let largestSourceLength = 0;

    for (let index = 0; index < this.sources.length; index++) {
      if (isIterable(this.sources[index])) this.sources[index] = [...this.sources[index]];
      if (this.sources[index] instanceof RangeStop) this.sources[index] = this.sources[index].value;

      unfinishedSourceIndices.push(index);
      largestSourceLength = largestSourceLength < this.sources[index].length ? this.sources[index].length : largestSourceLength;
    }

    let zippedItems = [];
    const newValue = [];

    for (let index = 0; index < largestSourceLength; index++) {
      for (let sourceIndex = 0; sourceIndex < unfinishedSourceIndices.length; sourceIndex++) {
        let currentItem = null;
        let currentSourceNumber = unfinishedSourceIndices[sourceIndex];
        if (typeof currentSourceNumber === 'number') {
          if (isIterable(this.sources[currentSourceNumber])) {
            currentItem = this.sources[currentSourceNumber][index];
            if (this.sources[currentSourceNumber].length < largestSourceLength && index >= this.sources[currentSourceNumber].length) {
              unfinishedSourceIndices.splice(sourceIndex, 1, null);
            }
          } else {
            currentItem = this.sources[currentSourceNumber] ?? null;
            unfinishedSourceIndices.splice(sourceIndex, 1, null);
          }
        }

        zippedItems.push(currentItem ?? null);
      }

      newValue.push(zippedItems);
      zippedItems = [];
    }

    this.value = newValue;
    return this;
  }
}

const testCase1 = new NumberRange(1, 10);
console.log(testCase1.getBounds());
console.log([...testCase1]);
// console.assert(5 in testCase1, '5 isn't between 1 and 10?');
// console.assert(-1 in testCase1 === false, '-1 is between 1 and 10?');
// console.assert(-1 in new NumberRange(-1, 10), '-1 isn't between -1 and 10?');
// testCase1.forEach(console.log);

const testCase2 = new Container().addNumberRange(-10, -1).addNumberRange(1, 10).addNumberRange(11, 20).addNumberRange(21, 30).addSources(3612, 4323, '8742', 'test');
console.log(testCase2.zip().value);

const testCase3 = new NumberRange(-10, -1);
console.log([...testCase3]);
console.log(testCase3.getBounds());


const testString1 = 'This is a test'.split(/\s/g);
const testString2 = 'This is another test'.split(/\s/g);
const testCase4 = new Container().addSources(testString1, testString2).zip().value;
console.log(testCase4);
