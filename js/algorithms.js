const Algorithms = (() => {

  function binarySearch(arr, target) {
    const steps = [];
    const a = [...arr];
    let low = 0, high = a.length - 1;
    steps.push({ array: [...a], low, high, mid: null, note: `Initial: target = ${target}`, found: -1, comparisons: 0 });

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const comparisons = (steps.at(-1).comparisons || 0) + 1;
      steps.push({ array: [...a], low, high, mid, note: `mid=${mid} → a[${mid}]=${a[mid]}`, found: -1, comparisons });

      if (a[mid] === target) {
        steps.push({ array: [...a], low, high, mid, note: `Found ${target} at index ${mid}! ✓`, found: mid, comparisons, done: true });
        return steps;
      }
      if (a[mid] < target) { low = mid + 1; }
      else { high = mid - 1; }
    }
    steps.push({ array: [...a], low, high, mid: null, note: `${target} not found in array`, found: -1, comparisons: steps.at(-1).comparisons });
    return steps;
  }

  function linearSearch(arr, target) {
    const steps = [];
    const a = [...arr];
    for (let i = 0; i < a.length; i++) {
      steps.push({ array: [...a], i, note: `Check a[${i}]=${a[i]} vs ${target}`, found: -1, comparisons: i + 1 });
      if (a[i] === target) {
        steps.push({ array: [...a], i, found: i, note: `Found ${target} at index ${i}! ✓`, comparisons: i + 1, done: true });
        return steps;
      }
    }
    steps.push({ array: [...a], i: null, note: `${target} not found`, found: -1, comparisons: a.length });
    return steps;
  }

  function jumpSearch(arr, target) {
    const steps = [];
    const a = [...arr];
    const n = a.length;
    let step = Math.max(1, Math.floor(Math.sqrt(n)));
    let prev = 0;
    let comparisons = 0;

    steps.push({ array: [...a], low: 0, high: n - 1, note: `Jump Search: block step size m = √${n} ≈ ${step}`, comparisons });

    while (a[Math.min(step, n) - 1] < target) {
      comparisons++;
      const currentBound = Math.min(step, n) - 1;
      steps.push({ array: [...a], low: prev, high: currentBound, mid: currentBound, note: `Jump to index ${currentBound} (value ${a[currentBound]}) < ${target}`, comparisons });
      prev = step;
      step += Math.max(1, Math.floor(Math.sqrt(n)));
      if (prev >= n) {
        steps.push({ array: [...a], found: -1, note: `${target} not found (exceeded bounds)`, comparisons });
        return steps;
      }
    }

    steps.push({ array: [...a], low: prev, high: Math.min(step, n) - 1, note: `Target lies in block [${prev}..${Math.min(step, n) - 1}]. Linear searching...`, comparisons });

    while (a[prev] < target) {
      comparisons++;
      steps.push({ array: [...a], low: prev, high: Math.min(step, n) - 1, mid: prev, note: `Check a[${prev}]=${a[prev]} < ${target}`, comparisons });
      prev++;
      if (prev === Math.min(step, n)) {
        steps.push({ array: [...a], found: -1, note: `${target} not found in block`, comparisons });
        return steps;
      }
    }

    comparisons++;
    if (a[prev] === target) {
      steps.push({ array: [...a], found: prev, mid: prev, note: `Found ${target} at index ${prev}! ✓`, comparisons, done: true });
      return steps;
    }

    steps.push({ array: [...a], found: -1, note: `${target} not found in array`, comparisons });
    return steps;
  }

  function exponentialSearch(arr, target) {
    const steps = [];
    const a = [...arr];
    const n = a.length;
    let comparisons = 0;

    steps.push({ array: [...a], low: 0, high: n - 1, note: `Exponential Search: target = ${target}`, comparisons });

    if (a[0] === target) {
      steps.push({ array: [...a], found: 0, mid: 0, note: `Found ${target} at index 0! ✓`, comparisons: 1, done: true });
      return steps;
    }

    let i = 1;
    while (i < n && a[i] <= target) {
      comparisons++;
      steps.push({ array: [...a], low: Math.floor(i / 2), high: Math.min(i, n - 1), mid: i, note: `Check bound a[${i}]=${a[i]} <= ${target}, doubling search range to i=${i * 2}`, comparisons });
      if (a[i] === target) {
        steps.push({ array: [...a], found: i, mid: i, note: `Found ${target} at index ${i}! ✓`, comparisons, done: true });
        return steps;
      }
      i = i * 2;
    }

    let low = Math.floor(i / 2);
    let high = Math.min(i, n - 1);
    steps.push({ array: [...a], low, high, note: `Binary search within bounded range [${low}..${high}]`, comparisons });

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      comparisons++;
      steps.push({ array: [...a], low, high, mid, note: `Binary search: mid=${mid} (a[${mid}]=${a[mid]})`, comparisons });
      if (a[mid] === target) {
        steps.push({ array: [...a], found: mid, mid, note: `Found ${target} at index ${mid}! ✓`, comparisons, done: true });
        return steps;
      }
      if (a[mid] < target) low = mid + 1;
      else high = mid - 1;
    }

    steps.push({ array: [...a], found: -1, note: `${target} not found`, comparisons });
    return steps;
  }

  function bubbleSort(arr) {
    const a = [...arr]; const steps = []; let passes = 0;
    steps.push({ array: [...a], i: null, j: null, note: 'Start Bubble Sort', swapped: false, passes });
    for (let i = 0; i < a.length - 1; i++) {
      for (let j = 0; j < a.length - 1 - i; j++) {
        steps.push({ array: [...a], i, j, note: `Compare a[${j}]=${a[j]} & a[${j + 1}]=${a[j + 1]}`, swapped: false, passes });
        if (a[j] > a[j + 1]) {
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          steps.push({ array: [...a], i, j, note: `Swap → ${a[j]} ↔ ${a[j + 1]}`, swapped: true, passes });
        }
      }
      passes++;
    }
    steps.push({ array: [...a], i: null, j: null, note: 'Sorted ✓', swapped: false, passes, done: true });
    return steps;
  }

  function selectionSort(arr) {
    const a = [...arr]; const steps = []; let comparisons = 0;
    steps.push({ array: [...a], i: null, j: null, minIdx: null, note: 'Start Selection Sort', comparisons });
    for (let i = 0; i < a.length - 1; i++) {
      let minIdx = i;
      for (let j = i + 1; j < a.length; j++) {
        comparisons++;
        steps.push({ array: [...a], i, j, minIdx, note: `Min so far: a[${minIdx}]=${a[minIdx]} vs a[${j}]=${a[j]}`, comparisons });
        if (a[j] < a[minIdx]) minIdx = j;
      }
      if (minIdx !== i) {
        [a[i], a[minIdx]] = [a[minIdx], a[i]];
        steps.push({ array: [...a], i, j: null, minIdx, note: `Swap a[${i}] ↔ a[${minIdx}]`, comparisons, swapped: true });
      }
    }
    steps.push({ array: [...a], i: null, j: null, minIdx: null, note: 'Sorted ✓', comparisons, done: true });
    return steps;
  }

  function insertionSort(arr) {
    const a = [...arr]; const steps = []; let comparisons = 0;
    steps.push({ array: [...a], i: null, j: null, note: 'Start Insertion Sort', comparisons });
    for (let i = 1; i < a.length; i++) {
      let key = a[i], j = i - 1;
      steps.push({ array: [...a], i, j, note: `Pick key = ${key}`, comparisons });
      while (j >= 0 && a[j] > key) {
        comparisons++;
        a[j + 1] = a[j];
        steps.push({ array: [...a], i, j, note: `Shift a[${j}] → a[${j + 1}]`, comparisons, swapped: true });
        j--;
      }
      a[j + 1] = key;
      steps.push({ array: [...a], i, j, note: `Insert key=${key} at index ${j + 1}`, comparisons });
    }
    steps.push({ array: [...a], i: null, j: null, note: 'Sorted ✓', comparisons, done: true });
    return steps;
  }

  function mergeSort(arr) {
    const a = [...arr];
    const steps = [];
    let comparisons = 0;

    steps.push({ array: [...a], note: 'Start Merge Sort', comparisons });

    function merge(l, m, r) {
      const left = a.slice(l, m + 1);
      const right = a.slice(m + 1, r + 1);
      let i = 0, j = 0, k = l;

      steps.push({ array: [...a], low: l, high: r, window: Array.from({ length: r - l + 1 }, (_, idx) => l + idx), note: `Merging left [${left}] & right [${right}]`, comparisons });

      while (i < left.length && j < right.length) {
        comparisons++;
        if (left[i] <= right[j]) {
          a[k] = left[i];
          i++;
        } else {
          a[k] = right[j];
          j++;
        }
        steps.push({ array: [...a], low: l, high: r, mid: k, swapped: true, note: `Placed ${a[k]} at index ${k}`, comparisons });
        k++;
      }

      while (i < left.length) {
        a[k] = left[i];
        steps.push({ array: [...a], low: l, high: r, mid: k, note: `Placed remainder ${a[k]} at index ${k}`, comparisons });
        i++; k++;
      }

      while (j < right.length) {
        a[k] = right[j];
        steps.push({ array: [...a], low: l, high: r, mid: k, note: `Placed remainder ${a[k]} at index ${k}`, comparisons });
        j++; k++;
      }
    }

    function sort(l, r) {
      if (l >= r) return;
      const m = Math.floor((l + r) / 2);
      steps.push({ array: [...a], low: l, high: r, mid: m, note: `Divide into [${l}..${m}] and [${m + 1}..${r}]`, comparisons });
      sort(l, m);
      sort(m + 1, r);
      merge(l, m, r);
    }

    sort(0, a.length - 1);
    steps.push({ array: [...a], done: true, note: 'Sorted ✓', comparisons });
    return steps;
  }

  function quickSort(arr) {
    const a = [...arr];
    const steps = [];
    let comparisons = 0;

    steps.push({ array: [...a], note: 'Start Quick Sort', comparisons });

    function partition(low, high) {
      const pivot = a[high];
      let i = low - 1;
      steps.push({ array: [...a], low, high, pivot: high, note: `Partitioning with pivot = a[${high}] = ${pivot}`, comparisons });

      for (let j = low; j < high; j++) {
        comparisons++;
        steps.push({ array: [...a], low, high, i: Math.max(i, 0), j, pivot: high, note: `Compare a[${j}]=${a[j]} vs pivot=${pivot}`, comparisons });
        if (a[j] < pivot) {
          i++;
          [a[i], a[j]] = [a[j], a[i]];
          steps.push({ array: [...a], low, high, i, j, pivot: high, swapped: true, note: `Swap smaller a[${i}] ↔ a[${j}]`, comparisons });
        }
      }
      [a[i + 1], a[high]] = [a[high], a[i + 1]];
      steps.push({ array: [...a], low, high, mid: i + 1, swapped: true, note: `Pivot ${pivot} placed at final index ${i + 1}`, comparisons });
      return i + 1;
    }

    function sort(low, high) {
      if (low < high) {
        const pi = partition(low, high);
        sort(low, pi - 1);
        sort(pi + 1, high);
      }
    }

    sort(0, a.length - 1);
    steps.push({ array: [...a], done: true, note: 'Sorted ✓', comparisons });
    return steps;
  }

  function heapSort(arr) {
    const a = [...arr];
    const steps = [];
    const n = a.length;
    let comparisons = 0;

    steps.push({ array: [...a], note: 'Start Heap Sort (Build Max-Heap)', comparisons });

    function heapify(len, i) {
      let largest = i;
      let left = 2 * i + 1;
      let right = 2 * i + 2;

      if (left < len) {
        comparisons++;
        if (a[left] > a[largest]) largest = left;
      }
      if (right < len) {
        comparisons++;
        if (a[right] > a[largest]) largest = right;
      }

      if (largest !== i) {
        [a[i], a[largest]] = [a[largest], a[i]];
        steps.push({ array: [...a], i, j: largest, swapped: true, note: `Heapify: swap parent a[${i}] ↔ child a[${largest}]`, comparisons });
        heapify(len, largest);
      }
    }

    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      heapify(n, i);
    }
    steps.push({ array: [...a], note: 'Max-Heap constructed! Extracting root...', comparisons });

    for (let i = n - 1; i > 0; i--) {
      [a[0], a[i]] = [a[i], a[0]];
      steps.push({ array: [...a], i: 0, j: i, swapped: true, note: `Extract max ${a[i]} to sorted position ${i}`, comparisons });
      heapify(i, 0);
    }

    steps.push({ array: [...a], done: true, note: 'Sorted ✓', comparisons });
    return steps;
  }

  function twoSum(arr, target) {
    const steps = [];
    const a = [...arr].sort((x, y) => x - y);
    let low = 0, high = a.length - 1;
    let comparisons = 0;
    const tgt = parseInt(target) || 50;

    steps.push({ array: [...a], low, high, note: `Two Pointer Search on sorted array. Target sum = ${tgt}`, comparisons });

    while (low < high) {
      const sum = a[low] + a[high];
      comparisons++;
      steps.push({ array: [...a], low, high, note: `Check a[${low}] (${a[low]}) + a[${high}] (${a[high]}) = ${sum} vs ${tgt}`, comparisons });

      if (sum === tgt) {
        steps.push({ array: [...a], low, high, foundIndices: [low, high], note: `Pair Found! a[${low}]=${a[low]} + a[${high}]=${a[high]} = ${tgt} ✓`, comparisons, done: true });
        return steps;
      }
      if (sum < tgt) {
        low++;
      } else {
        high--;
      }
    }

    steps.push({ array: [...a], found: -1, note: `No pair summing to ${tgt} found`, comparisons });
    return steps;
  }

  function kadane(arr) {
    const steps = [];
    const a = (Array.isArray(arr) && arr.length > 0) ? [...arr] : [-2, 1, -3, 4, -1, 2, 1, -5, 4];
    let maxSoFar = a[0];
    let currMax = a[0];
    let start = 0, end = 0, s = 0;

    steps.push({ array: [...a], i: 0, window: [0], note: `Start Kadane: currMax = ${currMax}, maxSoFar = ${maxSoFar}`, comparisons: 0 });

    for (let i = 1; i < a.length; i++) {
      if (a[i] > currMax + a[i]) {
        currMax = a[i];
        s = i;
      } else {
        currMax = currMax + a[i];
      }

      if (currMax > maxSoFar) {
        maxSoFar = currMax;
        start = s;
        end = i;
      }

      const activeWindow = Array.from({ length: i - s + 1 }, (_, idx) => s + idx);
      steps.push({
        array: [...a],
        i,
        window: activeWindow,
        note: `Index ${i} (${a[i]}): currMax = ${currMax}, overall maxSoFar = ${maxSoFar}`,
        comparisons: i
      });
    }

    const bestWindow = Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
    steps.push({
      array: [...a],
      foundIndices: bestWindow,
      done: true,
      note: `Maximum Subarray Sum = ${maxSoFar} spanning indices [${start}..${end}] ✓`,
      comparisons: a.length - 1
    });

    return steps;
  }

  function dutchFlag(arr) {
    const steps = [];
    const a = (Array.isArray(arr) && arr.length > 0) ? [...arr] : [2, 0, 2, 1, 1, 0, 2, 1, 0];
    let low = 0, mid = 0, high = a.length - 1;
    let comparisons = 0;

    steps.push({ array: [...a], low, mid, high, note: 'Start 3-Way Dutch National Flag Partitioning (0s, 1s, 2s)', comparisons });

    while (mid <= high) {
      comparisons++;
      if (a[mid] === 0) {
        [a[low], a[mid]] = [a[mid], a[low]];
        steps.push({ array: [...a], low, mid, high, swapped: true, swappedIndices: [low, mid], note: `a[${mid}]=0: swap with low (${low}), advance low & mid`, comparisons });
        low++;
        mid++;
      } else if (a[mid] === 1) {
        steps.push({ array: [...a], low, mid, high, note: `a[${mid}]=1: element in place, advance mid`, comparisons });
        mid++;
      } else {
        [a[mid], a[high]] = [a[high], a[mid]];
        steps.push({ array: [...a], low, mid, high, swapped: true, swappedIndices: [mid, high], note: `a[${mid}]=2: swap with high (${high}), decrement high`, comparisons });
        high--;
      }
    }

    steps.push({ array: [...a], done: true, note: 'Sorted (0s, 1s, 2s Partition Complete) ✓', comparisons });
    return steps;
  }

  function slidingWindow(arr, target) {
    const steps = [];
    const a = (Array.isArray(arr) && arr.length > 0) ? [...arr] : [2, 1, 5, 1, 3, 2, 8, 4, 6];
    const k = Math.min(Math.max(parseInt(target) || 3, 1), a.length);
    let windowSum = 0;
    let comparisons = 0;

    for (let i = 0; i < k; i++) {
      windowSum += a[i];
    }
    let maxSum = windowSum;
    let bestStart = 0;

    steps.push({
      array: [...a],
      window: Array.from({ length: k }, (_, idx) => idx),
      note: `Initial window of size k=${k} [0..${k - 1}] sum = ${windowSum}`,
      comparisons: k
    });

    for (let i = k; i < a.length; i++) {
      comparisons++;
      windowSum += a[i] - a[i - k];
      const startIdx = i - k + 1;
      const curWindow = Array.from({ length: k }, (_, idx) => startIdx + idx);

      if (windowSum > maxSum) {
        maxSum = windowSum;
        bestStart = startIdx;
      }

      steps.push({
        array: [...a],
        window: curWindow,
        note: `Slide window to [${startIdx}..${i}]: sum = ${windowSum} (Max so far: ${maxSum})`,
        comparisons
      });
    }

    const bestWindow = Array.from({ length: k }, (_, idx) => bestStart + idx);
    steps.push({
      array: [...a],
      foundIndices: bestWindow,
      done: true,
      note: `Maximum sum of ${k} consecutive elements is ${maxSum} at [${bestStart}..${bestStart + k - 1}] ✓`,
      comparisons
    });

    return steps;
  }

  function fibonacci(arr, target) {
    const steps = [];
    const n = Math.min(Math.max(parseInt(target) || (Array.isArray(arr) && arr.length > 0 ? arr.length : 8), 2), 16);
    const dp = [0, 1];

    steps.push({ array: [0, 1], low: 0, high: 1, note: `Base cases: F(0)=0, F(1)=1`, comparisons: 2 });

    for (let i = 2; i <= n; i++) {
      const val = dp[i - 1] + dp[i - 2];
      dp.push(val);
      steps.push({
        array: [...dp],
        low: i - 2,
        high: i - 1,
        mid: i,
        note: `Compute F(${i}) = F(${i - 1}) [${dp[i - 1]}] + F(${i - 2}) [${dp[i - 2]}] = ${val}`,
        comparisons: i + 1
      });
    }

    steps.push({ array: [...dp], done: true, note: `Fibonacci sequence up to N=${n} computed ✓`, comparisons: n + 1 });
    return steps;
  }

  function countPrimes(arr, target) {
    const steps = [];
    const n = Math.min(Math.max(parseInt(target) || 25, 5), 40);
    const isPrime = new Array(n + 1).fill(true);
    isPrime[0] = isPrime[1] = false;

    steps.push({
      array: Array.from({ length: n + 1 }, (_, i) => i),
      note: `Sieve of Eratosthenes up to N = ${n}`,
      comparisons: 0
    });

    for (let p = 2; p * p <= n; p++) {
      if (isPrime[p]) {
        steps.push({
          array: Array.from({ length: n + 1 }, (_, i) => isPrime[i] ? i : '✕'),
          mid: p,
          note: `Prime found: ${p}. Striking out multiples of ${p}...`,
          comparisons: p
        });

        for (let i = p * p; i <= n; i += p) {
          isPrime[i] = false;
          steps.push({
            array: Array.from({ length: n + 1 }, (_, idx) => isPrime[idx] ? idx : '✕'),
            j: i,
            swapped: true,
            note: `Mark ${i} as composite (${p} × ${i / p})`,
            comparisons: i
          });
        }
      }
    }

    const primesOnly = [];
    for (let i = 2; i <= n; i++) {
      if (isPrime[i]) primesOnly.push(i);
    }

    steps.push({
      array: primesOnly,
      done: true,
      note: `Primes up to ${n}: [${primesOnly.join(', ')}] (${primesOnly.length} primes found) ✓`,
      comparisons: n
    });

    return steps;
  }

  const GENERATORS = {
    binarySearch,
    linearSearch,
    jumpSearch,
    exponentialSearch,
    bubbleSort,
    selectionSort,
    insertionSort,
    mergeSort,
    quickSort,
    heapSort,
    twoSum,
    kadane,
    dutchFlag,
    slidingWindow,
    fibonacci,
    countPrimes
  };

  const META = {
    binarySearch:      { name: 'Binary Search',            type: 'search',  time: 'O(log n)',       space: 'O(1)',      desc: 'Divide & conquer on sorted array' },
    linearSearch:      { name: 'Linear Search',            type: 'search',  time: 'O(n)',           space: 'O(1)',      desc: 'Sequential scan of array elements' },
    jumpSearch:        { name: 'Jump Search',              type: 'search',  time: 'O(√n)',          space: 'O(1)',      desc: 'Block-jumping search on sorted array' },
    exponentialSearch: { name: 'Exponential Search',       type: 'search',  time: 'O(log n)',       space: 'O(1)',      desc: 'Range-doubling search on sorted array' },
    bubbleSort:        { name: 'Bubble Sort',              type: 'sort',    time: 'O(n²)',          space: 'O(1)',      desc: 'Adjacent swaps bubble max element to end' },
    selectionSort:     { name: 'Selection Sort',           type: 'sort',    time: 'O(n²)',          space: 'O(1)',      desc: 'Find minimum element and place at front' },
    insertionSort:     { name: 'Insertion Sort',           type: 'sort',    time: 'O(n²)',          space: 'O(1)',      desc: 'Build sorted prefix incrementally' },
    mergeSort:         { name: 'Merge Sort',               type: 'sort',    time: 'O(n log n)',     space: 'O(n)',      desc: 'Divide, conquer & merge sorted halves' },
    quickSort:         { name: 'Quick Sort',               type: 'sort',    time: 'O(n log n)',     space: 'O(log n)',  desc: 'Partition around pivot element and recurse' },
    heapSort:          { name: 'Heap Sort',                type: 'sort',    time: 'O(n log n)',     space: 'O(1)',      desc: 'Max-heap binary tree selection sort' },
    twoSum:            { name: 'Two Pointer Search',       type: 'pointer', time: 'O(n)',           space: 'O(1)',      desc: 'Converging pointers for target pair sum' },
    kadane:            { name: 'Kadane\'s Max Subarray',   type: 'array',   time: 'O(n)',           space: 'O(1)',      desc: 'Maximum sum contiguous subarray search' },
    dutchFlag:         { name: 'Dutch National Flag',      type: 'sort',    time: 'O(n)',           space: 'O(1)',      desc: 'Single-pass 3-way partition for 0s, 1s, 2s' },
    slidingWindow:     { name: 'Sliding Window Max',       type: 'array',   time: 'O(n)',           space: 'O(1)',      desc: 'Fixed-size window continuous sum optimizer' },
    fibonacci:         { name: 'Fibonacci Sequence (DP)',  type: 'dp',      time: 'O(n)',           space: 'O(n)',      desc: 'Tabulation dynamic programming sequence' },
    countPrimes:       { name: 'Sieve of Eratosthenes',    type: 'math',    time: 'O(n log log n)', space: 'O(n)',      desc: 'Prime number filtration and generation' }
  };

  function generate(type, arr, target) {
    const gen = GENERATORS[type];
    if (!gen) throw new Error('Unknown algorithm: ' + type);
    return gen(arr, target);
  }

  return { generate, META };
})();