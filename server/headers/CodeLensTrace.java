// CodeLens Java Runtime Tracing Library
// Provides runtime instrumentation, collection wrappers, and deterministic state emission.

class CodeLensTraceEmitter {
    private static CodeLensTraceEmitter instance = null;
    private int step = 0;
    private final java.util.List<String> callStack = new java.util.ArrayList<>();
    private final java.util.Map<String, Object> trackedVars = new java.util.LinkedHashMap<>();

    private CodeLensTraceEmitter() {
        callStack.add("main()");
    }

    public static synchronized CodeLensTraceEmitter getInstance() {
        if (instance == null) {
            instance = new CodeLensTraceEmitter();
        }
        return instance;
    }

    public static synchronized void reset() {
        instance = new CodeLensTraceEmitter();
    }

    public synchronized void pushFrame(String frame) {
        callStack.add(frame);
    }

    public synchronized void popFrame() {
        if (callStack.size() > 1) {
            callStack.remove(callStack.size() - 1);
        }
    }

    public synchronized java.util.List<String> getCallStack() {
        return new java.util.ArrayList<>(callStack);
    }

    public synchronized void setVar(String name, Object val) {
        trackedVars.put(name, val);
    }

    public synchronized void clearVars() {
        trackedVars.clear();
    }

    public synchronized java.util.Map<String, Object> getVars() {
        return new java.util.LinkedHashMap<>(trackedVars);
    }

    public static String escapeJson(String s) {
        if (s == null) return "null";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\b': sb.append("\\b"); break;
                case '\f': sb.append("\\f"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < ' ') {
                        String t = "000" + Integer.toHexString(c);
                        sb.append("\\u").append(t.substring(t.length() - 4));
                    } else {
                        sb.append(c);
                    }
            }
        }
        return sb.toString();
    }

    public static String toJson(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof Number || obj instanceof Boolean) return String.valueOf(obj);
        if (obj instanceof String || obj instanceof Character) return "\"" + escapeJson(String.valueOf(obj)) + "\"";
        if (obj instanceof int[]) {
            int[] arr = (int[]) obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < arr.length; i++) {
                if (i > 0) sb.append(",");
                sb.append(arr[i]);
            }
            sb.append("]");
            return sb.toString();
        }
        if (obj instanceof double[]) {
            double[] arr = (double[]) obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < arr.length; i++) {
                if (i > 0) sb.append(",");
                sb.append(arr[i]);
            }
            sb.append("]");
            return sb.toString();
        }
        if (obj instanceof long[]) {
            long[] arr = (long[]) obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < arr.length; i++) {
                if (i > 0) sb.append(",");
                sb.append(arr[i]);
            }
            sb.append("]");
            return sb.toString();
        }
        if (obj instanceof Object[]) {
            Object[] arr = (Object[]) obj;
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < arr.length; i++) {
                if (i > 0) sb.append(",");
                sb.append(toJson(arr[i]));
            }
            sb.append("]");
            return sb.toString();
        }
        if (obj instanceof java.util.Collection) {
            java.util.Collection<?> col = (java.util.Collection<?>) obj;
            StringBuilder sb = new StringBuilder("[");
            int i = 0;
            for (Object item : col) {
                if (i++ > 0) sb.append(",");
                sb.append(toJson(item));
            }
            sb.append("]");
            return sb.toString();
        }
        if (obj instanceof java.util.Map) {
            java.util.Map<?, ?> map = (java.util.Map<?, ?>) obj;
            StringBuilder sb = new StringBuilder("{");
            int i = 0;
            for (java.util.Map.Entry<?, ?> entry : map.entrySet()) {
                if (i++ > 0) sb.append(",");
                sb.append("\"").append(escapeJson(String.valueOf(entry.getKey()))).append("\":");
                sb.append(toJson(entry.getValue()));
            }
            sb.append("}");
            return sb.toString();
        }
        try {
            java.lang.reflect.Field vf = obj.getClass().getDeclaredField("val");
            vf.setAccessible(true);
            return toJson(vf.get(obj));
        } catch (Exception ignored1) {
            try {
                java.lang.reflect.Field df = obj.getClass().getDeclaredField("data");
                df.setAccessible(true);
                return toJson(df.get(obj));
            } catch (Exception ignored2) {}
        }
        return "\"" + escapeJson(String.valueOf(obj)) + "\"";
    }

    public synchronized void emit(int line, String type, String dsId, String dsType, String op, String valJson, String snapshotJson, String desc) {
        step++;
        StringBuilder sb = new StringBuilder();
        sb.append("__CODELENS_EVENT__{\"step\":").append(step)
          .append(",\"line\":").append(line > 0 ? line : 1)
          .append(",\"type\":\"").append(type).append("\"")
          .append(",\"dsId\":\"").append(dsId != null ? dsId : "").append("\"")
          .append(",\"dsType\":\"").append(dsType != null ? dsType : "").append("\"")
          .append(",\"op\":\"").append(op != null ? op : "").append("\"");
        if (valJson != null) {
            sb.append(",\"val\":").append(valJson);
        }
        if (snapshotJson != null) {
            sb.append(",\"snapshot\":").append(snapshotJson);
        }
        sb.append(",\"desc\":\"").append(escapeJson(desc)).append("\"");

        // Attach call stack
        sb.append(",\"callStack\":[");
        for (int i = 0; i < callStack.size(); i++) {
            if (i > 0) sb.append(",");
            sb.append("\"").append(escapeJson(callStack.get(i))).append("\"");
        }
        sb.append("]");

        // Attach current variables snapshot
        sb.append(",\"variables\":").append(toJson(trackedVars));

        sb.append("}");
        System.out.println(sb.toString());
        System.out.flush();
    }

    public synchronized void emitStep(int line, String desc, java.util.Map<String, Object> vars) {
        if (vars != null) {
            trackedVars.putAll(vars);
        }
        emit(line, "step", "", "", "step", null, null, desc);
    }

    public static void traceVar(int line, String name, Object val) {
        CodeLensTraceEmitter inst = getInstance();
        inst.setVar(name, val);
        inst.emit(line, "assign", name, "variable", "assign", toJson(val), null, name + " = " + val);
    }

    public static void methodEnter(String method, int line, String frameName, String paramName, Object paramVal) {
        CodeLensTraceEmitter inst = getInstance();
        inst.pushFrame(frameName);
        if (paramName != null) {
            inst.setVar(paramName, paramVal);
        }
        inst.emit(line, "method_enter", "", "", "call", null, null, "Entered " + frameName);
    }

    public static void methodEnter(String method, int line, String frameName) {
        methodEnter(method, line, frameName, null, null);
    }

    public static <T> T methodExit(String method, int line, T returnVal) {
        CodeLensTraceEmitter inst = getInstance();
        inst.emit(line, "method_exit", "", "", "return", toJson(returnVal), null, method + " returned " + returnVal);
        inst.popFrame();
        return returnVal;
    }

    public static int methodExit(String method, int line, int returnVal) {
        CodeLensTraceEmitter inst = getInstance();
        inst.emit(line, "method_exit", "", "", "return", String.valueOf(returnVal), null, method + " returned " + returnVal);
        inst.popFrame();
        return returnVal;
    }

    public static long methodExit(String method, int line, long returnVal) {
        CodeLensTraceEmitter inst = getInstance();
        inst.emit(line, "method_exit", "", "", "return", String.valueOf(returnVal), null, method + " returned " + returnVal);
        inst.popFrame();
        return returnVal;
    }

    public static double methodExit(String method, int line, double returnVal) {
        CodeLensTraceEmitter inst = getInstance();
        inst.emit(line, "method_exit", "", "", "return", String.valueOf(returnVal), null, method + " returned " + returnVal);
        inst.popFrame();
        return returnVal;
    }

    public static boolean methodExit(String method, int line, boolean returnVal) {
        CodeLensTraceEmitter inst = getInstance();
        inst.emit(line, "method_exit", "", "", "return", String.valueOf(returnVal), null, method + " returned " + returnVal);
        inst.popFrame();
        return returnVal;
    }

    public static void methodExitVoid(String method, int line) {
        CodeLensTraceEmitter inst = getInstance();
        inst.emit(line, "method_exit", "", "", "return", null, null, method + " returned");
        inst.popFrame();
    }

    public static int detectCallerLine() {
        for (StackTraceElement el : Thread.currentThread().getStackTrace()) {
            if ("Main".equals(el.getClassName())) {
                return el.getLineNumber();
            }
        }
        return 1;
    }
}

// --- Instrumented Array Helper ---
class CodeLensArray {
    public static void track(int line, String id, int[] arr, String desc) {
        String snap = CodeLensTraceEmitter.toJson(arr);
        CodeLensTraceEmitter.getInstance().emit(line, "init", id, "array", "init", null, snap, desc != null ? desc : ("Initialized array " + id + " = " + snap));
    }

    public static void track(int line, String id, Object[] arr, String desc) {
        String snap = CodeLensTraceEmitter.toJson(arr);
        CodeLensTraceEmitter.getInstance().emit(line, "init", id, "array", "init", null, snap, desc != null ? desc : ("Initialized array " + id + " = " + snap));
    }

    public static void assign(int line, String id, int[] arr, int index, int value) {
        String snap = CodeLensTraceEmitter.toJson(arr);
        CodeLensTraceEmitter.getInstance().emit(line, "operation", id, "array", "assign", String.valueOf(value), snap, id + "[" + index + "] = " + value);
    }

    public static void assign(int line, String id, Object[] arr, int index, Object value) {
        String snap = CodeLensTraceEmitter.toJson(arr);
        CodeLensTraceEmitter.getInstance().emit(line, "operation", id, "array", "assign", CodeLensTraceEmitter.toJson(value), snap, id + "[" + index + "] = " + value);
    }

    public static void sort(int line, String id, int[] arr) {
        String snap = CodeLensTraceEmitter.toJson(arr);
        CodeLensTraceEmitter.getInstance().emit(line, "operation", id, "array", "sort", null, snap, "Arrays.sort(" + id + ") -> " + snap);
    }

    public static void sort(int line, String id, Object[] arr) {
        String snap = CodeLensTraceEmitter.toJson(arr);
        CodeLensTraceEmitter.getInstance().emit(line, "operation", id, "array", "sort", null, snap, "Arrays.sort(" + id + ") -> " + snap);
    }
}

// --- Instrumented ArrayList ---
class CodeLensArrayList<T> extends java.util.ArrayList<T> {
    private final String id;

    public CodeLensArrayList(String id) {
        super();
        this.id = id;
        emitState(CodeLensTraceEmitter.detectCallerLine(), "init", "init", null, "Initialized empty ArrayList " + id);
    }

    public CodeLensArrayList() {
        this("values");
    }

    public CodeLensArrayList(java.util.Collection<? extends T> c) {
        super(c);
        this.id = "values";
        emitState(CodeLensTraceEmitter.detectCallerLine(), "init", "init", null, "Initialized ArrayList " + id + " from collection");
    }

    private void emitState(int line, String type, String op, Object val, String desc) {
        String snap = CodeLensTraceEmitter.toJson(this);
        String valJson = val != null ? CodeLensTraceEmitter.toJson(val) : null;
        CodeLensTraceEmitter.getInstance().emit(line, type, id, "list", op, valJson, snap, desc);
    }

    @Override
    public boolean add(T item) {
        boolean res = super.add(item);
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "add", item, id + ".add(" + item + ") -> size " + size());
        return res;
    }

    @Override
    public void add(int index, T element) {
        super.add(index, element);
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "add", element, id + ".add(" + index + ", " + element + ") -> size " + size());
    }

    @Override
    public T remove(int index) {
        T removed = super.remove(index);
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "remove", removed, id + ".remove(" + index + ") removed " + removed);
        return removed;
    }

    @Override
    public boolean remove(Object o) {
        boolean res = super.remove(o);
        if (res) {
            emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "remove", o, id + ".remove(" + o + ")");
        }
        return res;
    }

    @Override
    public T set(int index, T element) {
        T old = super.set(index, element);
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "set", element, id + ".set(" + index + ", " + element + ")");
        return old;
    }

    @Override
    public void clear() {
        super.clear();
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "clear", null, id + ".clear()");
    }
}

// --- Instrumented ArrayDeque (Supports Queue & Stack Operations) ---
class CodeLensArrayDeque<T> extends java.util.ArrayDeque<T> {
    private final String id;

    public CodeLensArrayDeque(String id) {
        super();
        this.id = id;
        emitState(CodeLensTraceEmitter.detectCallerLine(), "init", "deque", "init", null, "Initialized empty ArrayDeque " + id);
    }

    public CodeLensArrayDeque() {
        this("deque");
    }

    public CodeLensArrayDeque(java.util.Collection<? extends T> c) {
        super(c);
        this.id = "deque";
        emitState(CodeLensTraceEmitter.detectCallerLine(), "init", "deque", "init", null, "Initialized ArrayDeque " + id);
    }

    private void emitState(int line, String type, String dsType, String op, Object val, String desc) {
        String snap = CodeLensTraceEmitter.toJson(this);
        String valJson = val != null ? CodeLensTraceEmitter.toJson(val) : null;
        CodeLensTraceEmitter.getInstance().emit(line, type, id, dsType, op, valJson, snap, desc);
    }

    // Queue API
    @Override
    public boolean add(T item) {
        boolean res = super.add(item);
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "queue", "add", item, id + ".add(" + item + ") -> front is " + peekFirst());
        return res;
    }

    @Override
    public boolean offer(T item) {
        boolean res = super.offer(item);
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "queue", "offer", item, id + ".offer(" + item + ")");
        return res;
    }

    @Override
    public T remove() {
        T removed = super.remove();
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "queue", "remove", removed, id + ".remove() -> removed front " + removed);
        return removed;
    }

    @Override
    public T poll() {
        T val = super.poll();
        if (val != null) {
            emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "queue", "poll", val, id + ".poll() -> removed " + val);
        }
        return val;
    }

    @Override
    public T peek() {
        T val = super.peek();
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "queue", "peek", val, id + ".peek() -> " + val);
        return val;
    }

    // Stack API
    @Override
    public void push(T item) {
        super.push(item);
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "stack", "push", item, id + ".push(" + item + ") -> top is now " + item);
    }

    @Override
    public T pop() {
        T val = super.pop();
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "stack", "pop", val, id + ".pop() -> popped " + val + " from top");
        return val;
    }

    @Override
    public void addFirst(T item) {
        super.addFirst(item);
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "deque", "addFirst", item, id + ".addFirst(" + item + ")");
    }

    @Override
    public void addLast(T item) {
        super.addLast(item);
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "deque", "addLast", item, id + ".addLast(" + item + ")");
    }

    @Override
    public T removeFirst() {
        T val = super.removeFirst();
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "deque", "removeFirst", val, id + ".removeFirst() -> " + val);
        return val;
    }

    @Override
    public T removeLast() {
        T val = super.removeLast();
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "deque", "removeLast", val, id + ".removeLast() -> " + val);
        return val;
    }
}

// --- Instrumented Stack (extends java.util.Stack<T>) ---
class CodeLensStack<T> extends java.util.Stack<T> {
    private final String id;

    public CodeLensStack(String id) {
        super();
        this.id = id;
        emitState(CodeLensTraceEmitter.detectCallerLine(), "init", "init", null, "Initialized empty Stack " + id);
    }

    public CodeLensStack() {
        this("stack");
    }

    private void emitState(int line, String type, String op, Object val, String desc) {
        String snap = CodeLensTraceEmitter.toJson(this);
        String valJson = val != null ? CodeLensTraceEmitter.toJson(val) : null;
        CodeLensTraceEmitter.getInstance().emit(line, type, id, "stack", op, valJson, snap, desc);
    }

    @Override
    public T push(T item) {
        T res = super.push(item);
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "push", item, id + ".push(" + item + ") -> top is now " + item);
        return res;
    }

    @Override
    public synchronized T pop() {
        T val = super.pop();
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "pop", val, id + ".pop() -> popped " + val + " from top");
        return val;
    }

    @Override
    public synchronized T peek() {
        T val = super.peek();
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "peek", val, id + ".peek() -> " + val);
        return val;
    }
}

// --- Instrumented LinkedList ---
class CodeLensLinkedList<T> extends java.util.LinkedList<T> {
    private final String id;

    public CodeLensLinkedList(String id) {
        super();
        this.id = id;
        emitState(CodeLensTraceEmitter.detectCallerLine(), "init", "list", "init", null, "Initialized empty LinkedList " + id);
    }

    public CodeLensLinkedList() {
        this("list");
    }

    private void emitState(int line, String type, String dsType, String op, Object val, String desc) {
        String snap = CodeLensTraceEmitter.toJson(this);
        String valJson = val != null ? CodeLensTraceEmitter.toJson(val) : null;
        CodeLensTraceEmitter.getInstance().emit(line, type, id, dsType, op, valJson, snap, desc);
    }

    @Override
    public boolean add(T item) {
        boolean res = super.add(item);
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "list", "add", item, id + ".add(" + item + ")");
        return res;
    }

    @Override
    public T removeFirst() {
        T val = super.removeFirst();
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "list", "removeFirst", val, id + ".removeFirst() -> " + val);
        return val;
    }

    @Override
    public T removeLast() {
        T val = super.removeLast();
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "list", "removeLast", val, id + ".removeLast() -> " + val);
        return val;
    }
}

// --- Instrumented HashMap ---
class CodeLensHashMap<K, V> extends java.util.HashMap<K, V> {
    private final String id;

    public CodeLensHashMap(String id) {
        super();
        this.id = id;
        emitState(CodeLensTraceEmitter.detectCallerLine(), "init", "init", null, "Initialized empty HashMap " + id);
    }

    public CodeLensHashMap() {
        this("map");
    }

    private void emitState(int line, String type, String op, Object val, String desc) {
        String snap = CodeLensTraceEmitter.toJson(this);
        String valJson = val != null ? CodeLensTraceEmitter.toJson(val) : null;
        CodeLensTraceEmitter.getInstance().emit(line, type, id, "map", op, valJson, snap, desc);
    }

    @Override
    public V put(K key, V value) {
        V old = super.put(key, value);
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "put", value, id + ".put(" + key + ", " + value + ")");
        return old;
    }

    @Override
    public V remove(Object key) {
        V removed = super.remove(key);
        if (removed != null) {
            emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "remove", removed, id + ".remove(" + key + ") removed " + removed);
        }
        return removed;
    }

    @Override
    public void clear() {
        super.clear();
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "clear", null, id + ".clear()");
    }
}

// --- Instrumented HashSet ---
class CodeLensHashSet<T> extends java.util.HashSet<T> {
    private final String id;

    public CodeLensHashSet(String id) {
        super();
        this.id = id;
        emitState(CodeLensTraceEmitter.detectCallerLine(), "init", "init", null, "Initialized empty HashSet " + id);
    }

    public CodeLensHashSet() {
        this("set");
    }

    private void emitState(int line, String type, String op, Object val, String desc) {
        String snap = CodeLensTraceEmitter.toJson(this);
        String valJson = val != null ? CodeLensTraceEmitter.toJson(val) : null;
        CodeLensTraceEmitter.getInstance().emit(line, type, id, "set", op, valJson, snap, desc);
    }

    @Override
    public boolean add(T item) {
        boolean res = super.add(item);
        emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "add", item, id + ".add(" + item + ")");
        return res;
    }

    @Override
    public boolean remove(Object o) {
        boolean res = super.remove(o);
        if (res) {
            emitState(CodeLensTraceEmitter.detectCallerLine(), "operation", "remove", o, id + ".remove(" + o + ")");
        }
        return res;
    }
}

// --- Backwards-compatible Wrappers for CodeLensQueue & CodeLensStack ---
class CodeLensQueue<T> {
    private final java.util.ArrayDeque<T> data = new java.util.ArrayDeque<>();
    private final String id;

    public CodeLensQueue(String id) {
        this.id = id;
        CodeLensTraceEmitter.getInstance().emit(CodeLensTraceEmitter.detectCallerLine(), "init", id, "queue", "init", null, "[]", "Initialized empty queue " + id);
    }

    public CodeLensQueue() {
        this("q");
    }

    private String serialize() {
        return CodeLensTraceEmitter.toJson(data);
    }

    public void push(T item) {
        data.addLast(item);
        String vStr = CodeLensTraceEmitter.toJson(item);
        CodeLensTraceEmitter.getInstance().emit(CodeLensTraceEmitter.detectCallerLine(), "operation", id, "queue", "push", vStr, serialize(), id + ".push(" + item + ") -> front is " + data.peekFirst());
    }

    public void add(T item) {
        push(item);
    }

    public T pop() {
        if (data.isEmpty()) return null;
        T val = data.pollFirst();
        String vStr = CodeLensTraceEmitter.toJson(val);
        CodeLensTraceEmitter.getInstance().emit(CodeLensTraceEmitter.detectCallerLine(), "operation", id, "queue", "pop", vStr, serialize(), id + ".pop() removed " + val + " from front");
        return val;
    }

    public T poll() {
        return pop();
    }

    public T front() {
        return data.peekFirst();
    }

    public T peek() {
        return front();
    }

    public int size() {
        return data.size();
    }

    public boolean isEmpty() {
        return data.isEmpty();
    }

    @Override
    public String toString() {
        return data.toString();
    }
}

// --- Binary Tree Node Structure & Arbitrary Tree Tracker ---
class CodeLensTreeNode<T extends Comparable<T>> {
    public T val;
    public CodeLensTreeNode<T> left = null;
    public CodeLensTreeNode<T> right = null;
    public final String id;

    public CodeLensTreeNode(String id, T val) {
        this.id = id;
        this.val = val;
        CodeLensTraceEmitter.getInstance().emit(CodeLensTraceEmitter.detectCallerLine(), "init", id, "tree", "init", CodeLensTraceEmitter.toJson(val), serialize(), "Initialized tree root " + id + " = " + val);
    }

    public String serialize() {
        return CodeLensTreeTracker.serializeTree(this, null);
    }

    public void insert(T newVal) {
        if (newVal.compareTo(val) < 0) {
            if (left == null) {
                left = new CodeLensTreeNode<>(id, newVal);
            } else {
                left.insert(newVal);
            }
        } else {
            if (right == null) {
                right = new CodeLensTreeNode<>(id, newVal);
            } else {
                right.insert(newVal);
            }
        }
        CodeLensTraceEmitter.getInstance().emit(CodeLensTraceEmitter.detectCallerLine(), "operation", id, "tree", "insert", CodeLensTraceEmitter.toJson(newVal), serialize(), "Inserted " + newVal + " into tree " + id);
    }
}

class CodeLensTreeTracker {
    private static Object activeRoot = null;
    private static final java.util.List<Object> visitedNodes = new java.util.ArrayList<>();
    private static final java.util.List<Object> traversalValues = new java.util.ArrayList<>();

    public static synchronized void reset() {
        activeRoot = null;
        visitedNodes.clear();
        traversalValues.clear();
    }

    public static Object getRoot() {
        return activeRoot;
    }

    public static void setRoot(Object root) {
        activeRoot = root;
    }

    public static Object getNodeField(Object node, String fieldName) {
        if (node == null) return null;
        try {
            java.lang.reflect.Field f = node.getClass().getDeclaredField(fieldName);
            f.setAccessible(true);
            return f.get(node);
        } catch (Exception e) {
            return null;
        }
    }

    public static Object getNodeVal(Object node) {
        if (node == null) return null;
        Object v = getNodeField(node, "val");
        if (v == null) v = getNodeField(node, "data");
        if (v == null) v = getNodeField(node, "value");
        if (v == null) v = getNodeField(node, "key");
        return v != null ? v : node.toString();
    }

    public static String getNodeId(Object node) {
        if (node == null) return "null";
        return "n_" + System.identityHashCode(node);
    }

    public static String serializeTree(Object root, Object currentNode) {
        if (root == null) return "{\"rootId\":null,\"nodes\":{},\"currentNodeId\":null,\"visitedNodeIds\":[],\"traversalOrder\":[]}";
        
        StringBuilder nodesJson = new StringBuilder("{");
        java.util.Set<Object> visited = new java.util.HashSet<>();
        java.util.Queue<Object> queue = new java.util.LinkedList<>();
        queue.add(root);
        visited.add(root);
        
        boolean first = true;
        while (!queue.isEmpty()) {
            Object curr = queue.poll();
            String id = getNodeId(curr);
            Object val = getNodeVal(curr);
            Object left = getNodeField(curr, "left");
            Object right = getNodeField(curr, "right");
            
            if (!first) nodesJson.append(",");
            first = false;
            
            nodesJson.append("\"").append(id).append("\":{")
                     .append("\"id\":\"").append(id).append("\",")
                     .append("\"val\":").append(CodeLensTraceEmitter.toJson(val)).append(",")
                     .append("\"leftId\":").append(left != null ? ("\"" + getNodeId(left) + "\"") : "null").append(",")
                     .append("\"rightId\":").append(right != null ? ("\"" + getNodeId(right) + "\"") : "null")
                     .append("}");
                     
            if (left != null && !visited.contains(left)) {
                visited.add(left);
                queue.add(left);
            }
            if (right != null && !visited.contains(right)) {
                visited.add(right);
                queue.add(right);
            }
        }
        nodesJson.append("}");
        
        StringBuilder visitedJson = new StringBuilder("[");
        for (int i = 0; i < visitedNodes.size(); i++) {
            if (i > 0) visitedJson.append(",");
            visitedJson.append("\"").append(getNodeId(visitedNodes.get(i))).append("\"");
        }
        visitedJson.append("]");
        
        StringBuilder traversalJson = new StringBuilder("[");
        for (int i = 0; i < traversalValues.size(); i++) {
            if (i > 0) traversalJson.append(",");
            traversalJson.append(CodeLensTraceEmitter.toJson(traversalValues.get(i)));
        }
        traversalJson.append("]");
        
        String currentId = currentNode != null ? ("\"" + getNodeId(currentNode) + "\"") : "null";
        
        return "{\"rootId\":\"" + getNodeId(root) + "\",\"nodes\":" + nodesJson.toString() +
               ",\"currentNodeId\":" + currentId +
               ",\"visitedNodeIds\":" + visitedJson.toString() +
               ",\"traversalOrder\":" + traversalJson.toString() + "}";
    }

    public static synchronized void track(int line, String treeId, Object root, Object currentNode, String op, String desc) {
        if (root != null) activeRoot = root;
        else root = activeRoot;
        if (root == null && currentNode != null) {
            root = currentNode;
            activeRoot = root;
        }
        if (root == null) return;
        
        String canonicalTreeId = (treeId == null || treeId.isEmpty() || treeId.equals("root") || treeId.equals("tree_1")) ? "tree" : treeId;
        String snapshot = serializeTree(root, currentNode);
        Object val = currentNode != null ? getNodeVal(currentNode) : null;
        CodeLensTraceEmitter.getInstance().emit(
            line,
            "operation",
            canonicalTreeId,
            "tree",
            op != null ? op : "update",
            val != null ? CodeLensTraceEmitter.toJson(val) : null,
            snapshot,
            desc != null ? desc : ("Tree " + op)
        );
    }

    public static synchronized void recordVisit(int line, String treeId, Object root, Object visitedNode, Object val) {
        if (root != null) activeRoot = root;
        else root = activeRoot;
        if (visitedNode != null) {
            visitedNodes.add(visitedNode);
        }
        if (val != null) {
            traversalValues.add(val);
        } else if (visitedNode != null) {
            traversalValues.add(getNodeVal(visitedNode));
        }
        track(line, treeId, root, visitedNode, "visit", "Visited node " + (val != null ? val : getNodeVal(visitedNode)) + " in tree traversal");
    }

    public static synchronized void trackStack(int line, String treeId, Object root, Object currentNode, String op, String desc) {
        track(line, treeId, root, currentNode, op, desc);
    }
}

// --- Graph Tracker ---
class CodeLensGraphTracker {
    public static synchronized void track(int line, String graphId, java.util.Map<?, ?> adjList, Object currentNode, java.util.Collection<?> visited, java.util.Collection<?> frontier, boolean isDirected, boolean isWeighted, String op, String desc) {
        if (adjList == null) return;

        StringBuilder nodesJson = new StringBuilder("{");
        StringBuilder edgesJson = new StringBuilder("[");
        java.util.Set<String> nodeIds = new java.util.LinkedHashSet<>();
        int edgeCounter = 1;

        for (java.util.Map.Entry<?, ?> entry : adjList.entrySet()) {
            String u = String.valueOf(entry.getKey());
            nodeIds.add(u);
            Object neighbors = entry.getValue();

            if (neighbors instanceof java.util.Collection) {
                for (Object vObj : (java.util.Collection<?>) neighbors) {
                    String v;
                    int weight = 1;
                    if (vObj instanceof java.util.Map) {
                        java.util.Map<?, ?> vMap = (java.util.Map<?, ?>) vObj;
                        v = String.valueOf(vMap.get("to") != null ? vMap.get("to") : vMap.get("node"));
                        if (vMap.get("weight") instanceof Number) {
                            weight = ((Number) vMap.get("weight")).intValue();
                        }
                    } else if (vObj instanceof Object[] && ((Object[]) vObj).length >= 2) {
                        v = String.valueOf(((Object[]) vObj)[0]);
                        if (((Object[]) vObj)[1] instanceof Number) {
                            weight = ((Number) ((Object[]) vObj)[1]).intValue();
                        }
                    } else {
                        v = String.valueOf(vObj);
                    }
                    nodeIds.add(v);

                    if (edgesJson.length() > 1) edgesJson.append(",");
                    edgesJson.append("{\"id\":\"e_").append(edgeCounter++)
                             .append("\",\"from\":\"").append(u)
                             .append("\",\"to\":\"").append(v)
                             .append("\",\"weight\":").append(weight)
                             .append(",\"directed\":").append(isDirected)
                             .append(",\"state\":\"unvisited\"}");
                }
            }
        }
        edgesJson.append("]");

        int nIdx = 0;
        for (String nid : nodeIds) {
            if (nIdx++ > 0) nodesJson.append(",");
            String state = (currentNode != null && nid.equals(String.valueOf(currentNode))) ? "current"
                         : (visited != null && visited.contains(nid)) ? "visited"
                         : (frontier != null && frontier.contains(nid)) ? "frontier"
                         : "unvisited";
            nodesJson.append("\"").append(nid).append("\":{\"id\":\"").append(nid).append("\",\"val\":\"").append(nid).append("\",\"state\":\"").append(state).append("\"}");
        }
        nodesJson.append("}");

        StringBuilder visitedJson = new StringBuilder("[");
        if (visited != null) {
            int vIdx = 0;
            for (Object v : visited) {
                if (vIdx++ > 0) visitedJson.append(",");
                visitedJson.append("\"").append(v).append("\"");
            }
        }
        visitedJson.append("]");

        StringBuilder frontierJson = new StringBuilder("[");
        if (frontier != null) {
            int fIdx = 0;
            for (Object f : frontier) {
                if (fIdx++ > 0) frontierJson.append(",");
                frontierJson.append("\"").append(f).append("\"");
            }
        }
        frontierJson.append("]");

        String currJson = currentNode != null ? ("\"" + currentNode + "\"") : "null";

        String snapshot = "{\"nodes\":" + nodesJson.toString() +
                          ",\"edges\":" + edgesJson.toString() +
                          ",\"isDirected\":" + isDirected +
                          ",\"isWeighted\":" + isWeighted +
                          ",\"traversalState\":{\"currentNodeId\":" + currJson +
                          ",\"visitedNodeIds\":" + visitedJson.toString() +
                          ",\"frontierNodeIds\":" + frontierJson.toString() + "}}";

        CodeLensTraceEmitter.getInstance().emit(
            line,
            "operation",
            graphId != null ? graphId : "graph_1",
            "graph",
            op != null ? op : "update",
            currentNode != null ? CodeLensTraceEmitter.toJson(currentNode) : null,
            snapshot,
            desc != null ? desc : "Graph state updated"
        );
    }
}

// --- Linked List Tracker ---
class CodeLensLinkedListTracker {
    public static synchronized void track(int line, String listId, Object head, Object current, String op, String desc) {
        if (head == null) {
            CodeLensTraceEmitter.getInstance().emit(line, "operation", listId != null ? listId : "list_1", "linked_list", op, null, "{\"headId\":null,\"tailId\":null,\"nodes\":{},\"order\":[]}", "Linked list is empty");
            return;
        }

        StringBuilder nodesJson = new StringBuilder("{");
        StringBuilder orderJson = new StringBuilder("[");
        java.util.Set<Object> visited = new java.util.HashSet<>();
        Object curr = head;
        Object prev = null;
        int idx = 0;
        String headId = "node_" + System.identityHashCode(head);
        String tailId = headId;

        while (curr != null && !visited.contains(curr)) {
            visited.add(curr);
            String id = "node_" + System.identityHashCode(curr);
            tailId = id;
            Object val = CodeLensTreeTracker.getNodeVal(curr);
            Object next = CodeLensTreeTracker.getNodeField(curr, "next");

            if (idx > 0) {
                nodesJson.append(",");
                orderJson.append(",");
            }
            orderJson.append("\"").append(id).append("\"");

            nodesJson.append("\"").append(id).append("\":{")
                     .append("\"id\":\"").append(id).append("\",")
                     .append("\"val\":").append(CodeLensTraceEmitter.toJson(val)).append(",")
                     .append("\"nextId\":").append(next != null ? ("\"node_" + System.identityHashCode(next) + "\"") : "null").append(",")
                     .append("\"prevId\":").append(prev != null ? ("\"node_" + System.identityHashCode(prev) + "\"") : "null")
                     .append("}");

            prev = curr;
            curr = next;
            idx++;
        }
        nodesJson.append("}");
        orderJson.append("]");

        boolean isCircular = (curr != null && curr == head);

        String snapshot = "{\"headId\":\"" + headId + "\",\"tailId\":\"" + tailId + "\",\"nodes\":" + nodesJson.toString() + ",\"order\":" + orderJson.toString() + ",\"isCircular\":" + isCircular + "}";
        CodeLensTraceEmitter.getInstance().emit(
            line,
            "operation",
            listId != null ? listId : "list_1",
            "linked_list",
            op != null ? op : "update",
            current != null ? CodeLensTraceEmitter.toJson(CodeLensTreeTracker.getNodeVal(current)) : null,
            snapshot,
            desc != null ? desc : "Linked list updated"
        );
    }
}

// --- Priority Queue (Binary Heap) ---
class CodeLensPriorityQueue<T extends Comparable<T>> extends java.util.PriorityQueue<T> {
    private final String id;

    public CodeLensPriorityQueue(String id) {
        super();
        this.id = id;
        emitHeap(CodeLensTraceEmitter.detectCallerLine(), "init", null, "Initialized empty min-heap " + id);
    }

    public CodeLensPriorityQueue() {
        this("heap");
    }

    private void emitHeap(int line, String op, T val, String desc) {
        java.util.List<T> copy = new java.util.ArrayList<>(this);
        String snapshot = "{\"heapType\":\"min\",\"elements\":" + CodeLensTraceEmitter.toJson(copy) + ",\"size\":" + copy.size() + "}";
        CodeLensTraceEmitter.getInstance().emit(
            line,
            "operation",
            id,
            "heap",
            op,
            val != null ? CodeLensTraceEmitter.toJson(val) : null,
            snapshot,
            desc
        );
    }

    @Override
    public boolean add(T e) {
        boolean r = super.add(e);
        emitHeap(CodeLensTraceEmitter.detectCallerLine(), "push", e, id + ".add(" + e + ") sifted into heap");
        return r;
    }

    @Override
    public boolean offer(T e) {
        return add(e);
    }

    @Override
    public T poll() {
        T val = super.poll();
        emitHeap(CodeLensTraceEmitter.detectCallerLine(), "pop", val, id + ".poll() extracted root " + val);
        return val;
    }
}
