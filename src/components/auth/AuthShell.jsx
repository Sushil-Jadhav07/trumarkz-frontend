import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, Layers, Lock, User } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

// ── Left panel ────────────────────────────────────────────────────────────────
// The artwork is a portrait illustration with an empty "verified" pill. It is drawn with the same
// cover-fit maths as object-cover so the pill's label stays on the pill at any panel size.
export const ART = { w: 1073, h: 1466, labelX: 470, labelY: 1003, labelSize: 29 };

const HERO_FEATURES = [
  { icon: User, label: 'Identity verification' },
  { icon: Layers, label: 'Digital credentials' },
  { icon: Lock, label: 'Secure records' },
];

export const HeroPanel = () => {
  const ref = useRef(null);
  const [box, setBox] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const scale = box ? Math.max(box.w / ART.w, box.h / ART.h) : 0;
  const offX = box ? (box.w - ART.w * scale) / 2 : 0;
  const offY = box ? (box.h - ART.h * scale) / 2 : 0;

  return (
    <div ref={ref} className="relative hidden w-[44%] shrink-0 overflow-hidden rounded-[28px] bg-[#0646c8] lg:block">
      <img src="/assets/Blue identity verification interface.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-center" />
      {box && (
        <span
          className="absolute whitespace-nowrap font-inter font-medium text-[#10294d]"
          style={{ left: offX + ART.labelX * scale, top: offY + ART.labelY * scale, fontSize: ART.labelSize * scale, transform: 'translateY(-50%)' }}
        >Identity verified</span>
      )}

      <div className="relative z-10 flex h-full flex-col px-[clamp(32px,12%,92px)] pb-[clamp(32px,9vh,84px)] pt-[clamp(28px,8vh,72px)] text-white">
        <span className="inline-flex w-fit items-center rounded-full border border-[#35b8ff]/80 px-[18px] py-1.5 font-inter text-[11px] font-medium uppercase tracking-[0.18em] text-white">
          Verify · Trust · Transform
        </span>
        <h1 className="mt-7 font-inter text-[clamp(24px,2.5vw,38px)] font-medium leading-[1.14] tracking-[-0.01em]">
          Trust starts with<br />verified information.
        </h1>
        <p className="mt-4 font-inter text-[clamp(13px,1.15vw,17px)] font-light leading-[1.5] text-white/85">
          Identity checks. Digital credentials.<br />One workspace.
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 -mx-[clamp(0px,4%,34px)]">
          {HERO_FEATURES.map(({ icon: Icon, label }, i) => (
            <div key={label} className={`flex items-center gap-2.5 font-inter text-xs text-white xl:text-[13px] ${i > 0 ? 'border-l border-white/30 pl-3' : ''}`}>
              <Icon size={18} strokeWidth={1.5} className="shrink-0" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Input with a leading icon and an optional trailing control (the password eye).
const FIELD_CLS = 'h-11 w-full rounded-lg border bg-[#f3f6fb] pl-10 text-[13px] text-brand-dark font-inter placeholder:text-[#7b879d] transition-colors focus:border-brand-blue focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20';
export const AuthField = ({ label, icon: Icon, error, trailing, action, hint, id, ...props }) => (
  <div>
    {(label || action) && (
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-brand-dark font-inter">{label}</label>
        {action}
      </div>
    )}
    <div className="relative">
      <Icon size={16} strokeWidth={1.5} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5b6a85]" />
      <input id={id} aria-invalid={Boolean(error)} {...props} className={`${FIELD_CLS} ${trailing ? 'pr-11' : 'pr-4'} ${error ? 'border-red-400' : 'border-[#e1e7f0]'}`} />
      {trailing}
    </div>
    {error ? <p className="mt-1 text-xs text-red-500 font-inter">{error}</p> : hint && <p className="mt-1 text-[11px] text-[#7b879d] font-inter">{hint}</p>}
  </div>
);



// Logo centred at the top, with an optional back link at the right edge.
export const AuthTopBar = ({ backLabel, onBack }) => (
  <div className="relative flex items-center justify-center py-2">
    <Logo size="md" showTagline />
    {onBack && (
      <button
        type="button"
        onClick={onBack}
        className="absolute right-0 top-1/2 inline-flex -translate-y-1/2 items-center gap-2 text-[13px] text-[#3d4b66] font-inter transition-colors hover:text-brand-blue"
      >
        <ArrowLeft size={16} strokeWidth={1.75} /> {backLabel}
      </button>
    )}
  </div>
);

// Numbered progress for the multi-step sign-up pages (Registration -> OTP -> Onboarding).
export const AuthStepper = ({ steps, current, showProgress = true }) => (
  <div className="mx-auto w-full max-w-[560px]">
    <ol className="flex items-start">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-start last:flex-none" aria-current={active ? 'step' : undefined}>
            <div className="flex w-[110px] flex-col items-center gap-1.5">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-[13px] font-semibold font-inter ${
                active || done ? 'border-brand-blue bg-brand-blue text-white' : 'border-[#c9d4e6] bg-white text-[#5b6a85]'
              }`}>{done ? <Check size={15} strokeWidth={2.5} /> : i + 1}</span>
              <span className={`text-xs font-inter ${active ? 'font-medium text-brand-blue' : 'text-[#5b6a85]'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && <span aria-hidden="true" className={`mt-4 h-px flex-1 ${done ? 'bg-brand-blue' : 'bg-[#d5deec]'}`} />}
          </li>
        );
      })}
    </ol>
    {showProgress && <p className="mt-1 text-center text-[11px] text-[#5b6a85] font-inter">{Math.min(100, Math.round((current / (steps.length - 1)) * 100))}% complete</p>}
  </div>
);
