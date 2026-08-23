const Algorithms = (() => {

  function binarySearch(arr, target) {
    const steps = [];
    const a = [...arr];
    let low = 0, high = a.length - 1;
    steps.push({ array:[...a], low, high, mid:null, note:`Initial: target=${target}`, found:-1, comparisons:0 });

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const comparisons = (steps.at(-1).comparisons || 0) + 1;
      steps.push({ array:[...a], low, high, mid, note:`mid=${mid} → a[${mid}]=${a[mid]}`, found:-1, comparisons });

      if (a[mid] === target) {
        steps.push({ array:[...a], low, high, mid, note:`Found ${target} at index ${mid}`, found:mid, comparisons });
        return steps;
      }
      if (a[mid] < target) { low = mid + 1; }
      else { high = mid - 1; }
    }
    steps.push({ array:[...a], low, high, mid:null, note:`${target} not found`, found:-1, comparisons:steps.at(-1).comparisons });
    return steps;
  }

  function linearSearch(arr, target) {
    const steps = [];
    const a = [...arr];
    for (let i=0;i<a.length;i++){
      steps.push({ array:[...a], i, note:`Check a[${i}]=${a[i]} vs ${target}`, found:-1, comparisons:i+1 });
      if (a[i] === target) {
        steps.push({ array:[...a], i, note:`Found at index ${i}`, found:i, comparisons:i+1 });
        return steps;
      }
    }
    steps.push({ array:[...a], i:null, note:`${target} not found`, found:-1, comparisons:a.length });
    return steps;
  }

  function bubbleSort(arr) {
    const a=[...arr]; const steps=[]; let passes=0;
    steps.push({ array:[...a], i:null, j:null, note:'Start', swapped:false, passes });
    for (let i=0;i<a.length-1;i++){
      for (let j=0;j<a.length-1-i;j++){
        steps.push({ array:[...a], i, j, note:`Compare a[${j}]=${a[j]} & a[${j+1}]=${a[j+1]}`, swapped:false, passes });
        if (a[j] > a[j+1]) {
          [a[j],a[j+1]] = [a[j+1],a[j]];
          steps.push({ array:[...a], i, j, note:`Swap → ${a[j]} ↔ ${a[j+1]}`, swapped:true, passes });
        }
      }
      passes++;
    }
    steps.push({ array:[...a], i:null, j:null, note:'Sorted ✓', swapped:false, passes, done:true });
    return steps;
  }

  function selectionSort(arr) {
    const a=[...arr]; const steps=[]; let comparisons=0;
    steps.push({ array:[...a], i:null, j:null, minIdx:null, note:'Start', comparisons });
    for (let i=0;i<a.length-1;i++){
      let minIdx=i;
      for (let j=i+1;j<a.length;j++){
        comparisons++;
        steps.push({ array:[...a], i, j, minIdx, note:`Min so far: a[${minIdx}]=${a[minIdx]}`, comparisons });
        if (a[j] < a[minIdx]) minIdx = j;
      }
      if (minIdx !== i) {
        [a[i],a[minIdx]] = [a[minIdx],a[i]];
        steps.push({ array:[...a], i, j:null, minIdx, note:`Swap a[${i}] ↔ a[${minIdx}]`, comparisons, swapped:true });
      }
    }
    steps.push({ array:[...a], i:null, j:null, minIdx:null, note:'Sorted ✓', comparisons, done:true });
    return steps;
  }

  function insertionSort(arr) {
    const a=[...arr]; const steps=[]; let comparisons=0;
    steps.push({ array:[...a], i:null, j:null, note:'Start', comparisons });
    for (let i=1;i<a.length;i++){
      let key = a[i], j = i-1;
      steps.push({ array:[...a], i, j, note:`Pick key=${key}`, comparisons });
      while (j>=0 && a[j]>key){
        comparisons++;
        a[j+1] = a[j];
        steps.push({ array:[...a], i, j, note:`Shift a[${j}] → a[${j+1}]`, comparisons, swapped:true });
        j--;
      }
      a[j+1] = key;
      steps.push({ array:[...a], i, j, note:`Insert key=${key} at index ${j+1}`, comparisons });
    }
    steps.push({ array:[...a], i:null, j:null, note:'Sorted ✓', comparisons, done:true });
    return steps;
  }

  const GENERATORS = {
    binarySearch, linearSearch, bubbleSort, selectionSort, insertionSort
  };

  const META = {
    binarySearch:   { name:'Binary Search',   type:'search', time:'O(log n)',    space:'O(1)', desc:'Divide & conquer on sorted array' },
    linearSearch:   { name:'Linear Search',  type:'search', time:'O(n)',        space:'O(1)', desc:'Sequential scan of array' },
    bubbleSort:     { name:'Bubble Sort',    type:'sort',  time:'O(n²)',       space:'O(1)', desc:'Adjacent swaps bubble max to end' },
    selectionSort:  { name:'Selection Sort', type:'sort',  time:'O(n²)',       space:'O(1)', desc:'Select min & place at front' },
    insertionSort:  { name:'Insertion Sort', type:'sort',  time:'O(n²)',        space:'O(1)', desc:'Build sorted prefix incrementally' }
  };

  function generate(type, arr, target) {
    const gen = GENERATORS[type];
    if (!gen) throw new Error('Unknown algorithm: '+type);
    if (type.endsWith('Search')) return gen(arr, target);
    return gen(arr);
  }

  return { generate, META };
})();