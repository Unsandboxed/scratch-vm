function setup({
  TYPE_UNKNOWN,
  TYPE_STRING,
  TYPE_BOOLEAN,
  TYPE_NUMBER,
  TYPE_NUMBER_NAN,
  ConstantInput,
  // eslint-disable-next-line no-unused-vars
  TypedInput
}) {
    const Optimizing = new (function() {
    // Nullish NaN coalescing
    this.nnanCoalesce = (a, b) => (isNaN(a) ? b : a ?? b)
    this.stripParenths = str => {
        while(str.startsWith('(')) str = str.slice(1);
        while(str.endsWith(')')) str = str.slice(0, -1);
        return str;
    };
    this.tryType = (str, es) => {
        str = this.stripParenths(String(str).trim());
        if (str === '' && (es !== undefined)) return es;
        if (/^".+"$/.test(str)) return str.slice(1, -1);
        if (/^-0$/.test(str)) return -0;
        if (/^-?\d+(.\d+)?$/.test(str)) return Number(str);
        if (/^Infinity|-Infinity$/.test(str)) return str[0] === '-' ? -Infinity : Infinity;
        if (/^NaN$/.test(str)) return NaN;
        if (/^false|true$/.test(str)) return str == 'true';
        return undefined;
    };
    this.sIsNaN = n => String(NaN) === String(n) && isNaN(n);
    this.isColour = str => /^#[\da-f]{3}([\da-f]{3}([\da-f]{2})?)?$/gi.test(str);
    this.tryNumber = (a, b) => {
        if ((b !== undefined) && (a !== undefined)) {
            a = this.tryType(a?.constantValue ?? a, 0);
            if (typeof a !== 'number') return [NaN, NaN];
            b = this.tryType(b?.constantValue ?? b, 0);
            if (typeof b !== 'number') return [NaN, NaN];
            return [a, b];
        } else {
            a = this.tryType(a?.constantValue ?? a, 0);
            if (typeof a !== 'number') return NaN;
            return a;
        }
    };
    this.tryNumberNull = (a, b) => {
        if ((b !== undefined) && (a !== undefined)) {
            a = this.tryType(a?.constantValue ?? a, 0);
            if (this.sIsNaN(a)) return [NaN, NaN];
            if (typeof a !== 'number') return [null, null];
            b = this.tryType(b?.constantValue ?? b, 0);
            if (this.sIsNaN(b)) return [NaN, NaN];
            if (typeof b !== 'number') return [null, null];
            return [a, b];
        } else {
            a = this.tryType(a?.constantValue ?? a, 0);
            if (this.sIsNaN(a)) return NaN;
            if (typeof a !== 'number') return null;
            return a;
        }
    };
    this.getType = function(n) {
        if (typeof n === 'string') return TYPE_STRING;
        if (typeof n === 'number') return sIsNaN(n) ? TYPE_NUMBER_NAN : TYPE_NUMBER;
        if (typeof n === 'boolean') return TYPE_BOOLEAN;
        return TYPE_UNKNOWN;
    };
    this.tryConstant = (n) => {
      if (n instanceof ConstantInput) return n;
      if (n.kind === 'constant') return new ConstantInput(n.value);
      let val = false, temp = null;
      switch(n.kind) {
        case 'op.join':
          temp = this.attempt(n.left, n.right, 0);
          if (temp) val = new ConstantInput(temp);
          break;
        case 'op.add':
          temp = this.attempt(n.left, n.right, 1);
          if (temp) val = new ConstantInput(temp);
          break;
        case 'op.subtract':
          temp = this.attempt(n.left, n.right, 2);
          if (temp) val = new ConstantInput(temp);
          break;
        case 'op.multiply':
          temp = this.attempt(n.left, n.right, 3);
          if (temp) val = new ConstantInput(temp);
          break;
        case 'op.divide':
          temp = this.attempt(n.left, n.right, 4);
          if (temp) val = new ConstantInput(temp);
          break;
        case 'op.exponent':
          temp = this.attempt(n.left, n.right, 5);
          if (temp) val = new ConstantInput(temp);
          break;
        default: console.log(n.kind);
      }
      return val;
    };
    this.attempt = (a, b, op) => {
        a = this.tryConstant(a);
        if (!a) return undefined;
        b = this.tryConstant(b);
        if (!b) return undefined;
        switch(op) {
            case 0: {
                return `${a.constantValue}${b.constantValue}`;
            };
            case 1: {
                [a, b] = this.tryNumber(a, b);
                if (isNaN(a) || isNaN(b)) return NaN;
                return a + b;
            };
            case 2: {
                [a, b] = this.tryNumber(a, b);
                if (isNaN(a) || isNaN(b)) return NaN;
                return a - b;
            };
            case 3: {
                [a, b] = this.tryNumber(a, b);
                if (isNaN(a) || isNaN(b)) return NaN;
                return a * b;
            };
            case 4: {
                [a, b] = this.tryNumber(a, b);
                if (isNaN(a) || isNaN(b)) return NaN;
                return a / b;
            };
            case 5: {
                [a, b] = this.tryNumber(a, b);
                if (isNaN(a) || isNaN(b)) return NaN;
                return a ** b;
            };
          }
      };
  });
  return Optimizing;
}

module.exports = setup;
