const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  ? import.meta.env.VITE_API_URL.replace(/\/+$/, '')
  : '';

export async function api(path, options = {}) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${API_BASE}/api${cleanPath}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  let data;
  try { data = await response.json(); } catch { throw new Error('Cannot reach the API. Make sure the backend is running.'); }
  if (!response.ok) {
    const message = typeof data.error === 'object' && data.error ? (data.error.message || JSON.stringify(data.error)) : (data.error || 'Something went wrong. Please try again.');
    throw new Error(message);
  }
  return data;
}

export const sampleCode = {
  python: `def main():\n    print("Hello, CodeLens!")\n\nif __name__ == "__main__":\n    main()`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, CodeLens!");\n    }\n}`,
  cpp: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, CodeLens!\\n";\n    return 0;\n}`,
  javascript: `function calculateAverage(numbers) {
  let total = 0;
  for (const number of numbers) {
    total += number;
  }
  return total / number.length;
}

const values = [12, 18, 24, 30];
console.log(calculateAverage(values));`,
  html: `<section class="profile-card">
  <img src="/avatar.jpg">
  <h1>Hello, builder.</h1>
  <p>One small step, every day.</p>
  <button>Keep learning</button>
</section>`,
  css: `.profile-card {
  padding: 24px;
  border-radius: 20px;
  background: linear-gradient(135deg, #e0f1e9, #faf6eb);
}

button:focus {
  outline: none;
}`,
};

export function downloadFile(name, content, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
