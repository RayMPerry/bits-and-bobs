'use strict';

// Given a Container of some description, you should be able to zip
// any number of sources in the Container.

const RangeDirection = {
  FORWARD: 1,
  BACKWARDS: -1
}

const isIterable = item => typeof item[Symbol.iterator] === 'function' || typeof item['next'] === 'function';

class RangeStop {
  constructor(value, source = null) {
    this._source = source ?? null;
    this._value = value;
  }

  get value() {
    return this.getFromSource(this._value) ?? this._value;
  }

  getFromSource(index) {
    if (this._source) {
      if (this._source instanceof Range || Array.isArray(this._source) || typeof this._source === 'object') {
        return this._source[index];
      } 
    }
    return null;
  }
}

class RangeStep extends RangeStop {
  constructor(value, source = null) {
    super(value, source);
  }
}

// TODO: Expand the range interface.
class Range {
  constructor(options) {
    const { direction = RangeDirection.FORWARD, steps = [] } = options ?? {};
    
    this.steps = [];
    this.direction = this.direction || RangeDirection.FORWARD;
    this.isForwardRange = this.direction === RangeDirection.FORWARD;

    for (let index = 0; index < steps.length; index++) {
      this.steps.push(steps[index] instanceof RangeStop ? steps[index] : new RangeStop(0, steps[index]));
    }

    this.position = this.isForwardRange ? 0 : this.steps.length - 1;

    return new Proxy(this, {
      get(target, prop) {
        if (prop in target || typeof prop !== 'string' || Number.isNaN(Number(prop))) return target[prop];
        const steps = [target.steps[0], new RangeStep(Number(prop) + target.direction, target.steps[0]._source)];
        return [...new Range({ direction: target.direction, steps })].pop();
      }
    });
  }

  addStep(value, source = null) {
    this.steps.push(new RangeStep(value, source));
    return this;
  }

  addStop(value, source = null) {
    this.steps.push(new RangeStop(value, source));
    return this;
  }
  
  *[Symbol.iterator]() {
    for (; this.isForwardRange ? this.position < this.steps.length : this.position >= 0; this.position += this.direction) {
      const currentStep = this.steps[this.position];
      const nextStep = this.steps[this.position + this.direction] ?? null;

      const isCurrentStepExistent = currentStep instanceof RangeStop;
      const isNextStepExistent = nextStep instanceof RangeStop;
      const isRangeDerivable = currentStep instanceof RangeStep && nextStep instanceof RangeStep;
      const isCurrentStepSourceExistent = Boolean(currentStep?.source);
      const isNextStepSourceExistent = Boolean(nextStep?.source);
      const isSourceDistinct = currentStep?.source !== nextStep?.source;
      const isValueDistinct = currentStep?.value !== nextStep?.value;
      
      if (!isCurrentStepExistent && !isNextStepExistent) {
        yield null;
        break;
      }
      
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
    }
  }
  
  getValue() {
    return [...this];
  }

  getBounds() {
    return [this.steps[0]?.value, this.steps[this.steps.length - 1]?.value];
  }
}

class NumberRange extends Range {
  constructor(start, end) {
    const direction = Math.sign(end - start);
    const steps = [new RangeStep(start), new RangeStep(end)];
    super({ direction, steps });
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

console.log('Test Case 1');
console.log('===========');
const testCase1 = new NumberRange(1, 10);
console.log(testCase1.getBounds());
console.log([...testCase1]);

console.log('Test Case 2');
console.log('===========');
const testCase2 = new Container()
      .addNumberRange(-10, -1)
      .addNumberRange(1, 10)
      .addNumberRange(11, 20)
      .addNumberRange(21, 30)
      .addSources(3612, 4323, '874342', 'test');
console.log(testCase2.zip().value);

console.log('Test Case 3');
console.log('===========');
const testCase3 = new NumberRange(-10, -1);
console.log([...testCase3]);
console.log(testCase3.getBounds());

console.log('Test Case 4');
console.log('===========');
const testString1 = 'This is a test'.split(/\s/g);
const testString2 = 'This is another test'.split(/\s/g);
const testCase4 = new Container()
      .addSources(testString1, testString2)
      .zip()
      .value;
console.log(testCase4);

console.log('Test Case 5');
console.log('===========');
const testCase5 = new Range()
      .addStep(1)
      .addStep(10)
      .addStop(-17)
      .addStop(2, [0, 1, 34231])
      .addStop(2, new NumberRange(1, 10))
      .addStep(21)
      .addStep(30);
console.log(testCase5);
console.log(testCase5.getBounds());
console.log(testCase5.getValue());

console.log('Test Case 6');
console.log('===========');
const testCase6 = new Container()
      .addNumberRange(1, 100)
      .addNumberRange(100, 1)
      .zip();
console.log(testCase6);
