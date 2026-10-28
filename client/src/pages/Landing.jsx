import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Sparkles, 
  Code2, 
  Flame, 
  Compass, 
  CheckCircle2, 
  Circle, 
  ArrowRight, 
  Zap, 
  Check, 
  RotateCcw, 
  Sliders, 
  BookmarkCheck,
  GitBranch, 
  ArrowUpRight, 
  Menu,
  X,
  Layers,
  ShieldCheck,
  BookOpen,
  ChevronDown
} from 'lucide-react';
import { Brand } from '../components.jsx';

export default function Landing({ onAuth }) {
  // ----------------------------------------------------
  // 1. MOBILE NAVIGATION DRAWER STATE
  // ----------------------------------------------------
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ----------------------------------------------------
  // 2. INTERACTIVE CANVAS PARTICLE & CONSTELLATION FLUID
  // ----------------------------------------------------
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const mouse = { x: width / 2, y: height / 2, radius: 150 };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const particleCount = Math.min(width > 768 ? 55 : 25, 70);
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: Math.random() * 1.6 + 0.5,
      baseAlpha: Math.random() * 0.35 + 0.15
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let alpha = p.baseAlpha;

        if (dist < mouse.radius) {
          const force = (1 - dist / mouse.radius) * 1.5;
          p.x -= (dx / dist) * force;
          p.y -= (dy / dist) * force;
          alpha = Math.min(0.9, alpha + 0.35);
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 149, 31, ${alpha * 0.85})`;
        ctx.shadowColor = 'rgba(255, 149, 31, 0.6)';
        ctx.shadowBlur = 6;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist2 = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist2 < 110) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 149, 31, ${0.1 * (1 - dist2 / 110)})`;
            ctx.lineWidth = 0.65;
            ctx.shadowBlur = 0;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // ----------------------------------------------------
  // 3. 3D GYROSCOPIC TILT HOVER HANDLER FOR HERO BOX
  // ----------------------------------------------------
  const heroCardRef = useRef(null);

  const handleTilt = (e) => {
    if (!heroCardRef.current) return;
    const rect = heroCardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateX = (-y / rect.height) * 8;
    const rotateY = (x / rect.width) * 8;
    heroCardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`;
  };

  const handleTiltReset = () => {
    if (!heroCardRef.current) return;
    heroCardRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  };

  // ----------------------------------------------------
  // 4. HERO WORKSPACE BOX STATE & TABS
  // ----------------------------------------------------
  const [activeTab, setActiveTab] = useState('practice.js');
  const [isVerifying, setIsVerifying] = useState(false);

  const triggerVerification = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
    }, 900);
  };

  // ----------------------------------------------------
  // 5. BENTO GRID 1: MULTI-LANGUAGE CODE WORKSPACE
  // ----------------------------------------------------
  const [selectedLang, setSelectedLang] = useState('javascript');
  const codeSnippets = {
    javascript: `function keepGrowing() {\n  const nextStep = 'one small thing';\n  return practice(nextStep);\n}\n// progress comes from showing up`,
    python: `def keep_growing():\n    next_step = 'one small thing'\n    return practice(next_step)\n# progress comes from showing up`,
    java: `public class Momentum {\n  public static void main(String[] a) {\n    practice("one small thing");\n  }\n}`,
    cpp: `int keepGrowing() {\n    auto nextStep = "one small thing";\n    return practice(nextStep);\n}`
  };

  // ----------------------------------------------------
  // 6. BENTO GRID 2: INTERACTIVE BURST STREAK CALENDAR
  // ----------------------------------------------------
  const [streakDays, setStreakDays] = useState([
    { day: 'M', checked: true },
    { day: 'T', checked: true },
    { day: 'W', checked: true },
    { day: 'T', checked: true },
    { day: 'F', checked: true },
    { day: 'S', checked: true },
    { day: 'S', checked: false }
  ]);
  const [sparks, setSparks] = useState([]);

  const toggleDayCheck = (index, e) => {
    setStreakDays(prev => {
      const copy = [...prev];
      copy[index].checked = !copy[index].checked;
      return copy;
    });

    const rect = e.currentTarget.getBoundingClientRect();
    const newSpark = {
      id: Date.now() + Math.random(),
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    setSparks(prev => [...prev, newSpark]);
    setTimeout(() => {
      setSparks(prev => prev.filter(s => s.id !== newSpark.id));
    }, 800);
  };

  // ----------------------------------------------------
  // 7. PROCESS SECTION: 4 STAGES WITH STACKED-CARD OBSERVER
  // ----------------------------------------------------
  const [timelineStep, setTimelineStep] = useState(0);
  const [scratchpadCode, setScratchpadCode] = useState("const today = { focus: 'one bug', progress: true };");
  const [lintStatus, setLintStatus] = useState("Optimal static pass");
  const stageRefs = useRef([]);
  const deckRef = useRef(null);

  const scrollToCard = (index) => {
    setTimelineStep(index);
    const el = stageRefs.current[index];
    const deck = deckRef.current;
    if (el) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
      if (isMobile) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (deck) {
        const deckTop = deck.getBoundingClientRect().top + window.scrollY;
        const targetScroll = deckTop + el.offsetTop - (96 + index * 24);
        window.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth'
        });
      }
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        const scrollPos = window.scrollY + 250;
        let activeIdx = 0;
        stageRefs.current.forEach((el, index) => {
          if (el) {
            const top = el.getBoundingClientRect().top + window.scrollY;
            if (scrollPos >= top) {
              activeIdx = index;
            }
          }
        });
        setTimelineStep(activeIdx);
        return;
      }

      const deck = deckRef.current;
      if (!deck) return;
      const deckTop = deck.getBoundingClientRect().top + window.scrollY;
      const scrollY = window.scrollY;

      let activeIdx = 0;
      stageRefs.current.forEach((el, index) => {
        if (el) {
          const dockScrollPoint = deckTop + el.offsetTop - (96 + index * 24) - 40;
          if (scrollY >= dockScrollPoint) {
            activeIdx = index;
          }
        }
      });
      setTimelineStep(activeIdx);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ----------------------------------------------------
  // 8. 4-PHASE ORBITAL LOOP ENGINE
  // ----------------------------------------------------
  const [orbitalStep, setOrbitalStep] = useState(0);
  const [isOrbitalPaused, setIsOrbitalPaused] = useState(false);

  useEffect(() => {
    if (isOrbitalPaused) return;
    const timer = setInterval(() => {
      setOrbitalStep(prev => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(timer);
  }, [isOrbitalPaused]);

  const fourSteps = [
    {
      id: '01',
      title: 'Pick one focus',
      desc: 'Choose a bug, concept, or tiny project. A small target makes it easier to start.',
      tag: 'CALM TARGET',
      icon: Sliders
    },
    {
      id: '02',
      title: 'Work it through',
      desc: 'Use the editor and static review to inspect your code and understand what to improve.',
      tag: 'STATIC LINT',
      icon: Terminal
    },
    {
      id: '03',
      title: 'Keep the lesson',
      desc: 'Save a snippet or mark a lesson complete, so what you learn stays within reach.',
      tag: 'SNIPPET ARCHIVE',
      icon: BookmarkCheck
    },
    {
      id: '04',
      title: 'Come back tomorrow',
      desc: 'Check in with a quick reflection. Your progress builds with every return.',
      tag: 'DAILY RETURN',
      icon: RotateCcw
    }
  ];

  // ----------------------------------------------------
  // 9. FAQ ACCORDION STATE & DATA
  // ----------------------------------------------------
  const [openFaq, setOpenFaq] = useState(0);

  const faqItems = [
    {
      q: "What is CodeLens?",
      a: "CodeLens is a focused developer education workspace that combines an in-browser multi-language coding sandbox, static code review, daily reflection check-ins, and a reusable snippet vault into one calm practice environment."
    },
    {
      q: "How do I get started?",
      a: "Click 'Get Started for Free' to create your account or open the workspace. You can start practicing immediately in JavaScript, Python, Java, or C++ with zero local configuration required."
    },
    {
      q: "Can I save code snippets?",
      a: "Yes. CodeLens includes a dedicated Snippet Vault where you can save, tag, and search verified code patterns, utility functions, and notes directly from your editor for instant reuse."
    },
    {
      q: "How does progress tracking work?",
      a: "CodeLens tracks your consistency through daily reflection check-ins and structured learning roadmaps. You see genuine practice momentum (such as your 6/7 day weekly rhythm) without vanity leaderboards."
    },
    {
      q: "Can I continue a learning path later?",
      a: "Yes. When you follow a learning path or algorithm study track, your completed lessons and drafts remain saved so you can pick up exactly where you left off tomorrow."
    },
    {
      q: "Is CodeLens free to use?",
      a: "Yes. The core practice workspace, scratchpad, daily reflection engine, and snippet vault are completely free to use with no credit card required."
    }
  ];

  return (
    <div className="relative min-h-screen font-sans selection:bg-[#ff951f]/30 selection:text-[#ff951f] overflow-x-clip antialiased bg-[#07090e] text-[#f4f5f7]">
      
      {/* Dynamic Background Particle Canvas */}
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 pointer-events-none z-0"
      />

      {/* Subtle Aurora Ambient Lighting Shaders */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[980px] h-[520px] bg-gradient-to-b from-[#ff951f]/10 via-[#edcd8c]/6 to-transparent blur-[150px] rounded-full pointer-events-none" />
        <div className="absolute top-[40%] -left-48 w-[600px] h-[600px] bg-[#ff951f]/5 blur-[160px] rounded-full pointer-events-none" />
        <div className="absolute top-[65%] -right-48 w-[600px] h-[600px] bg-[#edcd8c]/5 blur-[180px] rounded-full pointer-events-none" />
        <div 
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(to right, #303139 1px, transparent 1px), linear-gradient(to bottom, #303139 1px, transparent 1px)`,
            backgroundSize: '48px 48px'
          }}
        />
      </div>

      {/* Spark Particles from Click Bursts */}
      {sparks.map(s => (
        <div 
          key={s.id}
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: s.x, top: s.y }}
        >
          <div className="relative w-2 h-2">
            {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
              <span
                key={deg}
                className="absolute w-1.5 h-1.5 bg-[#ff951f] rounded-full animate-ping"
                style={{
                  transform: `rotate(${deg}deg) translate(22px)`,
                  boxShadow: '0 0 10px #ff951f'
                }}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ==================================================== */}
      {/* 1. FLOATING GLASS NAVIGATION BAR */}
      {/* ==================================================== */}
      <header className="landing-nav-container">
        <div className="landing-nav-inner">
          
          {/* Logo & Brand Identity */}
          <a href="#landing" className="landing-nav-brand" aria-label="CodeLens Home">
            <Brand />
          </a>

          {/* Center Navigation Links (Desktop) */}
          <nav className="landing-nav-links" aria-label="Main Navigation">
            <a 
              href="#about" 
              onClick={(e) => { 
                e.preventDefault(); 
                document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); 
              }} 
              className="landing-nav-link"
            >
              About
            </a>
            <a 
              href="#features" 
              onClick={(e) => { 
                e.preventDefault(); 
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); 
              }} 
              className="landing-nav-link"
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              onClick={(e) => { 
                e.preventDefault(); 
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); 
              }} 
              className="landing-nav-link"
            >
              How it works
            </a>
            <a 
              href="#loop" 
              onClick={(e) => { 
                e.preventDefault(); 
                document.getElementById('loop')?.scrollIntoView({ behavior: 'smooth' }); 
              }} 
              className="landing-nav-link"
            >
              The Daily Loop
            </a>
            <a 
              href="#faq" 
              onClick={(e) => { 
                e.preventDefault(); 
                document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' }); 
              }} 
              className="landing-nav-link"
            >
              FAQ
            </a>
          </nav>

          {/* Action Button: Single unified Get Started + Mobile Hamburger */}
          <div className="landing-nav-actions">
            <button 
              onClick={() => onAuth?.('register')}
              className="landing-nav-cta"
              aria-label="Get started with CodeLens"
            >
              <span>Get started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileNavOpen(prev => !prev)}
              className="mobile-nav-toggle"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <div className="landing-mobile-drawer md:hidden">
            <nav aria-label="Mobile Navigation" className="flex flex-col gap-2.5 font-mono text-sm">
              <a 
                href="#about" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  setMobileNavOpen(false);
                  document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); 
                }}
                className="py-2 border-b border-white/5 hover:text-[#ff951f] transition text-[#c9ced8]"
              >
                About
              </a>
              <a 
                href="#features" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  setMobileNavOpen(false);
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); 
                }}
                className="py-2 border-b border-white/5 hover:text-[#ff951f] transition text-[#c9ced8]"
              >
                Features
              </a>
              <a 
                href="#how-it-works" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  setMobileNavOpen(false);
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); 
                }}
                className="py-2 border-b border-white/5 hover:text-[#ff951f] transition text-[#c9ced8]"
              >
                How it works
              </a>
              <a 
                href="#loop" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  setMobileNavOpen(false);
                  document.getElementById('loop')?.scrollIntoView({ behavior: 'smooth' }); 
                }}
                className="py-2 border-b border-white/5 hover:text-[#ff951f] transition text-[#c9ced8]"
              >
                The Daily Loop
              </a>
              <a 
                href="#faq" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  setMobileNavOpen(false);
                  document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' }); 
                }}
                className="py-2 border-b border-white/5 hover:text-[#ff951f] transition text-[#c9ced8]"
              >
                FAQ
              </a>
              <div className="pt-3">
                <button 
                  onClick={() => {
                    setMobileNavOpen(false);
                    onAuth?.('register');
                  }}
                  className="w-full py-3 rounded-xl bg-[#ff951f] hover:bg-[#ffaa40] text-[#07090e] font-mono text-xs font-bold text-center transition shadow-lg flex items-center justify-center gap-2"
                >
                  <span>Get started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ==================================================== */}
      {/* 2. HERO SECTION: SPATIAL 2-COLUMN COCKPIT */}
      {/* ==================================================== */}
      <section className="landing-hero-section px-4 sm:px-6">
        <div className="landing-hero-grid">
          
          {/* Left Hero Statement Column */}
          <div className="landing-hero-left">
            <div className="landing-hero-eyebrow">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff951f] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff951f]" />
              </span>
              <span>A CALMER WAY TO KEEP LEARNING</span>
            </div>

            <h1 className="landing-hero-heading">
              Make every coding <br />
              <span>session count.</span>
            </h1>

            <p className="landing-hero-desc">
              Practice with purpose, reflect on what you learn, and keep your progress moving forward—all in one focused workspace.
            </p>

            <div className="landing-actions">
              <button 
                onClick={() => onAuth?.('register')}
                className="landing-hero-cta"
              >
                <span>Get Started for Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button 
                onClick={() => {
                  document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="landing-hero-secondary"
              >
                <span>Explore How It Works</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Micro Guarantees */}
            <div className="landing-guarantees">
              <span className="landing-guarantee-item">
                <div className="landing-guarantee-icon">
                  <Check className="w-3 h-3" />
                </div>
                Start free
              </span>
              <span className="landing-guarantee-item">
                <div className="landing-guarantee-icon">
                  <Check className="w-3 h-3" />
                </div>
                Keep your workspace
              </span>
              <span className="landing-guarantee-item">
                <div className="landing-guarantee-icon">
                  <Check className="w-3 h-3" />
                </div>
                No card required
              </span>
            </div>
          </div>

          {/* Right Hero: THE CODELENS WORKSPACE BOX */}
          <div 
            className="relative perspective-1000 min-w-0"
            onMouseMove={handleTilt}
            onMouseLeave={handleTiltReset}
          >
            {/* Ambient Aura Glow behind the card */}
            <div className="absolute -inset-2 rounded-3xl blur-2xl pointer-events-none bg-gradient-to-tr from-[#ff951f]/20 via-[#edcd8c]/15 to-[#ff951f]/20 opacity-70 animate-pulse" />

            <div className="landing-preview-wrapper" ref={heroCardRef}>
              {/* Floating Animated Badges (Levitating) */}
              <div className="hero-float-chip hero-chip-top" aria-hidden="true">
                <Sparkles size={13} />
                <span>Real-time static review</span>
              </div>
              <div className="hero-float-chip hero-chip-bottom" aria-hidden="true">
                <Flame size={13} />
                <span>Daily momentum active</span>
              </div>

              {/* The Workspace Preview Card */}
              <div className="landing-preview" aria-label="CodeLens workspace preview">
                <div className="preview-top">
                  <div className="preview-dots"><i /><i /><i /></div>
                  <div className="preview-tabs" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeTab === 'practice.js'}
                      className={`preview-tab-btn ${activeTab === 'practice.js' ? 'active' : ''}`}
                      onClick={() => setActiveTab('practice.js')}
                    >
                      <GitBranch size={13} /> devpulse / practice.js
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeTab === 'algorithm.js'}
                      className={`preview-tab-btn ${activeTab === 'algorithm.js' ? 'active' : ''}`}
                      onClick={() => setActiveTab('algorithm.js')}
                    >
                      <Code2 size={13} /> algorithm.js
                    </button>
                  </div>
                  <button
                    type="button"
                    className="preview-run-btn"
                    onClick={triggerVerification}
                    title="Click to simulate verification check"
                    aria-label="Simulate verification"
                  >
                    <span className={`status-dot ${isVerifying ? 'is-analyzing' : ''}`} />
                    {isVerifying ? 'Verifying...' : 'Ready to build'}
                  </button>
                </div>

                <div className="preview-body">
                  <div className="preview-editor">
                    <span className="preview-label">TODAY'S PRACTICE</span>
                    {activeTab === 'practice.js' ? (
                      <pre key="tab-practice" className="fade-code-in">
                        <span className="code-purple">function</span> <span className="code-green">keepGrowing</span>() {'{'}<br />
                        {'  '}<span className="code-purple">const</span> nextStep = <span className="code-amber">'one small thing'</span>;<br /><br />
                        {'  '}<span className="code-purple">return</span> practice(nextStep);<br />
                        {'}'}<span className="preview-cursor" /><br /><br />
                        <span className="code-comment">// progress comes from showing up</span>
                      </pre>
                    ) : (
                      <pre key="tab-algorithm" className="fade-code-in">
                        <span className="code-purple">function</span> <span className="code-green">binarySearch</span>(steps, target) {'{'}<br />
                        {'  '}<span className="code-purple">let</span> left = <span className="code-amber">0</span>, right = steps.length - <span className="code-amber">1</span>;<br /><br />
                        {'  '}<span className="code-purple">return</span> search(steps, target);<br />
                        {'}'}<span className="preview-cursor" /><br /><br />
                        <span className="code-comment">// focus moves you forward</span>
                      </pre>
                    )}
                    <div className="preview-feedback">
                      <span className="icon-tile mint"><Sparkles size={17} /></span>
                      <div>
                        <strong>Nice start. Keep going.</strong>
                        <p>Make your next step clear and achievable.</p>
                      </div>
                    </div>
                  </div>

                  <div className="preview-stats">
                    <div className="preview-streak">
                      <span className="icon-tile amber"><Flame size={19} /></span>
                      <div>
                        <strong>Build your streak</strong>
                        <small>One session at a time</small>
                      </div>
                    </div>
                    <div className="preview-progress">
                      <span className="preview-label">YOUR LEARNING PATH</span>
                      <strong>JavaScript foundations</strong>
                      <div className="preview-track"><i /></div>
                      <small>Keep moving at your pace</small>
                    </div>
                    <div className="preview-snippet">
                      <Terminal size={17} />
                      <span>Saved snippets</span>
                      <ArrowUpRight size={15} />
                    </div>
                  </div>
                </div>

                <div className="preview-bottom">
                  <span><span className="status-dot" />Your progress, saved as you go</span>
                  <span>CODELENS / 01</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================== */}
      {/* 2.5 TRUST & CREDIBILITY STRIP */}
      {/* ==================================================== */}
      <section className="trust-strip-container" aria-label="Core workspace values">
        <div className="trust-strip-grid">
          <div className="trust-card">
            <div className="trust-card-icon">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="trust-card-title">Practice with focus</div>
              <div className="trust-card-desc">Targeted problems without noise or setup</div>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-card-icon">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="trust-card-title">Reflect on progress</div>
              <div className="trust-card-desc">Capture takeaways and build genuine momentum</div>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-card-icon">
              <BookmarkCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="trust-card-title">Save reusable snippets</div>
              <div className="trust-card-desc">Personal snippet vault ready when you are</div>
            </div>
          </div>

          <div className="trust-card">
            <div className="trust-card-icon">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="trust-card-title">Guided learning paths</div>
              <div className="trust-card-desc">Follow structured milestones and keep moving</div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* 3. PRODUCT INTRODUCTION: ABOUT CODELENS */}
      {/* ==================================================== */}
      <section id="about" className="relative z-10 py-16 max-w-6xl mx-auto px-4 sm:px-6">
        
        {/* Sleek gradient divider line */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#303139] to-transparent mb-14" />

        <div className="relative flex flex-col items-center text-center max-w-3xl mx-auto mb-16 space-y-4">
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[220px] bg-[#ff951f]/6 blur-[120px] rounded-full pointer-events-none -z-10" />

          {/* Refined Pill Badge with animated indicator */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest border text-[#ff951f] bg-[#ff951f]/10 border-[#ff951f]/30 shadow-[0_0_20px_rgba(255,149,31,0.12)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff951f] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff951f]" />
            </span>
            <span>CALM WORKSPACE</span>
          </div>

          {/* Main Heading with bold typography and orange-to-gold gradient */}
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight [text-wrap:balance]">
            Your coding practice,{' '}
            <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#ff951f] via-[#edcd8c] to-[#ff951f] bg-clip-text text-transparent drop-shadow-sm">
              all in one place.
            </span>
          </h2>

          {/* Supporting text with comfortable line height and optimal reading width */}
          <p className="text-base sm:text-lg font-normal max-w-xl mx-auto leading-relaxed text-[#c9ced8] [text-wrap:balance]">
            Turn small coding sessions into a sustainable practice. Keep your work organized, recognize what you learn, and return to your next step with clarity.
          </p>
        </div>

        {/* 3 Dynamic Interactive Bento Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          
          {/* Bento Card 1: Multi-language Interactive Sandbox */}
          <div className="group relative p-7 rounded-3xl transition-all duration-300 flex flex-col justify-between border bg-[#10141c] border-[#303139] hover:border-[#ff951f]/50 shadow-[0_15px_35px_rgba(0,0,0,0.7)] h-full">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-[#ff951f]/10 border border-[#ff951f]/30 flex items-center justify-center text-[#ff951f] group-hover:scale-110 transition shadow-sm">
                  <Code2 className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono text-slate-400 font-bold">01</span>
              </div>

              <h3 className="text-lg font-bold transition text-white group-hover:text-[#ff951f]">
                A calmer coding workspace
              </h3>
              <p className="text-base mt-2.5 leading-relaxed text-[#c9ced8]">
                Edit Python, Java, JavaScript, and C++. Run code through a configured isolated provider; use static checks to learn as you build.
              </p>

              {/* Language Switcher Interactive Pill */}
              <div className="mt-5 flex gap-1.5 p-1.5 rounded-xl border bg-[#07090e] border-[#303139]">
                {['javascript', 'python', 'java', 'cpp'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`flex-1 py-1 text-[10px] font-mono rounded-lg transition uppercase ${
                      selectedLang === lang
                        ? 'bg-[#ff951f] text-[#07090e] font-bold shadow-[0_0_10px_rgba(255,149,31,0.5)]'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'javascript' ? 'JS' : lang}
                  </button>
                ))}
              </div>

              {/* Dynamic Live Preview Box */}
              <div className="mt-3 p-3 rounded-xl border font-mono text-[11px] overflow-x-auto leading-relaxed bg-black/60 border-white/5 text-slate-300 min-h-[120px] flex items-center">
                <pre className="w-full">{codeSnippets[selectedLang]}</pre>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-[#ff951f]">
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff951f] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff951f]" />
                </span>
                <span>Isolated provider</span>
              </span>
              <span className="text-slate-500">Static Checks</span>
            </div>
          </div>

          {/* Bento Card 2: Interactive Habit Streak Calendar */}
          <div className="group relative p-7 rounded-3xl transition-all duration-300 flex flex-col justify-between border bg-[#10141c] border-[#303139] hover:border-[#ff951f]/50 shadow-[0_15px_35px_rgba(0,0,0,0.7)] h-full">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-[#ff951f]/10 border border-[#ff951f]/30 flex items-center justify-center text-[#ff951f] group-hover:scale-110 transition shadow-sm">
                  <Flame className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono text-slate-400 font-bold">02</span>
              </div>

              <h3 className="text-lg font-bold transition text-white group-hover:text-[#ff951f]">
                Small steps that stick
              </h3>
              <p className="text-base mt-2.5 leading-relaxed text-[#c9ced8]">
                Build a daily practice, track your momentum, and celebrate progress that is genuinely yours.
              </p>

              {/* Interactive Calendar Streak Checkers */}
              <div className="mt-5 p-4 rounded-2xl border space-y-3 bg-[#07090e] border-[#303139]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Daily Momentum Check</span>
                  <span className="text-[#ff951f] font-bold">Tap to toggle</span>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {streakDays.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => toggleDayCheck(idx, e)}
                      className={`h-10 rounded-xl font-mono text-xs font-bold transition flex items-center justify-center border ${
                        item.checked
                          ? 'bg-[#ff951f]/20 text-[#ff951f] border-[#ff951f]/50 shadow-[0_0_12px_rgba(255,149,31,0.25)]'
                          : 'bg-white/[0.02] text-slate-500 border-white/5 hover:border-white/20'
                      }`}
                    >
                      {item.checked ? <Check className="w-4 h-4 text-[#ff951f]" /> : item.day}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-[#ff951f]">
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff951f] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff951f]" />
                </span>
                <span>Gentle momentum</span>
              </span>
              <span className="text-slate-500">6 / 7 active</span>
            </div>
          </div>

          {/* Bento Card 3: Animated Circuit Cable Node Tree */}
          <div className="group relative p-7 rounded-3xl transition-all duration-300 flex flex-col justify-between border bg-[#10141c] border-[#303139] hover:border-[#ff951f]/50 shadow-[0_15px_35px_rgba(0,0,0,0.7)] h-full">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-[#ff951f]/10 border border-[#ff951f]/30 flex items-center justify-center text-[#ff951f] group-hover:scale-110 transition shadow-sm">
                  <Compass className="w-6 h-6" />
                </div>
                <span className="text-xs font-mono text-slate-400 font-bold">03</span>
              </div>

              <h3 className="text-lg font-bold transition text-white group-hover:text-[#ff951f]">
                A path that grows with you
              </h3>
              <p className="text-base mt-2.5 leading-relaxed text-[#c9ced8]">
                Follow guided learning paths, save useful snippets, and keep your next goal in sight.
              </p>

              {/* Animated SVG Circuit Pulse Tree */}
              <div className="mt-5 p-4 rounded-2xl border relative overflow-hidden bg-[#07090e] border-[#303139]">
                <svg className="w-full h-24" viewBox="0 0 280 80" fill="none">
                  <path d="M 20 40 L 90 40 L 140 20 L 210 20 L 260 40" stroke="#ff951f" strokeWidth="2" strokeOpacity="0.4" />
                  <path d="M 90 40 L 140 60 L 210 60 L 260 40" stroke="#edcd8c" strokeWidth="2" strokeOpacity="0.4" />
                  
                  <circle cx="20" cy="40" r="5" fill="#ff951f" />
                  <circle cx="90" cy="40" r="4" fill="#edcd8c" />
                  <circle cx="140" cy="20" r="4" fill="#ff951f" />
                  <circle cx="140" cy="60" r="4" fill="#edcd8c" />
                  <circle cx="210" cy="20" r="4" fill="#ff951f" />
                  <circle cx="210" cy="60" r="4" fill="#edcd8c" />
                  <circle cx="260" cy="40" r="6" fill="#ff951f" />
                  
                  <circle cx="20" cy="40" r="3" fill="#ffffff">
                    <animateMotion path="M 20 40 L 90 40 L 140 20 L 210 20 L 260 40" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="90" cy="40" r="3" fill="#edcd8c">
                    <animateMotion path="M 90 40 L 140 60 L 210 60 L 260 40" dur="3s" repeatCount="indefinite" />
                  </circle>
                </svg>

                <div className="flex items-center justify-between text-[10px] font-mono mt-2 pt-2 border-t border-white/5 text-slate-400">
                  <span className="text-[#ff951f] font-bold">Guided Path Active</span>
                  <span>Curated milestones</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-[#ff951f]">
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff951f] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff951f]" />
                </span>
                <span>Saved snippets</span>
              </span>
              <span className="text-slate-500">Reusable vault</span>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================== */}
      {/* 4. FEATURES SECTION: 4 PRIMARY CAPABILITIES */}
      {/* ==================================================== */}
      <section id="features" className="features-section-container">
        <div className="relative flex flex-col items-center text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest border text-[#ff951f] bg-[#ff951f]/10 border-[#ff951f]/30 shadow-[0_0_20px_rgba(255,149,31,0.12)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff951f] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff951f]" />
            </span>
            <span>CORE CAPABILITIES</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight [text-wrap:balance]">
            Everything you need <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#ff951f] via-[#edcd8c] to-[#ff951f] bg-clip-text text-transparent drop-shadow-sm">
              to keep moving.
            </span>
          </h2>
          <p className="text-base sm:text-lg font-normal max-w-xl mx-auto leading-relaxed text-[#c9ced8] [text-wrap:balance]">
            Designed from the ground up for deliberate developer practice, calm reflection, and continuous momentum.
          </p>
        </div>

        <div className="features-grid">
          {/* Feature 1 */}
          <div className="feature-box">
            <div className="flex items-center justify-between mb-4">
              <div className="feature-box-icon">
                <Code2 className="w-5 h-5" />
              </div>
              <span className="feature-box-tag">EXECUTION</span>
            </div>
            <h3 className="feature-box-heading">Focused Coding Sessions</h3>
            <p className="feature-box-desc">
              Help you begin with a manageable task, work through a problem in an isolated sandbox, and receive immediate static feedback.
            </p>
            <ul className="feature-box-list">
              <li className="feature-box-list-item">
                <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0 mt-0.5" />
                <span>Multi-language workspace (JS, Python, Java, C++)</span>
              </li>
              <li className="feature-box-list-item">
                <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0 mt-0.5" />
                <span>In-browser static linting & instant feedback</span>
              </li>
              <li className="feature-box-list-item">
                <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0 mt-0.5" />
                <span>Isolated sandbox execution when configured</span>
              </li>
            </ul>
          </div>

          {/* Feature 2 */}
          <div className="feature-box">
            <div className="flex items-center justify-between mb-4">
              <div className="feature-box-icon">
                <Flame className="w-5 h-5" />
              </div>
              <span className="feature-box-tag">CONSISTENCY</span>
            </div>
            <h3 className="feature-box-heading">Learning Reflection</h3>
            <p className="feature-box-desc">
              Capture what you learned at the end of each session, record insights, and build genuine practice streaks that stay with you.
            </p>
            <ul className="feature-box-list">
              <li className="feature-box-list-item">
                <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0 mt-0.5" />
                <span>Post-session takeaway check-in prompts</span>
              </li>
              <li className="feature-box-list-item">
                <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0 mt-0.5" />
                <span>Daily momentum calendar tracking</span>
              </li>
              <li className="feature-box-list-item">
                <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0 mt-0.5" />
                <span>Recognize progress on your own terms</span>
              </li>
            </ul>
          </div>

          {/* Feature 3 */}
          <div className="feature-box">
            <div className="flex items-center justify-between mb-4">
              <div className="feature-box-icon">
                <Compass className="w-5 h-5" />
              </div>
              <span className="feature-box-tag">CURRICULUM</span>
            </div>
            <h3 className="feature-box-heading">Guided Learning Paths</h3>
            <p className="feature-box-desc">
              Follow curated lessons, track your completion, achieve milestones, and pick up right where you stopped without getting overwhelmed.
            </p>
            <ul className="feature-box-list">
              <li className="feature-box-list-item">
                <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0 mt-0.5" />
                <span>Structured roadmap with bite-sized lessons</span>
              </li>
              <li className="feature-box-list-item">
                <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0 mt-0.5" />
                <span>Milestone checks and progress indicators</span>
              </li>
              <li className="feature-box-list-item">
                <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0 mt-0.5" />
                <span>Seamless session state preservation</span>
              </li>
            </ul>
          </div>

          {/* Feature 4 */}
          <div className="feature-box">
            <div className="flex items-center justify-between mb-4">
              <div className="feature-box-icon">
                <BookmarkCheck className="w-5 h-5" />
              </div>
              <span className="feature-box-tag">KNOWLEDGE</span>
            </div>
            <h3 className="feature-box-heading">Personal Snippet Vault</h3>
            <p className="feature-box-desc">
              Save, organize, search, and instantly reuse verified code patterns, algorithms, and session notes from your workspace.
            </p>
            <ul className="feature-box-list">
              <li className="feature-box-list-item">
                <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0 mt-0.5" />
                <span>Categorized by language, topic, and tags</span>
              </li>
              <li className="feature-box-list-item">
                <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0 mt-0.5" />
                <span>Instant editor search and one-click insertion</span>
              </li>
              <li className="feature-box-list-item">
                <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0 mt-0.5" />
                <span>Private, secure, and safely stored</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* 5. SCROLL-STORY PROCESS SECTION: STACKED CARDS */}
      {/* ==================================================== */}
      <section id="how-it-works" className="process-section max-w-6xl mx-auto px-4 sm:px-6">
        <div id="rhythm" />
        <div className="process-stacked-grid">
          
          {/* Left Sticky Intro & Timeline Aside Column */}
          <div className="process-aside-column">
            <div className="process-intro-aside">
              <span className="text-xs font-mono uppercase tracking-widest px-3 py-1 rounded-full border text-[#ff951f] bg-[#ff951f]/10 border-[#ff951f]/25">
                A LITTLE PROGRESS, OFTEN
              </span>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight mt-4 text-white [text-wrap:balance]">
                A rhythm you can <br />
                <span className="bg-gradient-to-r from-[#ff951f] via-[#edcd8c] to-[#ff951f] bg-clip-text text-transparent">
                  actually keep.
                </span>
              </h2>

              <p className="text-base sm:text-lg leading-relaxed mt-4 max-w-md text-[#c9ced8] [text-wrap:balance]">
                Learning doesn’t need a perfect plan. Just a place to return to, and a next step that feels doable.
              </p>

              {/* Connected Process Indicator / Timeline Navigation */}
              <div className="process-timeline" role="tablist" aria-label="Process stages">
                {[
                  { idx: '01', label: 'Show Up', desc: 'Calm editor & live static pass' },
                  { idx: '02', label: 'Build a Habit', desc: 'Reflection engine & streak' },
                  { idx: '03', label: 'Find Your Next Step', desc: 'Guided paths & milestones' },
                  { idx: '04', label: 'Make It a Keeper', desc: 'Personal snippet vault' }
                ].map((step, sIdx) => {
                  const isActive = timelineStep === sIdx;
                  return (
                    <button
                      key={step.idx}
                      onClick={() => scrollToCard(sIdx)}
                      className={`process-timeline-node ${isActive ? 'active-node' : ''}`}
                      role="tab"
                      aria-selected={isActive}
                    >
                      <span className="process-timeline-idx">{step.idx}</span>
                      <div className="flex flex-col text-left">
                        <span className={`font-bold text-sm leading-snug transition-colors duration-200 ${isActive ? 'text-[#ff951f]' : 'text-[#f4f5f7]'}`}>
                          {step.label}
                        </span>
                        <span className={`text-xs font-normal transition-colors duration-200 ${isActive ? 'text-[#edcd8c]' : 'text-slate-400'}`}>
                          {step.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-6 flex items-center gap-2.5 text-xs font-mono text-[#ff951f]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff951f] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff951f]" />
                </span>
                <span>4-stage continuous sequence</span>
              </div>
            </div>
          </div>

          {/* Right Column: Stacked Cards Deck */}
          <div ref={deckRef} className="process-card-deck">
            
            {/* STAGE 01 / SHOW UP */}
            <div 
              ref={el => stageRefs.current[0] = el}
              data-card-index="0"
              className={`process-stacked-card ${timelineStep === 0 ? 'card-active' : ''}`}
              style={{ '--card-step': 0 }}
            >
              <div className="flex items-center justify-between text-xs font-mono text-[#ff951f] mb-3">
                <span className="font-bold">01 / SHOW UP</span>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider bg-[#ff951f]/10 border border-[#ff951f]/30 text-[#ff951f]">
                  CALM EDIT
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Start with the code in front of you.</h3>
              <p className="text-base mt-2.5 leading-relaxed text-[#c9ced8]">
                Bring a small problem into the workspace. Get clear, practical feedback without losing your flow.
              </p>

              {/* Inset Developer Demonstration Panel: Scratchpad */}
              <div className="mt-6 p-5 rounded-2xl border space-y-3.5 bg-[#07090e] border-[#303139]">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#ff951f]" />
                    <span className="font-semibold text-slate-300">Interactive Scratchpad</span>
                  </div>
                  <span className="text-[#ff951f] font-mono text-xs px-2 py-0.5 rounded bg-[#ff951f]/10 border border-[#ff951f]/20">
                    {lintStatus}
                  </span>
                </div>
                
                <div className="relative">
                  <input 
                    type="text"
                    value={scratchpadCode}
                    onChange={(e) => {
                      setScratchpadCode(e.target.value);
                      setLintStatus("Linting live...");
                      setTimeout(() => setLintStatus("Optimal static pass"), 600);
                    }}
                    className="w-full border rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none bg-black/60 border-[#ff951f]/30 text-amber-200 focus:border-[#ff951f] focus:ring-1 focus:ring-[#ff951f]/50 transition"
                    aria-label="Code scratchpad input"
                  />
                </div>

                <div className="space-y-2 pt-2.5 border-t border-white/5 text-xs font-mono text-slate-300">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0" />
                    <span>Python, Java, JavaScript, and C++ editor</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0" />
                    <span>Static checks and real provider execution when configured</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0" />
                    <span>Your drafts stay safely local to you</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STAGE 02 / BUILD A HABIT */}
            <div 
              ref={el => stageRefs.current[1] = el}
              data-card-index="1"
              className={`process-stacked-card ${timelineStep === 1 ? 'card-active' : ''}`}
              style={{ '--card-step': 1 }}
            >
              <div className="flex items-center justify-between text-xs font-mono text-[#ff951f] mb-3">
                <span className="font-bold">02 / BUILD A HABIT</span>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider bg-[#ff951f]/10 border border-[#ff951f]/30 text-[#ff951f]">
                  REFLECTION ENGINE
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Make consistency feel lighter.</h3>
              <p className="text-base mt-2.5 leading-relaxed text-[#c9ced8]">
                Check in, name what you learned, and watch small sessions add up over time—without chasing someone else’s pace.
              </p>

              {/* Inset Developer Demonstration Panel: Habit Reflection */}
              <div className="mt-6 p-5 rounded-2xl border space-y-4 bg-[#07090e] border-[#303139]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Flame className="w-4 h-4 text-[#ff951f]" />
                    <span>Showed up for yourself.</span>
                  </div>
                  <span className="text-[#ff951f] font-mono font-bold px-2 py-0.5 rounded bg-[#ff951f]/10 border border-[#ff951f]/20">
                    This week · 6/7 days
                  </span>
                </div>

                {/* Streak Calendar Mini-strip */}
                <div className="p-3 rounded-xl border bg-black/40 border-white/5 flex items-center justify-between">
                  {streakDays.map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1.5">
                      <span className="text-[10px] font-mono text-slate-500">{item.day}</span>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition ${
                        item.checked ? 'bg-[#ff951f] text-black shadow-[0_0_10px_rgba(255,149,31,0.4)]' : 'bg-[#10141c] border border-white/10 text-slate-600'
                      }`}>
                        {item.checked ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '·'}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0" /> 
                    <span>A quick daily reflection</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0" /> 
                    <span>Streaks from your check-ins</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0" /> 
                    <span>Progress you can see</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STAGE 03 / FIND YOUR NEXT STEP */}
            <div 
              ref={el => stageRefs.current[2] = el}
              data-card-index="2"
              className={`process-stacked-card ${timelineStep === 2 ? 'card-active' : ''}`}
              style={{ '--card-step': 2 }}
            >
              <div className="flex items-center justify-between text-xs font-mono text-[#ff951f] mb-3">
                <span className="font-bold">03 / FIND YOUR NEXT STEP</span>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider bg-[#ff951f]/10 border border-[#ff951f]/30 text-[#ff951f]">
                  LEARNING PATH
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Keep learning pointed somewhere.</h3>
              <p className="text-base mt-2.5 leading-relaxed text-[#c9ced8]">
                Follow a learning path, save the snippets you’ll reuse, and pick up right where you left off.
              </p>

              {/* Inset Developer Demonstration Panel: Learning Path */}
              <div className="mt-6 p-5 rounded-2xl border space-y-3.5 bg-[#07090e] border-[#303139]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Compass className="w-4 h-4 text-[#ff951f]" />
                    <span>JavaScript Foundations</span>
                  </div>
                  <span className="text-[11px] font-mono text-[#ff951f] px-2 py-0.5 rounded bg-[#ff951f]/10 border border-[#ff951f]/20">
                    4 of 8 lessons completed
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-[#ff951f] to-[#edcd8c] h-full rounded-full" style={{ width: '50%' }} />
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2.5 rounded-xl border flex items-center justify-between bg-white/[0.02] border-white/5 text-slate-300">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#ff951f]" /> Values & variables
                    </span>
                    <span className="text-[10px] text-slate-400">Completed</span>
                  </div>

                  <div className="p-2.5 rounded-xl border flex items-center justify-between bg-[#ff951f]/10 border-[#ff951f]/30 text-amber-200">
                    <span className="flex items-center gap-2">
                      <Circle className="w-3.5 h-3.5 text-[#ff951f] fill-[#ff951f]/20" /> Functions in practice
                    </span>
                    <span className="text-[10px] font-bold text-[#ff951f]">Up next →</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-2 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0" /> 
                    <span>Track lesson completion</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0" /> 
                    <span>Save useful code snippets</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0" /> 
                    <span>Pick up where you left off</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STAGE 04 / MAKE IT A KEEPER */}
            <div 
              ref={el => stageRefs.current[3] = el}
              data-card-index="3"
              className={`process-stacked-card ${timelineStep === 3 ? 'card-active' : ''}`}
              style={{ '--card-step': 3 }}
            >
              <div className="flex items-center justify-between text-xs font-mono text-[#ff951f] mb-3">
                <span className="font-bold">04 / MAKE IT A KEEPER</span>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-wider bg-[#ff951f]/10 border border-[#ff951f]/30 text-[#ff951f]">
                  SNIPPET VAULT
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Capture what works in your personal vault.</h3>
              <p className="text-base mt-2.5 leading-relaxed text-[#c9ced8]">
                Never lose a pattern you solved. Keep verified snippets, notes, and lessons ready to plug into tomorrow's workspace.
              </p>

              {/* Inset Developer Demonstration Panel: Snippet Vault */}
              <div className="mt-6 p-5 rounded-2xl border space-y-3.5 bg-[#07090e] border-[#303139]">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <BookmarkCheck className="w-4 h-4 text-[#ff951f]" />
                    <span>Quick Snippet Vault</span>
                  </div>
                  <span className="text-[#ff951f] font-mono text-xs px-2 py-0.5 rounded bg-[#ff951f]/10 border border-[#ff951f]/20">
                    12 snippets saved
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border font-mono text-xs leading-relaxed bg-black/60 border-white/5 text-amber-200">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5 border-b border-white/5 pb-1">
                    <span>memoize.js</span>
                    <span className="text-[#ff951f]">JavaScript</span>
                  </div>
                  <code>const memoize = (fn) =&gt; &#123; const cache = new Map(); ... &#125;;</code>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-2 text-xs font-mono text-slate-400">
                  <div className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0" /> 
                    <span>Tagged by language and topic</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0" /> 
                    <span>Instant search from your editor</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Check className="w-3.5 h-3.5 text-[#ff951f] shrink-0" /> 
                    <span>Encrypted and safely local</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ==================================================== */}
      {/* 5. 4-PHASE ORBITAL LOOP ENGINE */}
      {/* ==================================================== */}
      <section 
        id="loop" 
        className="four-phase-container max-w-6xl mx-auto px-4 sm:px-6"
        onMouseEnter={() => setIsOrbitalPaused(true)}
        onMouseLeave={() => setIsOrbitalPaused(false)}
      >
        <div className="relative flex flex-col items-center text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest border text-[#ff951f] bg-[#ff951f]/10 border-[#ff951f]/30 shadow-[0_0_20px_rgba(255,149,31,0.12)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff951f] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff951f]" />
            </span>
            <span>CODE. TRACE. UNDERSTAND.</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight [text-wrap:balance]">
            Turn every coding session <br className="hidden sm:inline" />
            into{' '}
            <span className="bg-gradient-to-r from-[#ff951f] via-[#edcd8c] to-[#ff951f] bg-clip-text text-transparent drop-shadow-sm">
              real progress.
            </span>
          </h2>
          <p className="text-base sm:text-lg font-normal max-w-xl mx-auto leading-relaxed text-[#c9ced8] [text-wrap:balance]">
            Write code, trace its execution, and understand your algorithms—one step at a time.
          </p>
        </div>

        {/* 4 Capability Cards Rebuilt to Deliberate Proportions */}
        <div className="four-phase-grid">
          {fourSteps.map((step, idx) => {
            const Icon = step.icon;
            const isCurrent = orbitalStep === idx;
            return (
              <div
                key={step.id}
                onClick={() => setOrbitalStep(idx)}
                className={`four-phase-card-item ${isCurrent ? 'is-selected-phase' : ''}`}
                tabIndex={0}
                role="button"
                aria-pressed={isCurrent}
                onKeyDown={(e) => { 
                  if (e.key === 'Enter' || e.key === ' ') { 
                    e.preventDefault(); 
                    setOrbitalStep(idx); 
                  } 
                }}
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-6 text-slate-400">
                    <span className={`font-bold text-base ${isCurrent ? 'text-[#ff951f]' : 'text-slate-400'}`}>
                      {step.id}
                    </span>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                      isCurrent 
                        ? 'bg-[#ff951f]/20 text-[#ff951f] border border-[#ff951f]/40' 
                        : 'bg-white/[0.04] text-slate-400 border border-white/5'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <span className="text-[11px] font-mono tracking-widest uppercase mb-2 block text-[#ff951f] font-semibold">
                    {step.tag}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold mb-2 text-white">
                    {step.title}
                  </h3>
                  <p className="text-base sm:text-lg leading-relaxed text-[#c9ced8]">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-[#303139] flex items-center justify-between text-xs font-mono">
                  <span className={isCurrent ? 'text-[#ff951f] font-bold' : 'text-slate-500'}>
                    Phase {idx + 1}
                  </span>
                  <span className={`transition ${isCurrent ? 'text-[#ff951f] font-bold' : 'text-slate-500'}`}>
                    {isCurrent ? 'Active phase' : 'Ready'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================================================== */}
      {/* 6. DESIGNED FOR CONSISTENT PRACTICE (BENEFITS) */}
      {/* ==================================================== */}
      <section id="benefits" className="benefits-section-container">
        <div className="relative flex flex-col items-center text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest border text-[#ff951f] bg-[#ff951f]/10 border-[#ff951f]/30 shadow-[0_0_20px_rgba(255,149,31,0.12)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff951f] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff951f]" />
            </span>
            <span>DESIGNED FOR CONSISTENT PRACTICE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight [text-wrap:balance]">
            Built for clarity, <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#ff951f] via-[#edcd8c] to-[#ff951f] bg-clip-text text-transparent drop-shadow-sm">
              not hype.
            </span>
          </h2>
          <p className="text-base sm:text-lg font-normal max-w-xl mx-auto leading-relaxed text-[#c9ced8] [text-wrap:balance]">
            CodeLens is engineered to respect your focus and eliminate friction at every step of your learning routine.
          </p>
        </div>

        <div className="benefits-grid">
          <div className="benefit-card">
            <span className="benefit-card-idx">01</span>
            <div className="text-[#ff951f] mb-3">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="benefit-card-title">Zero Setup Overhead</h3>
            <p className="benefit-card-desc">
              Open a browser tab and immediately begin coding in JavaScript, Python, Java, or C++. No Docker images, complex toolchain installs, or configuration rabbit holes.
            </p>
          </div>

          <div className="benefit-card">
            <span className="benefit-card-idx">02</span>
            <div className="text-[#ff951f] mb-3">
              <Flame className="w-6 h-6" />
            </div>
            <h3 className="benefit-card-title">Calm, Self-Paced Progression</h3>
            <p className="benefit-card-desc">
              No public leaderboards, spam notifications, or gamified stress. Just clear feedback, meaningful reflections, and steady personal growth on your own timeline.
            </p>
          </div>

          <div className="benefit-card">
            <span className="benefit-card-idx">03</span>
            <div className="text-[#ff951f] mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="benefit-card-title">Local Ownership & Privacy</h3>
            <p className="benefit-card-desc">
              Your code drafts, reflections, and saved snippets remain under your control. Revisit your personal knowledge vault whenever you need it, distraction-free.
            </p>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* 7. FREQUENTLY ASKED QUESTIONS ACCORDION */}
      {/* ==================================================== */}
      <section id="faq" className="faq-section-container">
        <div className="relative flex flex-col items-center text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest border text-[#ff951f] bg-[#ff951f]/10 border-[#ff951f]/30 shadow-[0_0_20px_rgba(255,149,31,0.12)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff951f] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff951f]" />
            </span>
            <span>FREQUENTLY ASKED QUESTIONS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight [text-wrap:balance]">
            Common questions <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-[#ff951f] via-[#edcd8c] to-[#ff951f] bg-clip-text text-transparent drop-shadow-sm">
              about CodeLens.
            </span>
          </h2>
          <p className="text-base sm:text-lg font-normal max-w-xl mx-auto leading-relaxed text-[#c9ced8] [text-wrap:balance]">
            Everything you need to know about the workspace, learning paths, and progress tracking.
          </p>
        </div>

        <div className="faq-accordion" role="region" aria-label="Frequently Asked Questions">
          {faqItems.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className={`faq-item ${isOpen ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className="faq-trigger"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${idx}`}
                  id={`faq-question-${idx}`}
                >
                  <div className="faq-trigger-left">
                    <span className="faq-item-number">0{idx + 1}</span>
                    <span className="faq-item-question">{item.q}</span>
                  </div>
                  <div className="faq-trigger-icon-wrap">
                    <ChevronDown className={`faq-trigger-icon ${isOpen ? 'open' : ''}`} />
                  </div>
                </button>
                <div
                  id={`faq-answer-${idx}`}
                  role="region"
                  aria-labelledby={`faq-question-${idx}`}
                  className={`faq-content ${isOpen ? 'open' : ''}`}
                >
                  <div className="faq-answer-inner">
                    <p>{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================================================== */}
      {/* 8. CENTERED CALL TO ACTION PANEL */}
      {/* ==================================================== */}
      <section id="cta" className="relative z-10 py-20 sm:py-24 max-w-3xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center">
        
        {/* Subtle orange ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[280px] bg-[#ff951f]/10 blur-[140px] rounded-full pointer-events-none -z-10" />

        {/* Enhanced orange-accented badge above the heading */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-mono uppercase tracking-widest mb-6 border bg-[#ff951f]/10 border-[#ff951f]/30 text-[#ff951f] shadow-[0_0_20px_rgba(255,149,31,0.12)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff951f] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff951f]" />
          </span>
          <span className="font-semibold tracking-wider">BUILD YOUR CODING HABIT</span>
        </div>

        {/* Calibrated heading that fits gracefully */}
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight max-w-2xl mx-auto leading-tight text-white [text-wrap:balance]">
          Make a little room{' '}
          <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-[#ff951f] via-[#edcd8c] to-[#ff951f] bg-clip-text text-transparent drop-shadow-sm">
            to begin.
          </span>
        </h2>

        {/* Generous, comfortable supporting caption */}
        <p className="mt-4 text-base sm:text-lg font-normal max-w-xl mx-auto leading-relaxed text-[#c9ced8] [text-wrap:balance]">
          Your next coding session does not have to be perfect. Start small, keep learning, and build a practice you can return to.
        </p>

        <div className="mt-8 flex items-center justify-center w-full">
          <button 
            onClick={() => onAuth?.('register')}
            className="cta-primary-btn"
            aria-label="Get started for free with CodeLens"
          >
            <span>Get started for free</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

      </section>

      {/* ==================================================== */}
      {/* 9. MULTI-COLUMN COMPREHENSIVE FOOTER */}
      {/* ==================================================== */}
      <footer className="landing-complete-footer">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          
          <div className="landing-footer-columns">
            {/* Column 1: Identity & Purpose */}
            <div className="space-y-4">
              <a href="#landing" className="landing-nav-brand" aria-label="CodeLens Home">
                <Brand />
              </a>
              <p className="text-sm leading-relaxed max-w-sm font-normal text-[#c9ced8]">
                Developer education platform for deliberate coding practice, static code analysis, and continuous learning momentum. Built for learners and engineers.
              </p>
            </div>

            {/* Column 2: Platform Navigation */}
            <div>
              <div className="footer-col-title">Platform</div>
              <ul className="footer-col-links">
                <li>
                  <a 
                    href="#about"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    About CodeLens
                  </a>
                </li>
                <li>
                  <a 
                    href="#features"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Core Features
                  </a>
                </li>
                <li>
                  <a 
                    href="#how-it-works"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    How it works
                  </a>
                </li>
                <li>
                  <a 
                    href="#loop"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('loop')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    The Daily Loop
                  </a>
                </li>
                <li>
                  <a 
                    href="#faq"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3: Methodology */}
            <div>
              <div className="footer-col-title">Methodology</div>
              <ul className="footer-col-links">
                <li>
                  <button onClick={() => onAuth?.('register')}>
                    Isolated Sandbox
                  </button>
                </li>
                <li>
                  <button onClick={() => onAuth?.('register')}>
                    Static Code Review
                  </button>
                </li>
                <li>
                  <button onClick={() => onAuth?.('register')}>
                    Saved Snippet Vault
                  </button>
                </li>
                <li>
                  <button onClick={() => onAuth?.('register')}>
                    Daily Momentum Tracker
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Access */}
            <div>
              <div className="footer-col-title">Access</div>
              <ul className="footer-col-links">
                <li>
                  <button onClick={() => onAuth?.('register')} className="text-[#ff951f] font-semibold">
                    Get started for free →
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Subbar: Copyright and Runtime Indicators */}
          <div className="landing-footer-subbar">
            <div>
              © {new Date().getFullYear()} CodeLens — Learn, Debug, and Ship. All rights reserved.
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff951f] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff951f]" />
              </span>
              <span>Workspace engine active</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
