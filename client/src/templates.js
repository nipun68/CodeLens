export const BUILTIN_TEMPLATES = [
  {
    id: 'binary-search',
    title: 'Binary Search',
    complexity: 'O(log n)',
    algorithm: 'binary-search',
    code: `let arr = [10, 20, 30, 40, 50];
let target = 40;
let low = 0;
let high = arr.length - 1;

while (low <= high) {
  let mid = Math.floor((low + high) / 2);
  if (arr[mid] === target) {
    console.log("Found at", mid);
    break;
  }
  arr[mid] < target ? low = mid + 1 : high = mid - 1;
}`,
    previewCode: `let arr = [10, 20, 30, 40, 50];
let target = 40;
let low = 0;
let high = arr.length - 1;

while (low <= high) {`
  },
  {
    id: 'bubble-sort',
    title: 'Bubble Sort',
    complexity: 'O(n²)',
    algorithm: 'bubble-sort',
    code: `let arr = [5, 2, 9, 1, 5, 6];
let n = arr.length;

for (let i = 0; i < n - 1; i++) {
  for (let j = 0; j < n - 1 - i; j++) {
    if (arr[j] > arr[j + 1]) {
      let temp = arr[j];
      arr[j] = arr[j + 1];
      arr[j + 1] = temp;
    }
  }
}
console.log("Sorted:", arr);`,
    previewCode: `let arr = [5, 2, 9, 1, 5, 6];
let n = arr.length;

for (let i = 0; i < n - 1; i++) {
  for (let j = 0; j < n - 1 - i; j++) {`
  },
  {
    id: 'factorial',
    title: 'Factorial (Recursion)',
    complexity: 'O(n)',
    algorithm: 'factorial',
    code: `function factorial(n) {
  if (n <= 1) {
    return 1;
  }
  return n * factorial(n - 1);
}

let result = factorial(5);
console.log("5! =", result);`,
    previewCode: `function factorial(n) {
  if (n <= 1) {
    return 1;
  }
  return n * factorial(n - 1);
}`
  },
  {
    id: 'array-sum',
    title: 'Array Sum',
    complexity: 'O(n)',
    algorithm: 'array-sum',
    code: `let nums = [1, 2, 3, 4, 5];
let sum = 0;

for (let i = 0; i < nums.length; i++) {
  sum = sum + nums[i];
}
console.log("Sum:", sum);`,
    previewCode: `let nums = [1, 2, 3, 4, 5];
let sum = 0;

for (let i = 0; i < nums.length; i++) {
  sum = sum + nums[i];
}`
  },
  {
    id: 'bug-demo',
    title: 'Bug Demo (Error)',
    complexity: 'Debug',
    badgeClass: 'badge-debug',
    algorithm: 'bug-demo',
    code: `let arr = [1, 2, 3];

for (let i = 0; i <= arr.length; i++) {
  console.log(arr[i + 1]);
}`,
    previewCode: `let arr = [1, 2, 3];

for (let i = 0; i <= arr.length; i++) {
  console.log(arr[i + 1]);
}...`
  },
  {
    id: 'linear-search',
    title: 'Linear Search',
    complexity: 'O(n)',
    algorithm: 'linear-search',
    code: `let arr = [10, 20, 30, 40, 50];
let target = 30;
let found = -1;

for (let i = 0; i < arr.length; i++) {
  if (arr[i] === target) {
    found = i;
    console.log("Found at index:", i);
    break;
  }
}`,
    previewCode: `let arr = [10, 20, 30, 40, 50];
let target = 30;
let found = -1;

for (let i = 0; i < arr.length; i++) {`
  },
  {
    id: 'object-demo',
    title: 'Object Demo',
    complexity: 'O(1)',
    algorithm: 'object-demo',
    code: `let person = {
  name: "Alice",
  age: 25,
  city: "NYC"
};
console.log("User:", person.name, "in", person.city);`,
    previewCode: `let person = {
  name: "Alice",
  age: 25,
  city: "NYC"
};`
  },
  {
    id: 'fibonacci',
    title: 'Fibonacci Sequence',
    complexity: 'O(n)',
    algorithm: 'fibonacci',
    code: `let n = 10;
let fib = [0, 1];

for (let i = 2; i < n; i++) {
  fib[i] = fib[i - 1] + fib[i - 2];
}
console.log("Fibonacci:", fib);`,
    previewCode: `let n = 10;
let fib = [0, 1];

for (let i = 2; i < n; i++) {
  fib[i] = fib[i - 1] + fib[i - 2];
}`
  },
  {
    id: 'selection-sort',
    title: 'Selection Sort',
    complexity: 'O(n²)',
    algorithm: 'selection-sort',
    code: `let arr = [64, 25, 12, 22, 11];
let n = arr.length;

for (let i = 0; i < n - 1; i++) {
  let minIdx = i;
  for (let j = i + 1; j < n; j++) {
    if (arr[j] < arr[minIdx]) {
      minIdx = j;
    }
  }
  let temp = arr[minIdx];
  arr[minIdx] = arr[i];
  arr[i] = temp;
}
console.log("Sorted:", arr);`,
    previewCode: `let arr = [64, 25, 12, 22, 11];
let n = arr.length;

for (let i = 0; i < n - 1; i++) {
  let minIdx = i;`
  },
  {
    id: 'insertion-sort',
    title: 'Insertion Sort',
    complexity: 'O(n²)',
    algorithm: 'insertion-sort',
    code: `let arr = [12, 11, 13, 5, 6];
let n = arr.length;

for (let i = 1; i < n; i++) {
  let key = arr[i];
  let j = i - 1;
  while (j >= 0 && arr[j] > key) {
    arr[j + 1] = arr[j];
    j = j - 1;
  }
  arr[j + 1] = key;
}
console.log("Sorted:", arr);`,
    previewCode: `let arr = [12, 11, 13, 5, 6];
let n = arr.length;

for (let i = 1; i < n; i++) {
  let key = arr[i];
  let j = i - 1;`
  }
];
